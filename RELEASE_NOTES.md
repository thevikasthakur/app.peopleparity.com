# Release Notes

## Bug Fixes

### Fixed Anomalous Activity Detection Persistence Issue

**Fixed a critical bug where anomalous activity detection would incorrectly persist across multiple consecutive minutes, causing false positives in defense activation reports.**

The activity tracker's bot detection system was accumulating keystroke and mouse movement data across the entire session rather than analyzing each minute independently. This caused a cascading effect where if one minute was flagged as anomalous due to repetitive patterns (e.g., holding down a key, automated scrolling), the accumulated data would contaminate the analysis of subsequent minutes, leading to false anomalous activity flags for 5-10 minutes after the original event.

The fix introduces per-minute data isolation by:
- Implementing separate per-minute keystroke tracking that resets at the start of each new minute (0th second)
- Ensuring the bot detection service analyzes only the current minute's input patterns, not accumulated session data
- Preventing memory leaks by capping per-minute data at 1000 keystrokes
- Adding clear boundaries between minute-level data collections to eliminate cross-contamination

This significantly improves the accuracy of the anomaly detection system, reducing false positives while maintaining the ability to detect genuine automated or bot-like behavior patterns. Users will now see more accurate defense activation reports that reflect actual anomalous activity rather than artifacts from data accumulation.

**Technical Details:**
- Added `currentMinuteKeystrokeCodes[]` and `currentMinuteKeystrokeTimestamps[]` arrays that reset every minute
- Modified the metrics collection to override accumulated keystroke data with per-minute data before bot detection analysis
- Updated the admin dashboard's bot detection report generator to display minute-accurate anomaly information
- Created database indexes (`idx_screenshots_user_time_deleted`, `idx_screenshots_session`) to optimize anomaly detection queries
