import os
import json
import time
from services.template_service import TemplateService
from providers.tesseract_provider import TesseractExtractor
from services.extraction_service import ExtractionService
from services.mapping_service import MappingService
from services.excel_service import ExcelService

def test_full_flow():
    print("========================================")
    print("  Testing End-to-End Extraction Flow   ")
    print("========================================")

    sample_img = r"c:\CivilFileExcelOCR\samples\sample_construction_bill.png"
    sample_template = r"c:\CivilFileExcelOCR\samples\Civil_Construction_Template.xlsx"

    # 1. Inspect Template
    print("\n[Step 1] Inspecting Excel Template...")
    schema = TemplateService.inspect_template(sample_template, "TMPL-001", "Civil_Construction_Template.xlsx")
    print(f"Detected Sheet: {schema.selected_sheet}")
    print(f"Detected Header Row: #{schema.header_row}")
    col_names = [f.name for f in schema.fields]
    print(f"Detected Columns: {col_names}")

    # 2. OCR Preprocessing & Extraction
    print("\n[Step 2] Performing OCR & Layout analysis...")
    extractor = TesseractExtractor()
    ocr_result = extractor.extract_text_and_layout(sample_img)
    print(f"OCR Confidence: {ocr_result['confidence']}%")
    print(f"Total Lines Extracted: {len(ocr_result['lines'])}")

    # 3. Dynamic Structured Document Understanding
    print("\n[Step 3] Classifying Document & Structuring Data...")
    structured = ExtractionService.extract_structured_data(
        raw_text=ocr_result["raw_text"],
        lines=ocr_result["lines"]
    )
    print(f"Detected Document Type: {structured['document_type']}")
    print(f"Extracted Header: {structured['header']}")
    print(f"Extracted Line Items Count: {len(structured['line_items'])}")
    for item in structured['line_items']:
        print(f"  - {item}")

    # 4. Automatic Field Mapping
    print("\n[Step 4] Auto-mapping Excel columns to extracted fields...")
    mappings = MappingService.auto_map_fields(col_names, {})
    for m in mappings:
        print(f"  {m.excel_field:15} -> {m.extracted_field:15} (Confidence: {m.confidence})")

    # 5. Generate Excel
    print("\n[Step 5] Generating Output Excel Workbook...")
    output_filename = "Test_Generated_Civil_Bill.xlsx"
    gen_result = ExcelService.generate_excel(
        template_path=sample_template,
        output_filename=output_filename,
        header_row=schema.header_row,
        mappings=[m.model_dump() for m in mappings],
        documents_data=[{
            "document_id": "DOC-TEST-1",
            "filename": "sample_construction_bill.png",
            "header": structured["header"],
            "line_items": structured["line_items"]
        }]
    )

    print(f"Successfully generated: {gen_result['output_path']}")
    print(f"Rows Written: {gen_result['row_count']}")
    print("\nPreview of Written Rows:")
    for row in gen_result["preview_data"]:
        print(" ", row)

    print("\n[SUCCESS] Entire workflow validated successfully!")

if __name__ == "__main__":
    test_full_flow()
