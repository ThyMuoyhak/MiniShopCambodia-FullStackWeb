@echo off
REM Start the shop owner dashboard on port 3002
cd /d "%~dp0"
if not exist node_modules\react-scripts (
  echo Installing dependencies...
  call npm install
)
npm start
