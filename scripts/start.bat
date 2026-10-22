@echo off
setlocal

cd /d "%~dp0\.."
set PROJECT_ROOT=%CD%

if exist "frontend\portable_node\node.exe" (
    set "PATH=%PROJECT_ROOT%\frontend\portable_node;%PATH%"
)

echo ===================================================
echo     Starting Document2Excel AI Platform
echo ===================================================

echo Starting Flask Backend on http://127.0.0.1:5000 ...
start "Doc2Excel-Backend" /min cmd /c "cd /d %PROJECT_ROOT%\backend && .venv\Scripts\python.exe app.py"

timeout /t 2 /nobreak >nul

echo Starting Vite React Frontend on http://localhost:5173 ...
start "Doc2Excel-Frontend" /min cmd /c "cd /d %PROJECT_ROOT%\frontend && npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo Opening Document2Excel AI in browser...
start http://localhost:5173

echo.
echo Application is active!
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://localhost:5173
echo.
