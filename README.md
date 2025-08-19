# Developer Time Tracker System

A comprehensive time tracking system for developers consisting of multiple integrated components:
- Desktop App (Electron + React)
- VS Code Extension
- Browser Extension
- API Server (Node.js/Express)
- Admin Dashboard (React)

## Features

### Desktop App
- **Dual Mode Tracking**: Client Hours and Command Hours
- **Smart Screenshot Capture**: Random screenshots within 10-minute windows
- **Activity Monitoring**: Keyboard, mouse, and application usage tracking
- **Real-time Dashboard**: Current session info, time logs, and analytics
- **Screenshot Management**: View, edit notes, transfer between modes, delete
- **Leaderboard**: Daily and weekly top performers
- **Smart Idle Detection**: Automatic pause when inactive

### Activity Scoring System

#### Command Hours Mode
- Unique keys pressed (30%)
- Productive key hits (30%)
- Mouse clicks (15%)
- Mouse scrolls (10%)
- Mouse distance (15%)

#### Client Hours Mode (VS Code Extension)
- Code commits
- Files saved
- Caret movements
- Text selections
- Files opened
- Tabs switched
- Net lines count (manual or Copilot-assisted)

### Classification Rules
- PR review → Client Hours
- Coding with hands-on → Client Hours
- Build/Test/Debug hands-off → Command Hours
- Docs/Meetings/Comms → Command Hours

## Architecture

```
time-tracker/
├── apps/
│   ├── desktop/          # Electron desktop application
│   ├── api-server/       # Express API server
│   └── admin-app/        # React admin dashboard
├── extensions/
│   ├── vscode/          # VS Code extension
│   └── browser/         # Chrome/Edge browser extension
├── packages/
│   ├── shared/          # Shared types and utilities
│   └── database/        # Database schemas and migrations
```

## Database Schema

The system uses PostgreSQL with the following main tables:
- `organizations` - Company/organization data
- `organization_branches` - Geographic branches with timezone settings
- `users` - User accounts with roles
- `time_sessions` - Active tracking sessions
- `activity_periods` - 10-minute activity windows
- `screenshots` - Screenshot metadata and URLs
- `command_hour_activities` - Command mode metrics
- `client_hour_activities` - Client mode metrics (VS Code)
- `browser_activities` - Browser usage data
- `user_analytics` - Aggregated daily analytics

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Supabase account (for cloud sync)
- AWS S3 bucket (for screenshot storage)

### Installation

1. **Clone and install dependencies**
```bash
cd time-tracker
npm install
```

2. **Set up environment variables**

Create `.env` files in each app directory:

`apps/api-server/.env`:
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/timetracker
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=timetracker-screenshots
CLIENT_URLS=http://localhost:3000,http://localhost:5173
```

`apps/desktop/.env`:
```env
API_URL=http://localhost:3001
LOCAL_DB_PATH=./data/local.db
```

3. **Set up database**
```bash
# Create database
createdb timetracker

# Run migrations
psql -d timetracker -f packages/database/schema.sql
```

4. **Build all packages**
```bash
npm run build
```

5. **Start development servers**
```bash
# In separate terminals:

# API Server
cd apps/api-server
npm run dev

# Desktop App
cd apps/desktop
npm run dev

# Admin App
cd apps/admin-app
npm run dev
```

## VS Code Extension Setup

1. Open `extensions/vscode` in VS Code
2. Press F5 to run in Extension Development Host
3. Run command: "Time Tracker: Connect to Desktop App"

## Browser Extension Setup

1. Build the extension:
```bash
cd extensions/browser
npm run build
```

2. Load in Chrome/Edge:
   - Open Extensions page
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select `extensions/browser/dist` folder

## Usage

### Desktop App

1. **Login**: Enter credentials to authenticate
2. **Start Session**: Choose Client or Command Hours mode
3. **Switch Modes**: Toggle between modes as needed
4. **View Dashboard**: Monitor time, screenshots, and analytics
5. **Manage Screenshots**: Click to view full-size, edit notes, transfer, or delete

### Admin Dashboard

1. **Organization Management**: Create and manage organizations
2. **User Management**: Add/remove users, reset passwords
3. **Branch Setup**: Configure timezones and work weeks
4. **Reports**: View individual and team analytics
5. **Time Periods**: Daily, weekly, 4-week, 13-week, 52-week reports

## Activity Validation Rules

- **< 30% activity**: Invalid, discarded with screenshots
- **30-50% in Client mode**: Transferred to Command Hours
- **≥ 50% in Client mode**: Valid Client Hours
- **≥ 30% in Command mode**: Valid Command Hours

## Security Features

- Anti-gaming detection (ignores robot inputs)
- Foreground window validation
- Valid signal requirements
- Local + cloud data storage
- Encrypted screenshot storage

## Development

### Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Desktop**: Electron, Node.js
- **Backend**: Express, PostgreSQL, Supabase
- **Extensions**: VS Code API, Chrome Extension API
- **Storage**: AWS S3, Local filesystem

### Key Libraries
- `iohook` - Low-level input monitoring
- `screenshot-desktop` - Cross-platform screenshots
- `active-win` - Active window detection
- `sharp` - Image processing
- `recharts` - Analytics visualization
- `@tanstack/react-query` - Data fetching
- `zustand` - State management

## Troubleshooting

### Desktop App Issues
- **Screenshots not capturing**: Check permissions for screen recording
- **Activity not tracking**: Verify accessibility permissions
- **Connection issues**: Check API server is running

### VS Code Extension
- **Not connecting**: Verify desktop app is running
- **No activity data**: Check extension is activated

### Browser Extension
- **No data syncing**: Check WebSocket connection to desktop app
- **Missing permissions**: Reinstall with all required permissions

## License

Private - All rights reserved