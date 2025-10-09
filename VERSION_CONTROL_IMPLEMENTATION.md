# App Version Control Implementation

## Overview
This document describes the version control mechanism implemented for the People Parity desktop application. This system allows admins to manage which app versions are allowed to connect to the backend, preventing users from running outdated or unsupported versions.

## Components Implemented

### 1. Desktop App Changes

#### Version Configuration
- **File**: `apps/desktop/package.json`
- Added `appVersion` field (currently set to "1.1.0")
- This version is automatically included in all API requests

#### API Service Updates
- **File**: `apps/desktop/src/main/services/apiSyncService.ts`
- Added `x-app-version` header to all API requests via interceptor
- Implemented version error handling (HTTP 426 - Upgrade Required)
- Added `checkVersion()` method to verify app version on startup
- Stores version errors in electron-store for UI display

#### Main Process Integration
- **File**: `apps/desktop/src/main/index.ts`
- Calls `checkVersion()` on app startup after services initialization
- Logs warning if version is not supported

### 2. Backend Changes

#### Database Schema
- **Migration**: `apps/api/src/migrations/1759000000000-AddAppVersionControl.ts`
- **SQL Schema**: `packages/database/migrations/005_app_version_control.sql`
- Created `app_versions` table with fields:
  - `id` (UUID, primary key)
  - `version` (VARCHAR, unique)
  - `is_supported` (BOOLEAN)
  - `release_date` (DATE)
  - `deprecation_date` (DATE, nullable)
  - `notes` (TEXT, nullable)
  - `created_at`, `updated_at` (TIMESTAMP)

#### Entity & Module
- **Entity**: `apps/api/src/entities/app-version.entity.ts`
- **Module**: `apps/api/src/modules/app-version/app-version.module.ts`
- **Service**: `apps/api/src/modules/app-version/app-version.service.ts`
- **Controller**: `apps/api/src/modules/app-version/app-version.controller.ts`

#### API Endpoints
- `GET /api/app-versions` - List all versions
- `GET /api/app-versions/supported` - List supported versions only
- `GET /api/app-versions/check/:version` - Check if a version is supported
- `POST /api/app-versions` - Add new version (admin only)
- `PUT /api/app-versions/:version/support` - Update version support status (admin only)

#### Version Check Guard
- **File**: `apps/api/src/guards/version-check.guard.ts`
- Validates `x-app-version` header on protected routes
- Returns HTTP 426 (Upgrade Required) if:
  - No version header present
  - Version not recognized
  - Version not supported
- Applied to:
  - `SessionsController`
  - `ActivityController`

### 3. Admin Interface

#### Version Management Page
- **File**: `apps/admin/src/pages/AppVersions.tsx`
- Features:
  - List all app versions with status
  - Add new versions
  - Toggle support status (deprecate/restore)
  - View release and deprecation dates
  - Add release notes
- Access: Admin menu → "App Versions"

#### Navigation
- Added to `apps/admin/src/App.tsx` (route: `/app-versions`)
- Added to `apps/admin/src/components/ProfileDropdown.tsx` (admin menu)

## Usage Flow

### For Admins

1. **Add a New Version**:
   - Navigate to App Versions page
   - Click "Add New Version"
   - Enter version number (e.g., "1.2.0"), release date, and optional notes
   - Submit - version is automatically marked as supported

2. **Deprecate an Old Version**:
   - Find the version in the list
   - Click "Deprecate" button
   - The version's `is_supported` flag is set to false
   - Deprecation date is automatically set to today

3. **Restore a Version**:
   - Find the deprecated version
   - Click "Restore" button
   - Version becomes supported again

### For Desktop App Users

1. **On Startup**:
   - App checks its version against the backend
   - If unsupported, warning is logged (app still works for now)

2. **During API Calls**:
   - Every request includes the app version header
   - If version is unsupported, receives HTTP 426 error
   - Error is stored and can be displayed to user
   - Further requests will continue to fail until app is updated

## Version Numbering Scheme

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

Example timeline:
- Week 1: Release 1.1.0
- Week 2: Release 1.2.0 (add as supported, keep 1.1.0 supported)
- Week 3: Release 1.3.0 (add as supported, deprecate 1.1.0)
- Week 4: Release 1.4.0 (add as supported, deprecate 1.2.0)

## Migration Steps

1. **Run Backend Migration**:
   ```bash
   cd apps/api
   npm run migration:run
   ```
   This creates the `app_versions` table and inserts version 1.1.0

2. **Update Desktop App Version**:
   - Increment version in `apps/desktop/package.json`
   - Build and release new desktop app

3. **Add Version to Admin**:
   - Log into admin interface
   - Go to App Versions
   - Add the new version with release date

4. **Deprecate Old Versions**:
   - After sufficient migration time (e.g., 2-3 weeks)
   - Deprecate old versions in admin interface
   - Users on old versions will be forced to update

## Future Enhancements

1. **Auto-update Integration**:
   - Show update prompt in desktop app when version error occurs
   - Integrate with electron-updater to auto-download new version

2. **Grace Period**:
   - Add a warning period before hard deprecation
   - Show warning dialogs to users on soon-to-be-deprecated versions

3. **Usage Analytics**:
   - Track which versions are actively in use
   - Show usage stats in admin interface

4. **Forced Update Modal**:
   - When version is deprecated, show a blocking modal in desktop app
   - Prevent tracking until app is updated

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Add a new version via admin interface
- [ ] Verify desktop app sends version header
- [ ] Test deprecating a version
- [ ] Verify desktop app receives 426 error for deprecated version
- [ ] Test restoring a deprecated version
- [ ] Verify version check on app startup works
- [ ] Test with missing version header (should return 426)
