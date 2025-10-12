# Version 1.1.0 Support Issue - REAL FIX

## Problem
Desktop app with version 1.1.0 showed:
> "Version 1.1.0 is no longer supported. Please update your desktop application"

Despite version 1.1.0 being visible in the admin panel and supposedly marked as supported.

## Root Cause - Column Name Mismatch

The issue was a **column naming mismatch** in the TypeORM entity mapping:

### Database Schema (Actual)
The database uses **camelCase** column names:
- `isSupported`
- `releaseDate`
- `deprecationDate`
- `createdAt`
- `updatedAt`

### Entity Mapping (Incorrect)
The TypeORM entity was mapping to **snake_case** column names:
```typescript
@Column({ name: 'is_supported', type: 'boolean', default: true })
isSupported: boolean;

@Column({ name: 'release_date', type: 'date' })
releaseDate: Date;
```

### What Happened
1. When TypeORM queried for version 1.1.0, it found the record
2. But it tried to read `is_supported` column (which doesn't exist)
3. TypeORM returned `undefined` or `null` for `isSupported`
4. The API interpreted `undefined/null` as `false` (not supported)
5. Desktop app received `isSupported: false` and showed the error

## Solution

Fixed the column name mappings in `app-version.entity.ts`:

```typescript
// BEFORE (incorrect)
@Column({ name: 'is_supported', type: 'boolean', default: true })
@Column({ name: 'release_date', type: 'date' })
@Column({ name: 'deprecation_date', type: 'date', nullable: true })
@Column({ name: 'created_at', type: 'timestamp with time zone' })
@Column({ name: 'updated_at', type: 'timestamp with time zone' })

// AFTER (correct)
@Column({ name: 'isSupported', type: 'boolean', default: true })
@Column({ name: 'releaseDate', type: 'date' })
@Column({ name: 'deprecationDate', type: 'date', nullable: true })
@Column({ name: 'createdAt', type: 'timestamp with time zone' })
@Column({ name: 'updatedAt', type: 'timestamp with time zone' })
```

## Why You Were Right

You were absolutely correct that:
1. Version 1.1.0 WAS in the database (shown in admin)
2. The app WAS detecting the version correctly (error message showed "1.1.0")
3. The problem wasn't with version detection

The issue was that TypeORM couldn't read the `isSupported` value due to the column name mismatch, so it appeared as if the version was marked as unsupported even though it was actually supported in the database.

## Files Modified

- `apps/api/src/entities/app-version.entity.ts` - Fixed all column name mappings

## Additional Debug Logging Added

Added comprehensive logging to help diagnose similar issues:
- `app-version.service.ts` - Logs exact version being checked and database response
- `apiSyncService.ts` - Logs API response for version checks

## Testing

After this fix:
1. Restart the API server to load the corrected entity mappings
2. Start the desktop app
3. The version check should now correctly read `isSupported: true`
4. No more "version not supported" errors

## Key Lesson

When working with TypeORM and existing databases, **always verify that column name mappings match exactly**. A mismatch won't cause a query error but will silently return wrong values!