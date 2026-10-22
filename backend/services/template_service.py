import openpyxl
from openpyxl.utils import get_column_letter
from typing import Dict, Any, List, Tuple
from models.schemas import TemplateSchema, FieldSchema
import re

class TemplateService:
    @staticmethod
    def inspect_template(filepath: str, template_id: str, filename: str) -> TemplateSchema:
        """
        Inspect uploaded Excel template to detect:
        - Sheet names
        - Best header row (detecting text density & column headers)
        - Column names
        - Inferred field types (date, number, currency, text)
        """
        wb = openpyxl.load_workbook(filepath, data_only=True)
        sheet_names = wb.sheetnames
        selected_sheet = sheet_names[0]
        sheet = wb[selected_sheet]

        header_row, fields = TemplateService._detect_headers_and_types(sheet)

        return TemplateSchema(
            template_id=template_id,
            filename=filename,
            sheet_names=sheet_names,
            selected_sheet=selected_sheet,
            header_row=header_row,
            fields=fields
        )

    @staticmethod
    def _detect_headers_and_types(sheet) -> Tuple[int, List[FieldSchema]]:
        """
        Intelligently scan rows 1 through 10 to find the most probable header row:
        Criteria:
        - Row with highest count of non-empty text strings
        - Doesn't consist purely of single title cell
        """
        best_row = 1
        max_string_cols = 0
        row_fields_map = {}

        for r in range(1, min(sheet.max_row + 1, 15)):
            row_cells = [cell for cell in sheet[r]]
            string_cells = []
            
            for c_idx, cell in enumerate(row_cells, start=1):
                val = cell.value
                if val is not None and str(val).strip():
                    string_cells.append((c_idx, str(val).strip()))
            
            if len(string_cells) > max_string_cols:
                # If row only has 1 cell merged across, it might be a Title banner
                if len(string_cells) == 1 and sheet.max_column > 2:
                    continue
                max_string_cols = len(string_cells)
                best_row = r

        # Extract fields from the best header row
        fields: List[FieldSchema] = []
        for cell in sheet[best_row]:
            val = cell.value
            if val is not None and str(val).strip():
                clean_name = str(val).strip()
                inferred_type = TemplateService._infer_type_from_header(clean_name)
                
                # Sample subsequent data rows if present
                samples = []
                for sample_r in range(best_row + 1, min(best_row + 4, sheet.max_row + 1)):
                    s_cell_val = sheet.cell(row=sample_r, column=cell.column).value
                    if s_cell_val is not None and str(s_cell_val).strip():
                        samples.append(str(s_cell_val).strip())
                
                fields.append(FieldSchema(
                    name=clean_name,
                    type=inferred_type,
                    sample_values=samples,
                    required=False
                ))

        # Fallback if no header found
        if not fields:
            for col_idx in range(1, 6):
                fields.append(FieldSchema(
                    name=f"Column {get_column_letter(col_idx)}",
                    type="text"
                ))

        return best_row, fields

    @staticmethod
    def _infer_type_from_header(name: str) -> str:
        name_lower = name.lower()
        if any(k in name_lower for k in ["date", "time", "day", "dt"]):
            return "date"
        if any(k in name_lower for k in ["amount", "price", "rate", "cost", "total", "subtotal", "gst", "tax", "vat", "net", "discount"]):
            return "currency"
        if any(k in name_lower for k in ["qty", "quantity", "count", "nights", "hours", "units", "batch"]):
            return "number"
        return "text"
