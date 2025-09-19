@echo off
REM Cross-platform build script for Windows
echo Building for all platforms...

REM Clean previous builds
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
if exist out rmdir /s /q out

REM Build the application
call npm run build

REM Build for Windows
echo Building for Windows...
call npm run dist:win

REM Optionally build for other platforms if on Windows with appropriate tools
REM call npm run dist:mac
REM call npm run dist:linux

echo Build complete!