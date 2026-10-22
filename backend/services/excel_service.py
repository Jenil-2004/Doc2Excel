import os
import openpyxl
from copy import copy
from typing import List, Dict, Any
from datetime import datetime
from config import Config

class ExcelService:
    """
    Excel Generation & Template Preservation Engine:
    - Loads uploaded template workbook
    - Preserves styles, fonts, borders, alignments, formulas, number formats, column widths
    - Inserts mapped rows dynamically
    - Emits downloadable final Excel file
    """

    @staticmethod
    def generate_excel(
        template_path: str,
        output_filename: str,
        header_row: int,
        mappings: List[Dict[str, Any]],
        documents_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        wb = openpyxl.load_workbook(template_path)
        sheet = wb.active

        # Identify column indices for each mapped Excel field
        col_map = {}
        for cell in sheet[header_row]:
            if cell.value is not None:
                header_text = str(cell.value).strip()
                col_map[header_text] = cell.column

        # Read template styles from header or sample row below header
        style_sample_row = header_row + 1 if sheet.max_row > header_row else header_row

        cell_styles = {}
        for col_name, col_idx in col_map.items():
            sample_cell = sheet.cell(row=style_sample_row, column=col_idx)
            cell_styles[col_idx] = {
                "font": copy(sample_cell.font) if sample_cell.font else None,
                "border": copy(sample_cell.border) if sample_cell.border else None,
                "fill": copy(sample_cell.fill) if sample_cell.fill else None,
                "alignment": copy(sample_cell.alignment) if sample_cell.alignment else None,
                "number_format": sample_cell.number_format
            }

        # Check if there are template footer rows below header (e.g. Average Strength, Reviewed by, Signatures)
        footer_start_row = None
        for r in range(header_row + 1, sheet.max_row + 1):
            cell_texts = [str(c.value).strip().lower() for c in sheet[r] if c.value is not None and str(c.value).strip()]
            if any(any(k in txt for k in ["average", "reviewed", "lab tech", "entered by", "signature", "authorized"]) for txt in cell_texts):
                footer_start_row = r
                break

        # Only clear sample rows if no footer exists below header
        if footer_start_row is None and sheet.max_row > header_row:
            sheet.delete_rows(header_row + 1, sheet.max_row - header_row)

        current_row = header_row + 1
        generated_rows = []

        # Map each document's items
        for doc in documents_data:
            doc_id = doc.get("document_id", "")
            filename = doc.get("filename", "")
            header = doc.get("header", {})
            items = doc.get("line_items", [])

            if not items:
                # If no line items, create single row from header
                items = [{}]

            for item in items:
                row_dict = {}
                row_dict["_source_document_id"] = doc_id
                row_dict["_source_filename"] = filename

                for m in mappings:
                    excel_field = m.get("excel_field")
                    extracted_field = m.get("extracted_field")
                    col_idx = col_map.get(excel_field)

                    if not col_idx or extracted_field == "none":
                        continue

                    val = None
                    if extracted_field in item:
                        val = item.get(extracted_field)
                    elif extracted_field in header:
                        val = header.get(extracted_field)
                    elif extracted_field == "source_filename":
                        val = filename

                    row_dict[excel_field] = val
                    target_cell = sheet.cell(row=current_row, column=col_idx, value=val)

                    # Apply template style preservation
                    if col_idx in cell_styles:
                        style = cell_styles[col_idx]
                        if style["font"]: target_cell.font = style["font"]
                        if style["border"]: target_cell.border = style["border"]
                        if style["alignment"]: target_cell.alignment = style["alignment"]
                        if style["number_format"]: target_cell.number_format = style["number_format"]

                generated_rows.append(row_dict)
                current_row += 1

        output_path = Config.OUTPUT_FOLDER / output_filename
        wb.save(output_path)

        return {
            "output_path": str(output_path),
            "filename": output_filename,
            "row_count": len(generated_rows),
            "preview_data": generated_rows
        }
