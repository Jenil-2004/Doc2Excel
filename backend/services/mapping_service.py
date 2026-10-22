import re
from rapidfuzz import fuzz
from typing import List, Dict, Any
from models.schemas import FieldMappingItem

class MappingService:
    """
    Intelligent field mapping engine:
    Maps arbitrary Excel template columns to extracted document fields (Header or Line Items).
    Employs:
    - Exact match
    - Case-insensitive & normalized match
    - Semantic synonyms & aliases dictionary
    - Fuzzy string distance (Levenshtein)
    """

    FIELD_SYNONYMS = {
        # Line item fields (General & Invoices)
        "description": ["item name", "item", "description", "product", "particulars", "service", "medicine", "material", "work description", "room", "details"],
        "quantity": ["qty", "quantity", "count", "units", "nights", "days", "hours", "nos", "volume"],
        "unit": ["unit", "uom", "measuring unit", "unit of measure"],
        "rate": ["unit price", "rate", "price", "cost", "unit rate", "tariff", "item rate"],
        "amount": ["total amount", "line total", "item total", "net rate", "total price", "val", "cost amount", "amount", "total"],

        # Concrete / Cylinder Test Line item fields
        "sample_no": ["sample no", "sample no.", "sample #", "sample", "cylinder #", "specimen #", "item no", "sl no", "sr no", "#"],
        "cast_date": ["cast date", "date casted", "casting date", "date made", "cast dt"],
        "date_received": ["date received", "rcvd date", "received date", "date rcvd"],
        "date_tested": ["date tested", "test date", "testing date", "date of test", "tested date", "tested dt"],
        "age_days": ["age", "age (day)", "age (days)", "age days", "test age", "age day"],
        "diameter_in": ["diameter", "diameter (in)", "diameter in", "dia", "dia (in)"],
        "cross_area": ["cross area", "cross. area (in2)", "cross area (in2)", "cross area in2", "area", "area (sq in)", "area (in2)"],
        "max_load_lbs": ["max load", "max. load (lbs)", "max load (lbs)", "maximum load", "peak load", "load (lbs)", "load"],
        "fracture_type": ["fracture type", "fracture", "type of fracture", "break type", "fracture pattern", "break pattern"],
        "compressive_strength_psi": ["compressive strength", "compressive strength (psi)", "strength (psi)", "psi", "strength", "actual strength", "test strength"],
        "comments": ["comments", "remarks", "result", "status", "pass/fail", "notes"],

        # Header fields
        "vendor": ["supplier", "vendor", "merchant", "store", "company", "contractor", "shop", "seller", "provider", "hospital", "hotel", "restaurant"],
        "invoice_number": ["bill no", "bill number", "invoice number", "invoice no", "inv no", "receipt no", "receipt number", "voucher no", "ref no", "order id", "check #", "report no", "report number"],
        "date": ["bill date", "date", "invoice date", "transaction date", "dt", "billing date", "dated"],
        "gstin": ["gstin", "gst no", "gst number", "tax id", "tin", "vat no", "pan"],
        "total_amount": ["grand total", "net amount", "total payable", "amount payable", "final amount", "balance", "total bill"],
        "subtotal": ["subtotal", "taxable value", "taxable amount", "basic amount"],
        "project_number": ["project no", "project no.", "project number", "project #", "project id", "project name"],
        "tracking_number": ["tracking no", "tracking no.", "tracking number", "tracking #"],
        "location": ["placement location", "location", "site", "project address"],
        "supplier": ["concrete supplier", "supplier", "material supplier", "source"],
        "technician": ["lab tech", "technician", "inspected by", "tested by", "reviewer"]
    }

    @staticmethod
    def auto_map_fields(template_fields: List[str], extracted_fields: Dict[str, Any]) -> List[FieldMappingItem]:
        mappings: List[FieldMappingItem] = []

        available_extracted = {
            # Header fields
            "vendor": ("header", "vendor"),
            "invoice_number": ("header", "invoice_number"),
            "date": ("header", "date"),
            "gstin": ("header", "gstin"),
            "total_amount": ("header", "total_amount"),
            "subtotal": ("header", "subtotal"),
            "project_number": ("header", "project_number"),
            "tracking_number": ("header", "tracking_number"),
            "location": ("header", "location"),
            "supplier": ("header", "supplier"),
            "technician": ("header", "technician"),
            
            # Line items fields (standard)
            "description": ("line_item", "description"),
            "quantity": ("line_item", "quantity"),
            "unit": ("line_item", "unit"),
            "rate": ("line_item", "rate"),
            "amount": ("line_item", "amount"),

            # Line items fields (concrete/civil)
            "sample_no": ("line_item", "sample_no"),
            "cast_date": ("line_item", "cast_date"),
            "date_received": ("line_item", "date_received"),
            "date_tested": ("line_item", "date_tested"),
            "age_days": ("line_item", "age_days"),
            "diameter_in": ("line_item", "diameter_in"),
            "cross_area": ("line_item", "cross_area"),
            "max_load_lbs": ("line_item", "max_load_lbs"),
            "fracture_type": ("line_item", "fracture_type"),
            "compressive_strength_psi": ("line_item", "compressive_strength_psi"),
            "comments": ("line_item", "comments"),

            # Meta helpers
            "source_filename": ("meta", "source_filename")
        }

        # Add any dynamically extracted fields from the document
        for ext_key in (extracted_fields or {}).keys():
            if ext_key not in available_extracted and not ext_key.startswith("_"):
                available_extracted[ext_key] = ("line_item", ext_key)
                if ext_key not in MappingService.FIELD_SYNONYMS:
                    MappingService.FIELD_SYNONYMS[ext_key] = [ext_key.replace("_", " ")]

        used_extracted = set()

        # Phase 1: High confidence matches
        for excel_col in template_fields:
            col_norm = MappingService._normalize_string(excel_col)
            best_match = None
            best_score = 0.0
            source_type = "header"

            for field_key, synonyms in MappingService.FIELD_SYNONYMS.items():
                if field_key not in available_extracted:
                    continue

                # 1. Exact match with key
                if col_norm == field_key:
                    best_match = field_key
                    best_score = 1.0
                    source_type = available_extracted[field_key][0]
                    break

                # 2. Check synonyms
                for syn in synonyms:
                    syn_norm = MappingService._normalize_string(syn)
                    if col_norm == syn_norm:
                        best_match = field_key
                        best_score = 0.99
                        source_type = available_extracted[field_key][0]
                        break
                    
                    # Fuzzy match
                    ratio = fuzz.ratio(col_norm, syn_norm) / 100.0
                    if ratio > 0.82 and ratio > best_score:
                        best_score = ratio
                        best_match = field_key
                        source_type = available_extracted[field_key][0]

                if best_score >= 0.99:
                    break

            if best_match and best_score >= 0.70:
                mappings.append(FieldMappingItem(
                    excel_field=excel_col,
                    extracted_field=best_match,
                    source_type=source_type,
                    confidence=round(best_score, 2)
                ))
            else:
                # Default empty/unmapped for user review
                mappings.append(FieldMappingItem(
                    excel_field=excel_col,
                    extracted_field="none",
                    source_type="none",
                    confidence=0.0
                ))

        return mappings

    @staticmethod
    def _normalize_string(s: str) -> str:
        s = s.lower()
        s = re.sub(r'[^a-z0-9]', '', s)
        return s
