# People Parity Time Tracker - Deployment Guide

## Overview
This guide covers the deployment and distribution of the People Parity Time Tracker application, which consists of two primary components:
1. **NestJS API Server** - Backend REST API
2. **Electron Desktop App** - Cross-platform desktop client

## 🎯 Prerequisites

### For API Deployment
- Node.js 18+ and npm
- PostgreSQL 14+ database
- AWS S3 bucket for screenshot storage (configured)
- SSL certificate for HTTPS
- Domain name for API endpoint

### For Desktop App Distribution
- Code signing certificates (platform-specific)
- Apple Developer account (for macOS)
- Windows code signing certificate (for Windows)
- GitHub account (for auto-updates via releases)

## 📦 Component 1: API Server Deployment

### Option A: Deploy to Cloud (Recommended)

#### 1. Using AWS EC2/DigitalOcean/Linode

```bash
# On your server
cd /var/www
git clone https://github.com/yourusername/time-tracker.git
cd time-tracker/apps/api

# Install dependencies
npm install

# Build the application
npm run build

# Set up environment variables
cp .env.example .env
nano .env
```

#### 2. Environment Configuration

Create `.env` file with:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=timetracker
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=timetracker_prod

# JWT
JWT_SECRET=your_very_secure_jwt_secret_here

# AWS S3 for Screenshots
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=peopleparity-screenshots

# Server
PORT=3001
NODE_ENV=production

# SAML (optional)
SAML_ENTRYPOINT=https://your-idp.com/saml/sso
SAML_ISSUER=https://your-app.com
SAML_CALLBACK_URL=https://api.your-domain.com/api/auth/saml/callback
```

#### 3. Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE timetracker_prod;
CREATE USER timetracker WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE timetracker_prod TO timetracker;
\q

# Run migrations
npm run migration:run
```

#### 4. Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'people-parity-api',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Nginx Configuration

```nginx
# /etc/nginx/sites-available/people-parity-api
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B: Deploy to Docker

Create `Dockerfile` in `/apps/api`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

Build and run:

```bash
docker build -t people-parity-api .
docker run -d -p 3001:3001 --env-file .env people-parity-api
```

### Option C: Deploy to Platform-as-a-Service

#### Heroku
```bash
# Install Heroku CLI and login
heroku create people-parity-api
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# Set other environment variables...
git push heroku main
```

#### Railway/Render
- Connect GitHub repository
- Set environment variables in dashboard
- Deploy automatically on push

## 🖥️ Component 2: Desktop App Distribution

### Step 1: Configure Electron Builder

Create `electron-builder.json` in `/apps/desktop`:

```json
{
  "appId": "com.peopleparity.timetracker",
  "productName": "People Parity",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "icon": "assets/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "notarize": {
      "teamId": "YOUR_TEAM_ID"
    }
  },
  "dmg": {
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      }
    ],
    "icon": "assets/icon.ico",
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "${CERTIFICATE_PASSWORD}"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "deleteAppDataOnUninstall": true
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Utility",
    "icon": "assets/icon.png"
  },
  "publish": {
    "provider": "github",
    "owner": "your-org",
    "repo": "people-parity-releases",
    "releaseType": "release"
  }
}
```

### Step 2: Set API Endpoint Configuration

Create `src/main/config/api.ts`:

```typescript
export const API_CONFIG = {
  development: 'http://localhost:3001',
  production: 'https://api.your-domain.com'
};

export function getApiUrl(): string {
  return process.env.NODE_ENV === 'production' 
    ? API_CONFIG.production 
    : API_CONFIG.development;
}
```

### Step 3: Code Signing

#### macOS Code Signing

1. Get Apple Developer Certificate
2. Export as .p12 file
3. Set environment variables:

```bash
export APPLE_ID="your-apple-id@email.com"
export APPLE_ID_PASS="app-specific-password"
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"
```

#### Windows Code Signing

1. Purchase code signing certificate
2. Set environment variable:

```bash
export CERTIFICATE_PASSWORD="your-cert-password"
```

### Step 4: Build for Distribution

```bash
cd apps/desktop

# Install dependencies
npm install

# Build for all platforms
npm run build

# Build for specific platform
npm run dist -- --mac  # macOS
npm run dist -- --win  # Windows
npm run dist -- --linux # Linux
```

### Step 5: Auto-Update Setup

Add to `src/main/index.ts`:

```typescript
import { autoUpdater } from 'electron-updater';

// Configure auto-updater
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-org',
  repo: 'people-parity-releases'
});

// Check for updates
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

// Auto-update events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'A new version is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'Update downloaded. The app will restart to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

## 🚀 Distribution Channels

### 1. Direct Download
- Host installers on your website
- Provide download links for each platform

### 2. GitHub Releases
```bash
# Create a new release
gh release create v1.0.0 \
  ./dist-electron/People-Parity-1.0.0.dmg \
  ./dist-electron/People-Parity-Setup-1.0.0.exe \
  ./dist-electron/People-Parity-1.0.0.AppImage \
  --title "People Parity v1.0.0" \
  --notes "Initial release"
```

### 3. Enterprise Distribution
- Create MSI installer for Windows Group Policy deployment
- Create PKG installer for macOS MDM deployment
- Provide silent installation scripts

## 📝 Installation Instructions for Users

### Windows
1. Download `People-Parity-Setup-1.0.0.exe`
2. Run the installer
3. Follow installation wizard
4. Launch from Start Menu

### macOS
1. Download `People-Parity-1.0.0.dmg`
2. Open the DMG file
3. Drag People Parity to Applications folder
4. Launch from Applications
5. If blocked by Gatekeeper, right-click and select "Open"

### Linux
1. Download `People-Parity-1.0.0.AppImage`
2. Make it executable: `chmod +x People-Parity-1.0.0.AppImage`
3. Run: `./People-Parity-1.0.0.AppImage`

Or install via deb package:
```bash
sudo dpkg -i people-parity_1.0.0_amd64.deb
```

## 🔒 Security Considerations

1. **API Security**
   - Use HTTPS everywhere
   - Implement rate limiting
   - Use strong JWT secrets
   - Regular security updates

2. **Desktop App Security**
   - Code sign all releases
   - Use context isolation in Electron
   - Disable Node integration in renderer
   - Regular dependency updates

3. **Data Security**
   - Encrypt sensitive data at rest
   - Use secure communication channels
   - Implement proper access controls
   - Regular security audits

## 📊 Monitoring and Maintenance

### API Monitoring
```bash
# Install monitoring
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Set up log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Desktop App Analytics
- Implement crash reporting (Sentry)
- Track usage metrics (respect privacy)
- Monitor auto-update success rates

## 🆘 Troubleshooting

### Common API Issues
- Database connection errors: Check PostgreSQL service
- S3 upload failures: Verify AWS credentials
- High memory usage: Adjust PM2 cluster instances

### Common Desktop App Issues
- White screen: Check API endpoint configuration
- Installation blocked: Verify code signing
- Auto-update failures: Check GitHub release configuration

## 📚 Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Let's Encrypt SSL](https://letsencrypt.org/)

## Support

For deployment assistance, please contact:
- Technical issues: support@peopleparity.com
- Enterprise deployment: enterprise@peopleparity.com