@echo off
REM Start the public storefront on port 3000
cd /d "%~dp0"
if not exist node_modules\react-scripts (
  echo Installing dependencies...
  call npm install
)
npm start
