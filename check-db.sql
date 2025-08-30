-- Check local SQLite database for activity data

-- Get recent sessions
SELECT 
  id,
  mode,
  startTime,
  endTime,
  isActive
FROM sessions
ORDER BY startTime DESC
LIMIT 5;

-- Get recent activity periods
SELECT 
  ap.id,
  ap.sessionId,
  ap.screenshotId,
  datetime(ap.periodStart/1000, 'unixepoch') as periodStart,
  datetime(ap.periodEnd/1000, 'unixepoch') as periodEnd,
  ap.activityScore,
  ap.classification,
  ap.metricsBreakdown IS NOT NULL as hasMetrics
FROM activity_periods ap
ORDER BY ap.periodStart DESC
LIMIT 10;

-- Get recent screenshots
SELECT 
  s.id,
  s.sessionId,
  datetime(s.capturedAt/1000, 'unixepoch') as capturedAt,
  s.localPath,
  s.url,
  s.isSynced
FROM screenshots s
ORDER BY s.capturedAt DESC
LIMIT 5;

-- Count items in sync queue
SELECT 
  entityType,
  COUNT(*) as count
FROM sync_queue
GROUP BY entityType;