@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo QuickSave needs Node.js 20 or newer.
  echo Install it from https://nodejs.org then run start.bat again.
  echo.
  pause
  exit /b 1
)

echo Installing dependencies ^(first run can take a minute^)...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo Starting QuickSave...
call npm start
if errorlevel 1 (
  echo QuickSave exited with an error.
  pause
  exit /b 1
)
