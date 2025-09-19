# PowerShell script to install Python on Windows

Write-Host "🐍 Python Auto-Installer for Windows" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if Python is already installed
$pythonVersion = python --version 2>$null
if ($pythonVersion -match "Python 3\.(9|1[0-9])") {
    Write-Host "✅ Python is already installed: $pythonVersion" -ForegroundColor Green
    exit 0
}

Write-Host "📥 Downloading Python 3.12.8..." -ForegroundColor Yellow

# Python 3.12.8 direct download URL
$pythonUrl = "https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe"
$installerPath = "$env:TEMP\python-installer.exe"

try {
    # Download Python installer
    Invoke-WebRequest -Uri $pythonUrl -OutFile $installerPath -UseBasicParsing

    Write-Host "📦 Installing Python (this may take a few minutes)..." -ForegroundColor Yellow

    # Silent install with all options
    # /quiet - Silent install
    # InstallAllUsers=1 - Install for all users
    # PrependPath=1 - Add to PATH
    # Include_test=0 - Don't include test suite
    # Include_pip=1 - Include pip
    # Include_dev=1 - Include development headers (needed for node-gyp)

    Start-Process -FilePath $installerPath -ArgumentList @(
        "/quiet",
        "InstallAllUsers=1",
        "PrependPath=1",
        "Include_test=0",
        "Include_pip=1",
        "Include_dev=1"
    ) -Wait

    # Clean up installer
    Remove-Item $installerPath -Force

    Write-Host "`n✅ Python installed successfully!" -ForegroundColor Green
    Write-Host "📝 Python has been added to PATH" -ForegroundColor Cyan
    Write-Host "`n⚠️  Please restart your terminal for PATH changes to take effect" -ForegroundColor Yellow

} catch {
    Write-Host "`n❌ Failed to install Python automatically" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nPlease install Python manually from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}