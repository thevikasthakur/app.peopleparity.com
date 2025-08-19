# People Parity API Server

## Overview

NestJS-based API server for the People Parity time tracking system. Handles authentication, user management, time tracking data synchronization, and screenshot uploads.

## Setup

### Prerequisites

- PostgreSQL database
- AWS S3 bucket (for screenshot storage)
- Node.js 18+

### Environment Variables

Create a `.env` file in the api directory:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=peopleparity

# JWT
JWT_SECRET=people-parity-secret-key-2024
JWT_EXPIRATION=7d

# AWS S3 (for screenshots)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=peopleparity-screenshots

# Server
PORT=3001
NODE_ENV=development

# Super Admin
SUPER_ADMIN_EMAIL=admin@peopleparity.com
SUPER_ADMIN_PASSWORD=Expressparity1!
```

### Installation

```bash
npm install
```

### Database Setup

The API uses TypeORM with automatic synchronization in development mode. Tables will be created automatically on first run.

### Running the Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

All endpoints are prefixed with `/api`

### Authentication

#### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "admin@peopleparity.com",
  "password": "Expressparity1!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@peopleparity.com",
    "name": "Super Admin",
    "organizationId": null,
    "organizationName": null,
    "role": "super_admin"
  },
  "token": "jwt-token",
  "projects": []
}
```

#### GET `/api/auth/verify`
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST `/api/auth/logout`
Logout (client-side token removal).

### Organizations

#### GET `/api/organizations`
Get all organizations (requires auth).

#### POST `/api/organizations`
Create new organization (super_admin only).

**Request:**
```json
{
  "name": "Acme Corp",
  "code": "ACME",
  "timezone": "America/New_York",
  "firstDayOfWeek": "monday"
}
```

### Users

#### GET `/api/users/organization/:organizationId`
Get users in an organization.

#### POST `/api/users`
Create new user (admin only).

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePassword123!",
  "organizationId": "org-uuid",
  "role": "developer"
}
```

### Projects

#### GET `/api/projects`
Get projects for user's organization.

#### POST `/api/projects`
Create new project.

**Request:**
```json
{
  "name": "Website Redesign",
  "description": "New company website",
  "color": "#6366f1"
}
```

### Sessions

#### POST `/api/sessions`
Create new tracking session.

**Request:**
```json
{
  "projectId": "project-uuid",
  "mode": "client_hours",
  "task": "Working on feature X",
  "startTime": "2024-01-15T10:00:00Z"
}
```

#### PATCH `/api/sessions/:id`
Update session (end time, etc).

### Activity Periods

#### POST `/api/activity-periods`
Create activity period.

**Request:**
```json
{
  "sessionId": "session-uuid",
  "periodStart": "2024-01-15T10:00:00Z",
  "periodEnd": "2024-01-15T10:10:00Z",
  "mode": "client_hours",
  "activityScore": 85.5,
  "isValid": true,
  "metrics": {
    "keystrokes": 523,
    "mouseClicks": 89
  }
}
```

### Screenshots

#### POST `/api/screenshots/upload`
Upload screenshot to S3.

**Form Data:**
- `screenshot`: File (image)
- `capturedAt`: Timestamp
- `activityPeriodId`: UUID (optional)
- `mode`: "client_hours" or "command_hours"

### Analytics

#### GET `/api/analytics/leaderboard`
Get organization leaderboard (today & week).

**Response:**
```json
{
  "today": [
    {
      "userId": "uuid",
      "userName": "John Doe",
      "totalHours": 6.5,
      "rank": 1
    }
  ],
  "week": [
    {
      "userId": "uuid",
      "userName": "John Doe",
      "totalHours": 32.5,
      "rank": 1
    }
  ]
}
```

## Authentication Flow

1. Desktop app calls `/api/auth/login` with credentials
2. API validates against PostgreSQL database
3. Returns JWT token and user info
4. Desktop app stores token and uses in subsequent requests
5. All protected endpoints require `Authorization: Bearer <token>` header

## Default Super Admin

On first startup, the API creates a super admin account:
- Email: `admin@peopleparity.com`
- Password: `Expressparity1!`

Use this account to:
1. Create organizations
2. Create organization admins
3. Manage the entire system

## Database Schema

The API uses TypeORM entities for:
- Organizations
- Users
- Projects
- Sessions
- ActivityPeriods
- Screenshots

All relationships are properly defined with foreign keys and cascades.

## Security

- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Role-based access control (super_admin, org_admin, developer)
- CORS configured for desktop app

## Development

```bash
# Watch mode
npm run start:dev

# Debug mode
npm run start:debug
```

## Production Deployment

1. Set environment variables
2. Build the application: `npm run build`
3. Start with PM2 or similar: `pm2 start dist/main.js --name peopleparity-api`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_* environment variables
- Verify network connectivity

### S3 Upload Issues
- Verify AWS credentials
- Check bucket permissions
- Ensure bucket exists in specified region

### Authentication Issues
- Check JWT_SECRET is set
- Verify token expiration
- Ensure Authorization header format is correct