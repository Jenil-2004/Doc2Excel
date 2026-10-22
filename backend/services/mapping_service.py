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
        # Line item fields
        "description": ["item name", "item", "description", "product", "particulars", "service", "medicine", "material", "work description", "room", "details"],
        "quantity": ["qty", "quantity", "count", "units", "nights", "days", "hours", "nos", "volume"],
        "unit": ["unit", "uom", "measuring unit", "unit of measure"],
        "rate": ["unit price", "rate", "price", "cost", "unit rate", "tariff", "item rate"],
        "amount": ["total amount", "line total", "item total", "net rate", "total price", "val", "cost amount", "amount", "total"],

        # Header fields
        "vendor": ["supplier", "vendor", "merchant", "store", "company", "contractor", "shop", "seller", "provider", "hospital", "hotel", "restaurant"],
        "invoice_number": ["bill no", "bill number", "invoice number", "invoice no", "inv no", "receipt no", "receipt number", "voucher no", "ref no", "order id", "check #"],
        "date": ["bill date", "date", "invoice date", "transaction date", "dt", "billing date", "dated"],
        "gstin": ["gstin", "gst no", "gst number", "tax id", "tin", "vat no", "pan"],
        "total_amount": ["grand total", "net amount", "total payable", "amount payable", "final amount", "balance", "total bill"],
        "subtotal": ["subtotal", "taxable value", "taxable amount", "basic amount"]
    }

    @staticmethod
    def auto_map_fields(template_fields: List[str], extracted_fields: Dict[str, Any]) -> List[FieldMappingItem]:
        mappings: List[FieldMappingItem] = []

        # Available extracted fields
        # header fields: vendor, invoice_number, date, gstin, total_amount, subtotal
        # line item fields: description, quantity, unit, rate, amount
        available_extracted = {
            # Header fields
            "vendor": ("header", "vendor"),
            "invoice_number": ("header", "invoice_number"),
            "date": ("header", "date"),
            "gstin": ("header", "gstin"),
            "total_amount": ("header", "total_amount"),
            "subtotal": ("header", "subtotal"),
            
            # Line items fields
            "description": ("line_item", "description"),
            "quantity": ("line_item", "quantity"),
            "unit": ("line_item", "unit"),
            "rate": ("line_item", "rate"),
            "amount": ("line_item", "amount"),

            # Meta helpers
            "source_filename": ("meta", "source_filename")
        }

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
