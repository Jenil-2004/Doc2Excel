@echo off
setlocal

cd /d "%~dp0\.."
set "PROJECT_ROOT=%CD%"

title Document2Excel Platform

echo ===================================================
echo     Starting Document2Excel AI Platform
echo ===================================================

:: 1. Ensure backend virtual environment exists
if not exist "backend\.venv\Scripts\python.exe" (
    echo [INFO] Python virtual environment not found. Running setup.bat first...
    call "%PROJECT_ROOT%\scripts\setup.bat"
    if errorlevel 1 goto :halt
)

:: 2. Ensure frontend packages exist
if not exist "frontend\node_modules" (
    echo [INFO] Frontend packages not found. Running setup.bat first...
    call "%PROJECT_ROOT%\scripts\setup.bat"
    if errorlevel 1 goto :halt
)

:: 3. Configure Node.js environment
if exist "%PROJECT_ROOT%\frontend\portable_node\nodevars.bat" (
    set "USE_PORTABLE_NODE=1"
) else (
    set "USE_PORTABLE_NODE=0"
)

:: 4. Start Flask Backend in its own window
echo [1/2] Starting Flask Backend on http://127.0.0.1:5000 ...
start "Doc2Excel-Backend" cmd /k "title Doc2Excel Backend && cd /d "%PROJECT_ROOT%\backend" && .venv\Scripts\python.exe app.py"

ping 127.0.0.1 -n 3 >nul

:: 5. Start Vite React Frontend in its own window
echo [2/2] Starting Vite React Frontend on http://127.0.0.1:5173 ...
if "%USE_PORTABLE_NODE%"=="1" (
    start "Doc2Excel-Frontend" cmd /k "title Doc2Excel Frontend && call "%PROJECT_ROOT%\frontend\portable_node\nodevars.bat" && cd /d "%PROJECT_ROOT%\frontend" && node_modules\.bin\vite.cmd --host 127.0.0.1 --port 5173"
) else (
    start "Doc2Excel-Frontend" cmd /k "title Doc2Excel Frontend && cd /d "%PROJECT_ROOT%\frontend" && npx --no-install vite --host 127.0.0.1 --port 5173"
)

ping 127.0.0.1 -n 4 >nul

:: 6. Launch Browser
echo Opening Document2Excel AI in browser...
start http://127.0.0.1:5173

echo.
echo ===================================================
echo   Document2Excel AI is running!
echo   - Backend:  http://127.0.0.1:5000
echo   - Frontend: http://127.0.0.1:5173
echo ===================================================
echo.
echo Note: Both backend and frontend consoles are running in the background.
echo Closing this launcher window will NOT terminate the application.
echo.
pause
exit /b 0

:halt
echo.
echo [ERROR] Application could not start. Please check the messages above.
echo.
pause
exit /b 1
