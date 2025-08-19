# 🔐 Super Admin System Guide

## Overview

People Parity includes a powerful Super Admin system that allows complete control over organizations and users. The Super Admin account is automatically created on first launch.

## First Launch Setup

When you run the app for the first time, it will:

1. **Create the database** at `~/Library/Application Support/People Parity/ppv1.db`
2. **Generate a Super Admin account** with random secure password
3. **Display credentials in the console** (SAVE THESE!)

### Example Console Output:
```
============================================================
🔐 SUPER ADMIN ACCOUNT CREATED
============================================================
📧 Email: admin@peopleparity.local
🔑 Password: xK9#mP2$vL6@nQ8!
============================================================
⚠️  SAVE THESE CREDENTIALS! They won't be shown again.
============================================================
```

## Super Admin Capabilities

### 1. Organization Management
- Create new organizations with unique codes
- Set timezone and first day of week
- View organization statistics
- Manage organization settings

### 2. User Management
- Create organization admins and developers
- Reset user passwords
- Update user roles
- Deactivate user accounts
- View user activity statistics

### 3. Project Management
- Create projects for organizations
- Assign projects to users
- Track project time allocation

## User Roles Hierarchy

1. **Super Admin** (`super_admin`)
   - Full system access
   - Manage all organizations
   - Create org admins
   - Cannot be deleted or modified

2. **Organization Admin** (`org_admin`)
   - Manage their organization
   - Create/manage developers
   - View organization reports
   - Manage projects

3. **Developer** (`developer`)
   - Track their own time
   - View their own data
   - Use time tracking features

## Login Process

### For Super Admin:
```javascript
Email: admin@peopleparity.local
Password: [Generated password from console]
```

### For Organization Users:
```javascript
Email: [user email]
Password: [set by admin]
```

## Creating an Organization

After logging in as Super Admin:

1. **Create Organization**
   ```javascript
   Name: "Acme Corp"
   Code: "ACME"  // Unique identifier
   Timezone: "America/New_York"
   ```

2. **Create Organization Admin**
   ```javascript
   Email: "admin@acmecorp.com"
   Name: "John Admin"
   Password: "SecurePassword123!"
   Organization: "ACME"
   Role: "org_admin"
   ```

3. **Create Projects**
   ```javascript
   Name: "Website Redesign"
   Organization: "ACME"
   Color: "#6366f1"
   ```

## API Endpoints (IPC Handlers)

### Authentication
- `auth:login` - Login with email/password
- `auth:logout` - Logout current user
- `auth:check-session` - Verify active session

### Organizations
- `organizations:create` - Create new organization
- `organizations:list` - List all organizations
- `organizations:stats` - Get organization statistics

### Users
- `users:create` - Create new user
- `users:list` - List organization users
- `users:get` - Get user details
- `users:update-role` - Change user role
- `users:deactivate` - Deactivate user
- `users:reset-password` - Reset user password

### Projects
- `projects:list` - List projects

## Security Features

1. **Password Hashing**: All passwords are bcrypt hashed
2. **Role-based Access**: Strict role hierarchy
3. **Session Management**: Secure local sessions
4. **Super Admin Protection**: Cannot be deleted or modified
5. **Audit Trail**: All actions are logged with timestamps

## Database Management

### View Super Admin in Database:
```sql
sqlite3 ~/Library/Application\ Support/People\ Parity/ppv1.db
SELECT * FROM users WHERE role = 'super_admin';
```

### Reset Super Admin Password (Emergency):
If you lose the Super Admin password, delete the database to reset:
```bash
rm ~/Library/Application\ Support/People\ Parity/ppv1.db
```
Then restart the app to generate new credentials.

## Best Practices

1. **Save Initial Credentials**: Write down the Super Admin password immediately
2. **Create Organization Admins**: Don't use Super Admin for daily operations
3. **Regular Backups**: Backup the database file regularly
4. **Password Policy**: Enforce strong passwords for all users
5. **Audit Regularly**: Review user activities and access levels

## Troubleshooting

### Lost Super Admin Password
1. Stop the application
2. Delete the database file
3. Restart to generate new credentials

### Super Admin Already Exists
The console will show:
```
============================================================
✅ Super Admin Account Exists
============================================================
📧 Email: admin@peopleparity.local
💡 Use saved credentials to login
============================================================
```

### Cannot Create Users
- Ensure you're logged in as Super Admin or Org Admin
- Check that the organization exists
- Verify email is unique

## Example Workflow

1. **Start App** → Get Super Admin credentials
2. **Login** as Super Admin
3. **Create Organization** "TechCorp" with code "TECH"
4. **Create Org Admin** for TechCorp
5. **Logout** and login as Org Admin
6. **Create Developers** for the team
7. **Create Projects** for tracking
8. Developers can now login and track time

---

The Super Admin system provides complete control while maintaining security and proper access hierarchy. Always keep the Super Admin credentials secure! 🔒