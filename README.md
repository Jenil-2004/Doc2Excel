# Document2Excel AI

> **Universal, Domain-Independent Bill, Invoice & Receipt to Excel Automation Web Application.**

Document2Excel AI extracts structured information from **any** document (construction bills, purchase invoices, medical bills, restaurant bills, hotel tariffs, utility statements, receipts, and handwritten bills) and maps the data dynamically into **any user-uploaded Excel template**, preserving the template's layout, styles, borders, fonts, formulas, and number formatting.

---

## Key Capabilities

1. **Universal & Domain-Independent**: Never assumes a rigid schema. Handles BOQ measurements, food orders, pharmacy items, hotel room nights, and general expenses with equal precision.
2. **Template-Driven Output**: Upload any `.xlsx` or `.xls` file. The engine automatically inspects sheet names, detects the header row, analyzes column names, and infers field types (currency, numbers, dates, text).
3. **Advanced Image Preprocessing & OCR**: Grayscale conversion, CLAHE contrast enhancement, bilateral edge-preserving denoising, deskewing, and Otsu thresholding before feeding to Tesseract OCR v5.5.
4. **Structured JSON Understanding**: Parses header metadata (Vendor, Invoice #, Date, GSTIN, Totals) and tabular line items (Items, Quantity, Unit, Rate, Amount).
5. **Intelligent Field Mapping**: Levenshtein distance, normalized semantic synonym dictionary, and fuzzy matching align Excel columns to document fields.
6. **Side-by-Side Human Review Screen**: Inspect the original document alongside editable fields. Interactive calculation checks flag mathematical discrepancies (e.g., $Qty \times Rate \neq Amount$).
7. **Excel Layout & Style Preservation**: Output is generated into a new file using OpenPyXL, copying borders, colors, fonts, column widths, and cell formatting directly from the base template.
8. **Interactive In-App Excel Preview**: Search, filter, edit cells, add rows, delete rows, and download the `.xlsx` file directly in the browser.
9. **Fully Self-Contained Environment**: Dedicated Python virtual environment (`backend/.venv/`) with isolated dependencies and project-local Node.js runtime (`frontend/portable_node/`)—no global installation required.

---

## Architecture Overview

```
                      ┌────────────────────────┐
                      │   Bill / Invoice Doc   │
                      │   (JPG / PNG / PDF)    │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │  Image Preprocessing   │
                      │  (CLAHE, Deskew, Otsu) │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │   OCR / Vision Model   │
                      │    (Tesseract 5.5)     │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │ Dynamic Structuring    │
                      │ (Header + Line Items)  │
                      └───────────┬────────────┘
                                  │
   ┌──────────────────────────────┴──────────────────────────────┐
   │                                                             │
   ▼                                                             ▼
┌───────────────────────┐                             ┌───────────────────────┐
│ Target Excel Template │                             │ Extracted JSON Data   │
│  Schema Detection     │                             │  + Validation Checks  │
└──────────┬────────────┘                             └──────────┬────────────┘
           │                                                     │
           └──────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │  Field Mapping Engine  │
                      │  (Synonyms & Matching) │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │ Human Review & Edit UI │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │ Excel Style Preserver  │
                      │   & Output Generator   │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │  Final Formatted Excel │
                      └────────────────────────┘
```

---

## Directory Structure

```
c:\CivilFileExcelOCR\
├── backend/
│   ├── app.py                     # Flask application entry point & CORS
│   ├── config.py                  # Environment and storage configuration
│   ├── requirements.txt           # Python dependency specification
│   ├── .venv/                     # Dedicated isolated Python virtual environment
│   ├── models/
│   │   ├── database.py            # SQLite schema initialization
│   │   └── schemas.py             # Pydantic validation models
│   ├── providers/
│   │   ├── base_provider.py       # DocumentExtractor abstract base class
│   │   └── tesseract_provider.py  # Image preprocessing & OCR pipeline
│   ├── routes/
│   │   ├── document_routes.py     # Document upload & fetch endpoints
│   │   ├── template_routes.py     # Excel template inspection endpoints
│   │   ├── job_routes.py          # Background processing job manager
│   │   └── excel_routes.py        # Excel generation & download endpoints
│   ├── services/
│   │   ├── template_service.py    # Excel header detection & typing
│   │   ├── extraction_service.py  # Classification, header, & line item parsing
│   │   ├── mapping_service.py     # Fuzzy & synonym field mapping
│   │   └── excel_service.py       # Template preservation & OpenPyXL export
│   ├── uploads/                   # Stored incoming documents and templates
│   ├── processing/                # Intermediate working files
│   └── output/                    # Generated final Excel workbooks
├── frontend/
│   ├── src/
│   │   ├── components/            # Sidebar, Stepper, Review, Uploader, ExcelPreview
│   │   ├── pages/                 # Dashboard, Upload, Review, Templates, History
│   │   ├── services/              # Axios API layer
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Client-side router
│   │   └── main.tsx               # Root DOM mounting
│   ├── portable_node/             # Project-local portable Node.js runtime
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── samples/                       # Sample construction & expense bills and templates
├── scripts/
│   ├── setup.bat                  # One-click Windows setup
│   ├── start.bat                  # One-click Windows runner
│   ├── setup.sh                   # Linux/macOS setup
│   └── start.sh                   # Linux/macOS runner
├── Dockerfile                     # Container definition
├── docker-compose.yml             # Full-stack container orchestration
└── README.md
```

---

## Quick Start (Two Methods)

### Method 1: Automatic Local Setup (Recommended - No Global Installs Required)

This repository includes a dedicated `.venv` and portable Node runtime.

#### Windows:
Double click or execute from terminal:
```cmd
scripts\start.bat
```
This automatically starts:
- Flask API on `http://127.0.0.1:5000`
- React Vite Frontend on `http://localhost:5173`
- Opens your default web browser to the Document2Excel AI Dashboard.

To verify dependencies and run the health check:
```cmd
scripts\setup.bat
```

#### Linux / macOS:
```bash
chmod +x scripts/*.sh
./scripts/setup.sh
./scripts/start.sh
```

---

### Method 2: Docker Environment

If you prefer running inside Docker containers:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## Verifying the End-to-End Extraction Pipeline

You can run our automated verification script anytime:
```cmd
backend\.venv\Scripts\python.exe backend\test_e2e.py
```
This script validates:
1. Inspection of `samples\Civil_Construction_Template.xlsx`
2. OCR & layout analysis on `samples\sample_construction_bill.png`
3. Extraction of vendor, invoice number, date, and line item tables
4. Automatic column alignment into the template schema
5. Generation of `backend\output\Test_Generated_Civil_Bill.xlsx` with preserved formatting and formulas.

---

## Adding New OCR / AI Providers

The system uses an abstract provider pattern defined in `backend/providers/base_provider.py`:

```python
class DocumentExtractor(ABC):
    @abstractmethod
    def extract_text_and_layout(self, file_path: str) -> Dict[str, Any]:
        """Returns raw_text, confidence, lines, and blocks"""
        pass
```

To add Gemini Vision, Azure Document Intelligence, or OpenAI Vision:
1. Create `backend/providers/gemini_provider.py` inheriting from `DocumentExtractor`.
2. Implement `extract_text_and_layout`.
3. Set `EXTRACTION_PROVIDER=gemini` in your `.env`.
