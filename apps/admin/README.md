# People Parity Admin Dashboard

A web-based admin dashboard for monitoring team productivity and managing the People Parity time tracking system.

## Features

- **Team Monitoring**: View screenshots and activity data from all team members
- **Real-time Updates**: See live sessions and activity as they happen
- **Date Navigation**: Browse historical data by date
- **User Filtering**: Filter by specific team members
- **Activity Metrics**: View activity scores and productivity metrics
- **Session Tracking**: Monitor active and completed work sessions

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- React Query for data fetching and caching
- Framer Motion for animations
- Lucide React for icons

## Prerequisites

- Node.js 18+
- npm or yarn
- API server running on port 3001

## Installation

1. Navigate to the admin directory:
```bash
cd apps/admin
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the API URL if needed in `.env`:
```
VITE_API_URL=http://localhost:3001
```

## Development

Start the development server:
```bash
npm run dev
```

The admin dashboard will be available at `http://localhost:3000`

## Building

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
apps/admin/
├── src/
│   ├── components/       # Reusable React components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── pages/           # Page components (Login, Dashboard)
│   ├── services/        # API service layer
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles and Tailwind imports
├── public/              # Static assets
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Key Components

- **Login**: Authentication screen with email/password and Microsoft SSO
- **Dashboard**: Main monitoring interface with screenshots grid
- **ScreenshotGrid**: Displays team screenshots with activity scores
- **TeamMemberSelector**: Filter by specific team members
- **SessionInfo**: Shows work session details

## API Integration

The admin app connects to the same API server as the desktop app. It uses:
- Bearer token authentication
- RESTful endpoints for data fetching
- WebSocket support for real-time updates

## Differences from Desktop App

Unlike the desktop app which uses local SQLite database, the admin app:
- Fetches all data from the API server
- Doesn't include "Your Vibes Today", "Hall of Fame", "Weekly Marathon", and "Activity" components
- Is designed for team managers to monitor multiple users
- Runs in a web browser instead of Electron

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint