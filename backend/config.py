import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

import tempfile

BASE_DIR = Path(__file__).resolve().parent

# Ensure all temporary operations use drive D: instead of full C: drive
TEMP_FOLDER = BASE_DIR / "temp"
TEMP_FOLDER.mkdir(parents=True, exist_ok=True)
os.environ["TEMP"] = str(TEMP_FOLDER)
os.environ["TMP"] = str(TEMP_FOLDER)
tempfile.tempdir = str(TEMP_FOLDER)

load_dotenv(BASE_DIR.parent / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "doc2excel-secret-key-2026")
    BASE_DIR = BASE_DIR
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    PROCESSING_FOLDER = BASE_DIR / "processing"
    OUTPUT_FOLDER = BASE_DIR / "output"
    TEMP_FOLDER = TEMP_FOLDER
    DATABASE_PATH = BASE_DIR / "data.db"
    
    _tesseract_candidates = (
        os.getenv("TESSERACT_CMD"),
        shutil.which("tesseract"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        str(Path(os.getenv("LOCALAPPDATA", "")) / "Programs/Tesseract-OCR/tesseract.exe"),
    )
    TESSERACT_CMD = next(
        (path for path in _tesseract_candidates if path and Path(path).is_file()),
        "tesseract",
    )
    if Path(TESSERACT_CMD).is_file():
        _tesseract_dir = str(Path(TESSERACT_CMD).parent)
        os.environ["PATH"] = _tesseract_dir + os.pathsep + os.environ.get("PATH", "")

    _user_tessdata = Path(os.getenv("LOCALAPPDATA", "")) / "Tesseract-OCR" / "tessdata"
    if (_user_tessdata / "eng.traineddata").is_file():
        os.environ.setdefault("TESSDATA_PREFIX", str(_user_tessdata))
    
    ALLOWED_DOC_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    ALLOWED_TEMPLATE_EXTENSIONS = {".xlsx", ".xls"}
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB

    # Gemini / External AI credentials if user configures
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    EXTRACTION_PROVIDER = os.getenv("EXTRACTION_PROVIDER", "hybrid")  # hybrid, tesseract, gemini

for folder in [Config.UPLOAD_FOLDER, Config.PROCESSING_FOLDER, Config.OUTPUT_FOLDER]:
    folder.mkdir(parents=True, exist_ok=True)
