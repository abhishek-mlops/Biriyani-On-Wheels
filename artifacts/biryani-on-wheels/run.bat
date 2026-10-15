@echo off
cd /d "%~dp0"
set PYTHONUTF8=1
if exist "venv\Scripts\python.exe" (
  echo Starting server... Open http://127.0.0.1:5000 in your browser.
  echo Press Ctrl+C here to stop the server.
  "venv\Scripts\python.exe" app.py
) else (
  echo Virtual env not found. Run once:
  echo   python -m venv venv
  echo   venv\Scripts\python -m pip install -r requirements.txt
  pause
)
