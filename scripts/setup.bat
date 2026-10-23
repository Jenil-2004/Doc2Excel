@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0\.."
set "PROJECT_ROOT=%CD%"

echo ===================================================
echo     Document2Excel AI - Setup ^& Environment Check
echo ===================================================

:: 0. Generate .env from .env.example if missing
if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env configuration from .env.example...
        copy /y ".env.example" ".env" >nul
    )
)

:: 1. Discover or acquire Python
echo [1/5] Checking Python Environment...

if exist "backend\.venv\Scripts\python.exe" (
    echo Virtual environment already exists: backend\.venv
    goto :python_ready
)

echo Creating virtual environment for backend...

:: Check if uv is available
where uv.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using uv to create Python virtual environment...
    uv venv backend\.venv --python 3.12
    if exist "backend\.venv\Scripts\python.exe" goto :python_ready
)

:: Check if py launcher is available
where py.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using Python launcher...
    py -3.12 -m venv backend\.venv 2>nul
    if exist "backend\.venv\Scripts\python.exe" goto :python_ready
    py -3 -m venv backend\.venv 2>nul
    if exist "backend\.venv\Scripts\python.exe" goto :python_ready
)

:: Check if python is available
where python.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using system python...
    python -m venv backend\.venv 2>nul
    if exist "backend\.venv\Scripts\python.exe" goto :python_ready
)

:: Fallback bootstrap with uv
echo [NOTICE] Standard Python not detected or venv failed. Downloading uv runtime...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex" 2>nul
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
uv venv backend\.venv --python 3.12

if not exist "backend\.venv\Scripts\python.exe" (
    echo [ERROR] Failed to set up Python virtual environment.
    echo Please install Python 3.10+ from python.org or uv, then rerun setup.bat.
    pause
    exit /b 1
)

:python_ready
echo Python Virtual Environment: OK

:: 2. Install backend Python dependencies
echo [2/5] Checking Backend Python Dependencies...
backend\.venv\Scripts\python.exe -c "import flask, openpyxl, pandas, cv2, PIL, pytesseract; print('All Python dependencies verified!')" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing backend dependencies into backend\.venv...
    where uv.exe >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        uv pip install --python backend\.venv\Scripts\python.exe -r backend\requirements.txt
    ) else (
        backend\.venv\Scripts\python.exe -m pip install --upgrade pip
        backend\.venv\Scripts\pip.exe install -r backend\requirements.txt
    )
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Backend dependency installation failed.
        pause
        exit /b 1
    )
)
echo Backend Dependencies: OK

:: 3. Check and Setup Node.js Runtime
echo [3/5] Checking Node.js Runtime...
set "HAS_NODE=0"
if exist "frontend\portable_node\node.exe" (
    set "NODE_DIR=%PROJECT_ROOT%\frontend\portable_node"
    set "PATH=%PROJECT_ROOT%\frontend\portable_node;%PATH%"
    set "HAS_NODE=1"
    echo Portable Node.js detected: OK
) else (
    where node.exe >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        where npm.cmd >nul 2>nul
        if %ERRORLEVEL% EQU 0 (
            set "HAS_NODE=1"
            echo System Node.js and npm: OK
        )
    )
)

if "%HAS_NODE%"=="0" (
    echo [INFO] Node.js not detected on system.
    echo Downloading portable Node.js LTS for zero-install experience...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Write-Host 'Fetching portable Node.js v20.18.0...'; $zip = Join-Path $env:TEMP 'node.zip'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip' -OutFile $zip; Write-Host 'Extracting portable Node.js...'; Expand-Archive -Path $zip -DestinationPath $env:TEMP\node_extract -Force; New-Item -ItemType Directory -Force -Path 'frontend\portable_node' | Out-Null; Copy-Item -Path \"$env:TEMP\node_extract\node-v20.18.0-win-x64\*\" -Destination 'frontend\portable_node' -Recurse -Force; Remove-Item -Path $zip, \"$env:TEMP\node_extract\" -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Portable Node.js installed successfully!';"
    
    if exist "frontend\portable_node\node.exe" (
        set "NODE_DIR=%PROJECT_ROOT%\frontend\portable_node"
        set "PATH=%PROJECT_ROOT%\frontend\portable_node;%PATH%"
        set "HAS_NODE=1"
        echo Portable Node.js setup completed: OK
    ) else (
        echo [ERROR] Could not install Node.js automatically.
        echo Please download and install Node.js LTS from https://nodejs.org/
        pause
        exit /b 1
    )
)

:: 4. Install Frontend Dependencies
echo [4/5] Checking Frontend Dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend packages with npm...
    cd /d "%PROJECT_ROOT%\frontend"
    if exist "portable_node\nodevars.bat" (
        call portable_node\nodevars.bat && npm install
    ) else (
        call npm install
    )
    if %ERRORLEVEL% NEQ 0 (
        cd /d "%PROJECT_ROOT%"
        echo [ERROR] Frontend dependency installation failed.
        pause
        exit /b 1
    )
    cd /d "%PROJECT_ROOT%"
)
echo Frontend Dependencies: OK

:: 5. Checking OCR Engine (Tesseract)
echo [5/5] Checking OCR Engine (Tesseract)...
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    set "PATH=C:\Program Files\Tesseract-OCR;%PATH%"
)
if exist "%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe" (
    set "PATH=%LOCALAPPDATA%\Tesseract-OCR;%PATH%"
)
if exist "%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Tesseract-OCR;%PATH%"
)

where tesseract.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Tesseract OCR Engine: OK
) else (
    echo [NOTICE] Tesseract OCR not found in standard paths.
    echo If you need local OCR without Gemini AI, you can install Tesseract from:
    echo https://github.com/UB-Mannheim/tesseract/wiki
)

echo.
echo ===================================================
echo   Setup Complete! Everything is ready.
echo   You can now launch the app anytime using start.bat
echo ===================================================
echo.
