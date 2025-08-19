# Screenshot to Activity Periods: One-to-Many Relationship

## Architecture Overview

The time tracker implements a **one-to-many relationship** between screenshots and activity periods:

```
1 Screenshot ──owns──> 10 Activity Periods
```

This is **NOT** a many-to-many relationship. Each activity period belongs to at most one screenshot.

## Conceptual Model

```
┌─────────────────┐
│   Screenshot    │
│   (Every 10min) │
└────────┬────────┘
         │ owns
         ├──────────────────────┐
         ▼                      ▼
┌──────────────┐       ┌──────────────┐
│Activity Period│  ...  │Activity Period│
│   (Minute 1)  │       │  (Minute 10) │
└──────────────┘       └──────────────┘
```

## Data Flow Timeline

```
12:00:00 - Activity Period 1 created (independent)
12:01:00 - Activity Period 2 created (independent)
12:02:00 - Activity Period 3 created (independent)
...
12:09:00 - Activity Period 10 created (independent)
12:10:00 - Screenshot taken
         - Screenshot claims ownership of periods 1-10
         - Aggregates their scores
         - Links them via screenshot_periods table
```

## Database Implementation

### Tables Structure

#### screenshots
- Primary entity that owns activity periods
- `activityPeriodId`: References the FIRST period (for backward compatibility)
- `metadata.relatedPeriodIds`: Array of all 10 owned period IDs
- `metadata.aggregatedScore`: Average score from the 10 periods

#### activity_periods
- Independent entities created every minute
- Can exist without a screenshot (before screenshot is taken)
- Once linked to a screenshot, they belong to that screenshot

#### screenshot_periods (Mapping Table)
- Defines the one-to-many relationship
- Maps which 10 periods belong to each screenshot
- `screenshot_id`: The owning screenshot
- `activity_period_id`: One of the 10 owned periods
- `period_order`: Position in sequence (0-9)

### SQL Relationship

```sql
-- One screenshot has many periods
SELECT 
    s.id as screenshot_id,
    s.captured_at,
    ap.id as period_id,
    ap.period_start,
    ap.activity_score,
    sp.period_order
FROM screenshots s
JOIN screenshot_periods sp ON s.id = sp.screenshot_id  -- One-to-many join
JOIN activity_periods ap ON sp.activity_period_id = ap.id
WHERE s.id = 'screenshot-123'
ORDER BY sp.period_order;

-- Result: 1 screenshot row × 10 period rows
```

## Code Implementation

### Creating Activity Periods (Every Minute)
```javascript
// Independent creation - no screenshot reference yet
function createActivityPeriod() {
    return {
        id: uuid(),
        sessionId: currentSession.id,
        periodStart: new Date(),
        periodEnd: addMinutes(new Date(), 1),
        activityScore: calculateScore()
        // Note: No screenshot_id - periods are independent
    };
}
```

### Taking Screenshot (Every 10 Minutes)
```javascript
function captureScreenshot() {
    // Get the last 10 periods (they don't belong to any screenshot yet)
    const periods = getLastActivityPeriods(10);
    
    // Create screenshot that will own these periods
    const screenshot = {
        id: uuid(),
        capturedAt: new Date(),
        aggregatedScore: average(periods.map(p => p.activityScore))
    };
    
    // Establish ownership relationship
    saveScreenshot(screenshot);
    linkScreenshotToPeriods(screenshot.id, periods);
}
```

### Establishing the One-to-Many Relationship
```javascript
function linkScreenshotToPeriods(screenshotId, periods) {
    periods.forEach((period, index) => {
        // This period now belongs to this screenshot
        insertIntoScreenshotPeriods({
            screenshotId: screenshotId,
            activityPeriodId: period.id,
            periodOrder: index  // 0-9
        });
    });
}
```

## Key Principles

### 1. Ownership
- A screenshot **owns** its 10 activity periods
- Activity periods can exist without an owner (before screenshot is taken)
- Once owned, a period belongs to exactly one screenshot

### 2. Temporal Relationship
- Activity periods are created BEFORE the screenshot
- Screenshot "claims" the previous 10 periods when created
- The relationship is established AFTER both entities exist

### 3. Data Integrity
- Deleting a screenshot removes the relationship (CASCADE)
- Activity periods are preserved even if screenshot is deleted
- Period order is maintained (0-9) within each screenshot

## Querying Patterns

### Get Screenshot with All Its Periods
```sql
SELECT * FROM screenshots s
JOIN screenshot_periods sp ON s.id = sp.screenshot_id
JOIN activity_periods ap ON sp.activity_period_id = ap.id
WHERE s.id = ?
ORDER BY sp.period_order;
```

### Get Average Activity for a Screenshot
```sql
SELECT 
    s.id,
    AVG(ap.activity_score) as avg_score
FROM screenshots s
JOIN screenshot_periods sp ON s.id = sp.screenshot_id
JOIN activity_periods ap ON sp.activity_period_id = ap.id
GROUP BY s.id;
```

### Find Which Screenshot Owns a Period
```sql
SELECT s.* FROM screenshots s
JOIN screenshot_periods sp ON s.id = sp.screenshot_id
WHERE sp.activity_period_id = ?;
```

## Benefits of This Design

1. **Clear Ownership**: Each period belongs to at most one screenshot
2. **Temporal Accuracy**: Periods exist independently before being owned
3. **Efficient Queries**: One-to-many joins are simpler than many-to-many
4. **Data Integrity**: Clear cascade rules and foreign key constraints
5. **Flexibility**: Periods can exist without screenshots (for real-time tracking)

## Common Misconceptions

❌ **Wrong**: "Screenshots and periods have a many-to-many relationship"
✅ **Right**: Screenshots have a one-to-many relationship with periods

❌ **Wrong**: "Activity periods reference their screenshot"
✅ **Right**: Screenshots reference their periods (ownership direction)

❌ **Wrong**: "Periods are created when screenshot is taken"
✅ **Right**: Periods are created independently; screenshots claim them later

## Migration Notes

For existing systems:
1. Activity periods continue to work as before
2. Screenshot_periods table establishes the ownership relationship
3. The `activityPeriodId` in screenshots table references the first period
4. Full relationship is tracked in screenshot_periods table