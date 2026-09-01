@echo off
REM Start the admin panel on port 3001
cd /d "%~dp0"
if not exist node_modules\react-scripts (
  echo Installing dependencies...
  call npm install
)
npm start
