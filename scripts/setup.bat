@echo off
setlocal

echo ===================================================
echo     Document2Excel AI - Setup ^& Environment Check
echo ===================================================

cd /d "%~dp0\.."
set PROJECT_ROOT=%CD%

echo [1/5] Checking Python Virtual Environment...
if not exist "backend\.venv\Scripts\python.exe" (
    where uv.exe >nul 2>nul
    if not errorlevel 1 (
        echo Creating Python virtual environment using uv...
        uv venv backend\.venv --python 3.12
    ) else (
        echo Creating Python virtual environment using the Python launcher...
        py -3.12 -m venv backend\.venv
    )
    if errorlevel 1 (
        echo [ERROR] Could not create the Python 3.12 virtual environment. Install Python 3.12 or uv and retry.
        pause
        exit /b 1
    )
)
echo Python venv: OK (backend\.venv)

echo [2/5] Checking Backend Python Dependencies...
"backend\.venv\Scripts\python.exe" -c "import flask, openpyxl, pandas, cv2, PIL, pytesseract; print('All Python dependencies verified!')" 2>nul
if errorlevel 1 (
    echo Installing backend dependencies into isolated .venv...
    where uv.exe >nul 2>nul
    if not errorlevel 1 (
        uv pip install --python backend\.venv\Scripts\python.exe -r backend\requirements.txt
    ) else (
        "backend\.venv\Scripts\pip.exe" install -r backend\requirements.txt
    )
    if errorlevel 1 (
        echo [ERROR] Backend dependency installation failed.
        pause
        exit /b 1
    )
)
echo Backend Dependencies: OK

echo [3/5] Checking Frontend Node.js Runtime...
if exist "frontend\portable_node\node.exe" (
    set "PATH=%PROJECT_ROOT%\frontend\portable_node;%PATH%"
    echo Portable Node.js: OK
) else (
    where node.exe >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Node.js is missing. Install Node.js LTS and ensure node.exe and npm.cmd are on PATH.
        pause
        exit /b 1
    )
    where npm.cmd >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] npm.cmd is missing. Repair or reinstall Node.js LTS, then retry.
        pause
        exit /b 1
    )
    echo System Node.js: OK
)

echo [4/5] Checking Frontend Dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend packages...
    cd frontend
    call npm install
    if errorlevel 1 (
        cd ..
        echo [ERROR] Frontend dependency installation failed.
        pause
        exit /b 1
    )
    cd ..
)
echo Frontend Dependencies: OK

echo [5/5] Checking OCR Engine...
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    set "PATH=C:\Program Files\Tesseract-OCR;%PATH%"
)
if exist "%LOCALAPPDATA%\Tesseract-OCR\tessdata\eng.traineddata" (
    set "TESSDATA_PREFIX=%LOCALAPPDATA%\Tesseract-OCR\tessdata"
)
where tesseract.exe >nul 2>nul
if not errorlevel 1 (
    tesseract.exe --list-langs 2>nul | findstr /i /x "eng" >nul
    if errorlevel 1 (
        echo [WARNING] Tesseract is installed but English language data was not found.
    ) else (
        echo Tesseract OCR Engine and English language data: OK
    )
) else (
    echo [WARNING] Tesseract was not found on PATH. OCR features may be unavailable.
)

echo.
echo ===================================================
echo  Document2Excel AI is ready! Run start.bat to launch
echo ===================================================
pause
