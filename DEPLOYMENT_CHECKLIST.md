# People Parity Deployment Checklist

## Pre-Deployment Checklist

### 🔐 Security & Credentials
- [ ] Generate strong JWT secret for production
- [ ] Set up AWS S3 bucket with proper IAM policies
- [ ] Obtain SSL certificates for API domain
- [ ] Get code signing certificates (Windows & macOS)
- [ ] Create Apple Developer account for notarization
- [ ] Set up GitHub repository for releases

### 🗄️ Database Setup
- [ ] Provision PostgreSQL database server
- [ ] Create production database
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Run initial migrations
- [ ] Test database connectivity

### ☁️ Infrastructure
- [ ] Provision API server (min 2GB RAM, 2 vCPU)
- [ ] Configure firewall rules
- [ ] Set up domain and DNS records
- [ ] Install Node.js 18+ on server
- [ ] Install PM2 for process management
- [ ] Configure Nginx as reverse proxy

## API Deployment Steps

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nginx postgresql nodejs npm git

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/people-parity
sudo chown $USER:$USER /var/www/people-parity
```

### 2. Deploy API
- [ ] Clone repository to server
- [ ] Copy `.env.production` file
- [ ] Install dependencies: `npm ci --production`
- [ ] Build application: `npm run build`
- [ ] Run migrations: `npm run migration:run`
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Configure PM2 startup: `pm2 startup && pm2 save`

### 3. Configure Nginx
- [ ] Create Nginx configuration
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/people-parity /etc/nginx/sites-enabled/`
- [ ] Test configuration: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Set up SSL with Let's Encrypt

### 4. Verify API
- [ ] Test health endpoint: `curl https://api.domain.com/health`
- [ ] Test authentication endpoint
- [ ] Verify database connectivity
- [ ] Check S3 upload functionality
- [ ] Monitor logs: `pm2 logs`

## Desktop App Distribution

### 1. Pre-Build Setup
- [ ] Update version in package.json
- [ ] Update API endpoint in configuration
- [ ] Add application icons (ico, icns, png)
- [ ] Create release notes
- [ ] Test application thoroughly

### 2. Code Signing Setup

#### macOS
- [ ] Export Developer ID certificate as .p12
- [ ] Set environment variables:
  ```bash
  export APPLE_ID="your-email@example.com"
  export APPLE_ID_PASS="app-specific-password"
  export APPLE_TEAM_ID="TEAM123456"
  export CSC_LINK="path/to/certificate.p12"
  export CSC_KEY_PASSWORD="certificate-password"
  ```

#### Windows
- [ ] Install code signing certificate
- [ ] Set environment variable:
  ```bash
  export CERTIFICATE_PASSWORD="cert-password"
  ```

### 3. Build Applications
```bash
# Clean build directories
rm -rf dist dist-electron

# Install dependencies
npm ci

# Build for all platforms
npm run build
npm run dist

# Or build separately
npm run dist -- --mac
npm run dist -- --win
npm run dist -- --linux
```

### 4. Test Installers
- [ ] Test Windows installer on Windows 10/11
- [ ] Test macOS DMG on Intel Mac
- [ ] Test macOS DMG on Apple Silicon Mac
- [ ] Test Linux AppImage on Ubuntu
- [ ] Verify auto-update functionality
- [ ] Check permissions and screen recording

### 5. Create GitHub Release
- [ ] Create new release on GitHub
- [ ] Upload all installers:
  - `People-Parity-Setup-1.0.0.exe`
  - `People-Parity-1.0.0-x64.dmg`
  - `People-Parity-1.0.0-arm64.dmg`
  - `People-Parity-1.0.0.AppImage`
- [ ] Add release notes
- [ ] Publish release

## Post-Deployment

### Monitoring
- [ ] Set up application monitoring (e.g., Sentry)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Create performance dashboards
- [ ] Set up alerts for critical errors

### Documentation
- [ ] Update installation guide with download links
- [ ] Create troubleshooting guide
- [ ] Document API endpoints
- [ ] Create admin guide
- [ ] Update FAQ

### User Communication
- [ ] Send announcement to users
- [ ] Update website with download links
- [ ] Prepare support team
- [ ] Create video tutorials
- [ ] Set up feedback channels

## Rollback Plan

### API Rollback
1. Keep previous version backup
2. Database migration rollback script ready
3. PM2 commands:
   ```bash
   pm2 stop all
   # Restore previous version
   pm2 restart all
   ```

### Desktop App Rollback
1. Keep previous installers available
2. Disable auto-update if issues found
3. Communicate with users about reverting

## Validation Tests

### API Tests
- [ ] User registration and login
- [ ] Session creation and tracking
- [ ] Screenshot upload and retrieval
- [ ] Activity data syncing
- [ ] Dashboard data loading

### Desktop App Tests
- [ ] Installation on clean system
- [ ] First-time setup and login
- [ ] Session tracking functionality
- [ ] Screenshot capture
- [ ] Activity monitoring
- [ ] Auto-update check
- [ ] Data sync with API

## Performance Benchmarks

### API Performance
- [ ] Response time < 200ms for most endpoints
- [ ] Handle 100 concurrent users
- [ ] Database query optimization verified
- [ ] S3 upload < 2 seconds per screenshot

### Desktop App Performance
- [ ] CPU usage < 5% when idle
- [ ] Memory usage < 200MB
- [ ] Screenshot capture < 1 second
- [ ] Startup time < 5 seconds

## Security Checklist

- [ ] HTTPS enforced on all API endpoints
- [ ] JWT tokens expire appropriately
- [ ] SQL injection prevention tested
- [ ] XSS protection enabled
- [ ] Rate limiting configured
- [ ] Sensitive data encrypted
- [ ] Code signing verified
- [ ] Auto-update uses HTTPS

## Support Preparation

- [ ] Support email configured
- [ ] FAQ updated
- [ ] Known issues documented
- [ ] Support team trained
- [ ] Escalation process defined

## Legal & Compliance

- [ ] Terms of Service updated
- [ ] Privacy Policy reviewed
- [ ] GDPR compliance verified
- [ ] Data retention policies documented
- [ ] User consent mechanisms in place

## Final Checks

- [ ] Version numbers consistent across all components
- [ ] All environment variables documented
- [ ] Backup and restore procedures tested
- [ ] Monitoring and alerting operational
- [ ] Support channels active
- [ ] Documentation complete and accessible

---

## Sign-off

- [ ] Development Team Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Security Review: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] Operations Lead: _________________ Date: _______

## Notes

_Add any deployment-specific notes, issues encountered, or special configurations here:_

---

**Deployment Date**: _________________
**Version**: _________________
**Deployed By**: _________________