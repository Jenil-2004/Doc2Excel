import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR.parent / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "doc2excel-secret-key-2026")
    BASE_DIR = BASE_DIR
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    PROCESSING_FOLDER = BASE_DIR / "processing"
    OUTPUT_FOLDER = BASE_DIR / "output"
    DATABASE_PATH = BASE_DIR / "data.db"
    
    TESSERACT_CMD = os.getenv(
        "TESSERACT_CMD", 
        r"C:\Users\sit353\AppData\Local\Tesseract-OCR\tesseract.exe"
    )
    
    ALLOWED_DOC_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    ALLOWED_TEMPLATE_EXTENSIONS = {".xlsx", ".xls"}
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32MB

    # Gemini / External AI credentials if user configures
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    EXTRACTION_PROVIDER = os.getenv("EXTRACTION_PROVIDER", "hybrid")  # hybrid, tesseract, gemini

for folder in [Config.UPLOAD_FOLDER, Config.PROCESSING_FOLDER, Config.OUTPUT_FOLDER]:
    folder.mkdir(parents=True, exist_ok=True)
