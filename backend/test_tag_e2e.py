from config import Config
from services.template_service import TemplateService
from providers.gemini_provider import GeminiExtractor
from services.mapping_service import MappingService
from services.excel_service import ExcelService

def test_tag_flow():
    print("========================================")
    print("  Testing Universal Tag Extraction Flow ")
    print("========================================")

    project_root = Config.BASE_DIR.parent
    sample_img = str(project_root / "samples" / "sample_tag_document.jpg")
    sample_template = str(project_root / "samples" / "Universal_Engineering_Tag_Template.xlsx")

    # 1. Inspect Template
    print("\n[Step 1] Inspecting Excel Template...")
    schema = TemplateService.inspect_template(sample_template, "TMPL-TAG-1", "Universal_Engineering_Tag_Template.xlsx")
    print(f"Detected Sheet: {schema.selected_sheet}")
    print(f"Detected Header Row: #{schema.header_row}")
    col_names = [f.name for f in schema.fields]
    print(f"Detected Columns: {col_names}")

    # 2. Vision Extraction
    print("\n[Step 2] Performing Vision Extraction...")
    extractor = GeminiExtractor()
    extracted = extractor.extract_text_and_layout(sample_img)
    structured = extracted["structured"]
    print(f"Detected Document Type: {structured['document_type']}")
    print(f"Extracted Header: {structured['header']}")
    print(f"Extracted Line Items Count: {len(structured['line_items'])}")
    for item in structured['line_items']:
        print("  -", item)

    # 3. Auto-mapping
    print("\n[Step 3] Auto-mapping columns...")
    mappings = MappingService.auto_map_fields(col_names, {})
    for m in mappings:
        print(f"  {m.excel_field:25} -> {m.extracted_field:25} (Confidence: {m.confidence})")

    # 4. Generate Excel
    print("\n[Step 4] Generating Excel Output...")
    output_filename = "Generated_Universal_Engineering_Tag_Report.xlsx"
    gen_result = ExcelService.generate_excel(
        template_path=sample_template,
        output_filename=output_filename,
        header_row=schema.header_row,
        mappings=[m.model_dump() for m in mappings],
        documents_data=[{
            "document_id": "DOC-TAG-1",
            "filename": "sample_tag_document.jpg",
            "header": structured["header"],
            "line_items": structured["line_items"]
        }]
    )
    print(f"Output generated at: {gen_result['output_path']}")
    print(f"Rows Written: {gen_result['row_count']}")
    for r in gen_result["preview_data"]:
        print(" ", r)

    print("\n[SUCCESS] Universal Engineering Concrete Test Flow Complete!")

if __name__ == "__main__":
    test_tag_flow()
