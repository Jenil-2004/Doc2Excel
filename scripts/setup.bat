@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     Document2Excel AI - Setup & Environment Check
echo ===================================================

cd /d "%~dp0\.."
set PROJECT_ROOT=%CD%

echo [1/5] Checking Python Virtual Environment...
if not exist "backend\.venv\Scripts\python.exe" (
    echo Creating Python virtual environment using uv...
    if exist "C:\Users\sit353\.local\bin\uv.exe" (
        "C:\Users\sit353\.local\bin\uv.exe" venv backend\.venv --python 3.12
    ) else (
        echo [ERROR] uv is required to initialize isolated Python.
        pause
        exit /b 1
    )
)
echo Python venv: OK (backend\.venv)

echo [2/5] Checking Backend Python Dependencies...
"backend\.venv\Scripts\python.exe" -c "import flask, openpyxl, pandas, cv2, PIL, pytesseract; print('All Python dependencies verified!')" 2>nul
if errorlevel 1 (
    echo Installing backend dependencies into isolated .venv...
    if exist "C:\Users\sit353\.local\bin\uv.exe" (
        "C:\Users\sit353\.local\bin\uv.exe" pip install --python backend\.venv\Scripts\python.exe -r backend\requirements.txt
    ) else (
        "backend\.venv\Scripts\pip.exe" install -r backend\requirements.txt
    )
)
echo Backend Dependencies: OK

echo [3/5] Checking Frontend Node.js Runtime...
if exist "frontend\portable_node\node.exe" (
    set "PATH=%PROJECT_ROOT%\frontend\portable_node;%PATH%"
    echo Portable Node.js: OK
) else (
    where node >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Node.js is not present in frontend\portable_node or system PATH.
        pause
        exit /b 1
    )
)

echo [4/5] Checking Frontend Dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend packages...
    cd frontend
    call npm install
    cd ..
)
echo Frontend Dependencies: OK

echo [5/5] Checking OCR Engine...
if exist "C:\Users\sit353\AppData\Local\Tesseract-OCR\tesseract.exe" (
    echo Tesseract OCR Engine: OK (C:\Users\sit353\AppData\Local\Tesseract-OCR\tesseract.exe)
) else (
    echo [WARNING] Tesseract not found at default location. Will fallback to native PDF and text extraction.
)

echo.
echo ===================================================
echo  Document2Excel AI is ready! Run start.bat to launch
echo ===================================================
pause
