@echo off
REM Start the Mini Shop Platform Backend API on port 8000
REM Requires Python 3.11 (pydantic-core needs prebuilt wheels)
cd /d "%~dp0"
if not exist venv\Scripts\python.exe (
  echo Creating virtual environment with Python 3.11...
  where python3.11 >nul 2>nul
  if %errorlevel%==0 (
    python3.11 -m venv venv
  ) else (
    python -m venv venv
  )
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
python generate_demo_images.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
