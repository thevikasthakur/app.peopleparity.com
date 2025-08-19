# 🗄️ People Parity Local Database

## Overview

People Parity uses a **local SQLite database** to store all user data directly on their machine. This ensures complete privacy and offline functionality - no data ever leaves your computer unless you explicitly export it.

## Database Location

The database file `ppv1.db` is stored in your system's application data directory:

- **macOS**: `~/Library/Application Support/People Parity/ppv1.db`
- **Windows**: `%APPDATA%/People Parity/ppv1.db`
- **Linux**: `~/.config/People Parity/ppv1.db`

## Features

### 🔐 Complete Privacy
- All data stored locally on your machine
- No cloud sync or external servers
- You own and control your data

### ⚡ Fast Performance
- SQLite provides microsecond query times
- Optimized with indexes for common queries
- WAL mode for concurrent reads/writes

### 💾 Easy Backup
- Single file to backup (`ppv1.db`)
- Export functionality built-in
- Can be copied/moved like any file

## Database Schema

### Core Tables
1. **users** - Local user profiles
2. **projects** - Projects you're tracking time for
3. **sessions** - Active tracking sessions
4. **activity_periods** - 10-minute activity windows
5. **screenshots** - Screenshot metadata and paths
6. **command_hour_activities** - Keyboard/mouse metrics
7. **client_hour_activities** - Coding metrics from VS Code
8. **browser_activities** - Web browsing data
9. **recent_notes** - Frequently used task descriptions
10. **daily_analytics** - Aggregated daily statistics

## First Run

On first launch, the app automatically:
1. Creates the database file
2. Initializes all tables and indexes
3. Creates a default local user
4. Sets up 4 sample projects:
   - Main Product (Indigo)
   - Mobile App (Emerald)
   - API Server (Amber)
   - Admin Dashboard (Red)

## Data Management

### Export Your Data
```javascript
// Export all your data as JSON
const data = await databaseService.exportUserData();
// Includes: sessions, activities, screenshots, projects
```

### Check Database Size
```javascript
const info = databaseService.getDatabaseInfo();
// Returns: { path: "...", sizeInMB: "2.5 MB" }
```

### Backup
Simply copy the `ppv1.db` file to your backup location:
```bash
cp ~/Library/Application\ Support/People\ Parity/ppv1.db ~/Backups/
```

### Restore
Replace the database file with your backup:
```bash
cp ~/Backups/ppv1.db ~/Library/Application\ Support/People\ Parity/
```

## Troubleshooting

### "Module compiled against different Node.js version"
Run the rebuild script:
```bash
npm rebuild better-sqlite3 --runtime=electron --target=28.2.0 --dist-url=https://electronjs.org/headers --abi=119
```

### Database locked
- Ensure only one instance of the app is running
- Check file permissions on the database file

### Reset Database
Delete the database file to start fresh:
```bash
rm ~/Library/Application\ Support/People\ Parity/ppv1.db
```
The app will create a new one on next launch.

## Performance

- **Typical database size**: 5-50 MB for a year of data
- **Query performance**: < 1ms for most operations
- **Storage overhead**: ~10 KB per day of tracking
- **Screenshot references**: Only paths stored, not images

## Security Considerations

1. **File Permissions**: Database file is only readable by your user account
2. **No Encryption**: Data is stored in plain SQLite format
3. **Local Only**: No network connections for database operations
4. **Screenshots**: Stored separately in app data folder

## Development

### Access Database Directly
You can inspect the database using any SQLite tool:
```bash
sqlite3 ~/Library/Application\ Support/People\ Parity/ppv1.db
.tables  # List all tables
.schema  # Show table structures
```

### Sample Queries
```sql
-- Today's tracked time
SELECT SUM(periodEnd - periodStart) / 3600000.0 as hours
FROM activity_periods 
WHERE date(periodStart/1000, 'unixepoch') = date('now');

-- Projects with most time
SELECT p.name, SUM(ap.periodEnd - ap.periodStart) / 3600000.0 as hours
FROM activity_periods ap
JOIN sessions s ON ap.sessionId = s.id
JOIN projects p ON s.projectId = p.id
GROUP BY p.name
ORDER BY hours DESC;
```

## Data Retention

- **No automatic deletion**: All data is kept indefinitely
- **Manual cleanup**: Use the app's delete functions
- **Export before uninstall**: Database is removed with app

---

Your time tracking data stays on YOUR machine, under YOUR control. 🎯