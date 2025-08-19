# 1-Minute Activity Periods Implementation

## Overview
This document outlines the changes made to support 1-minute activity periods instead of 10-minute periods in the time tracker application, ensuring both local SQLite and cloud PostgreSQL databases are fully synchronized.

## Changes Made

### 1. Local Database (SQLite)

#### Activity Tracker Service (`activityTracker.ts`)
- Modified `startPeriodTimer()` to use 60-second intervals
- Added logic to wait until next minute boundary before starting timer
- Timer now starts at exact minute marks (xx:00:00)

#### Local Database Schema (`localDatabase.ts`)
- Added `screenshot_periods` table to link screenshots with multiple activity periods
- Added columns to screenshots table:
  - `localCaptureTime`: Store local capture timestamp
  - `aggregatedScore`: Store aggregated activity score from 10 periods
  - `sessionId`: Direct reference to session
- Added `getRecentActivityPeriods()` method to fetch last N periods

#### Database Service (`databaseService.ts`)
- Added `getAggregatedActivityScore()` method to calculate average score from 10 periods
- Updated `getCurrentActivity()` to use 1-minute periods
- Enhanced `saveScreenshot()` to accept new fields

#### Screenshot Service (`screenshotService.ts`)
- Updated to aggregate 10 activity periods for each screenshot
- Stores local capture timestamp for accurate ordering
- Links screenshots to related activity periods

### 2. Cloud Database (PostgreSQL)

#### API Controllers (`screenshots.controller.ts`)
- Updated upload endpoint to accept:
  - `aggregatedScore`: Aggregated activity score
  - `relatedPeriodIds`: Array of related activity period IDs
  - `localCaptureTime`: Local capture timestamp

#### API Services (`screenshots.service.ts`)
- Enhanced create method to store metadata in JSONB field
- Preserves all timing and relationship data

#### Entity Updates (`screenshot.entity.ts`)
- Added `metadata` JSONB column to store:
  - Aggregated scores
  - Local capture times
  - Related period IDs

#### Database Migration (`add_screenshot_metadata.sql`)
```sql
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS metadata JSONB;
CREATE TABLE IF NOT EXISTS screenshot_periods (
    id UUID PRIMARY KEY,
    screenshot_id UUID REFERENCES screenshots(id),
    activity_period_id UUID REFERENCES activity_periods(id),
    period_order INTEGER,
    UNIQUE(screenshot_id, activity_period_id)
);
```

### 3. Sync Service Updates

#### API Sync Service (`apiSyncService.ts`)
- Updated screenshot upload to include:
  - Aggregated score from 10 periods
  - Related period IDs array
  - Local capture timestamp
- Ensures all metadata is preserved during sync

### 4. UI Updates

#### Screenshot Grid Component (`ScreenshotGrid.tsx`)
- Added per-minute activity breakdown in modal
- Displays individual scores for each 1-minute period
- Shows average score calculation
- Uses local capture time for proper ordering

## Data Flow

1. **Activity Tracking**: Every minute at xx:00:00, a new activity period is created
2. **Score Calculation**: Activity scores calculated based on keyboard/mouse metrics
3. **Screenshot Capture**: Every 10 minutes, screenshot captures and aggregates last 10 periods
4. **Data Sync**: Local SQLite syncs to cloud PostgreSQL preserving all relationships
5. **Display**: UI shows aggregated scores with per-minute breakdown available

## Performance Considerations

### Data Volume Impact
- **Before**: ~144 activity periods/day/user (10-minute periods)
- **After**: ~1,440 activity periods/day/user (1-minute periods)
- **10x increase** in activity period records

### Optimization Strategies
1. **Bulk Operations**: Use bulk insert endpoints for syncing
2. **Indexed Queries**: Added indexes on frequently queried columns
3. **JSONB Storage**: Metadata stored efficiently in PostgreSQL JSONB
4. **Aggregation**: Screenshots aggregate 10 periods to reduce redundancy

## Migration Steps

### For Development
1. Pull latest code changes
2. Restart desktop app to recreate local SQLite schema
3. API will use updated TypeORM entities

### For Production
1. Run SQL migration on PostgreSQL database
2. Deploy updated API with new entity definitions
3. Deploy updated desktop app
4. Monitor performance metrics

## Testing Checklist

- [x] Activity periods created every minute at exact boundaries
- [x] Screenshots aggregate 10 periods correctly
- [x] Per-minute breakdown displays in modal
- [x] Local capture time used for ordering
- [x] Sync service uploads all metadata
- [x] Cloud database stores metadata correctly
- [x] API endpoints handle new fields

## Rollback Plan

If issues arise:
1. Revert activity period timer to 10 minutes
2. Screenshots will continue working (aggregating fewer periods)
3. Metadata column can remain (nullable, won't affect existing code)
4. No data loss as all changes are additive

## Future Enhancements

1. **Database Partitioning**: Implement monthly partitions for activity_periods table
2. **Archival Strategy**: Move old activity data to archive tables
3. **Compression**: Compress activity period data older than 30 days
4. **Real-time Sync**: Implement WebSocket for real-time activity updates
5. **Analytics**: Add aggregation views for faster reporting