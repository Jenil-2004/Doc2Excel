import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class ExtractionService:
    """
    Intelligent dynamic document understanding engine:
    1. Classifies document (Invoice, Receipt, Medical Bill, Construction Bill, Hotel Bill, etc.)
    2. Extracts Header fields (Vendor, Invoice No, Date, Customer, Totals)
    3. Extracts Line Items (Tables of items, qty, rate, amount)
    4. Calculates confidence metrics
    """

    DOCUMENT_KEYWORDS = {
        "Construction Bill": ["civil", "construction", "contractor", "cement", "bricks", "sand", "m-sand", "rcc", "work order", "measurement", "labour", "boq"],
        "Restaurant Bill": ["restaurant", "cafe", "table", "waiter", "diner", "food", "menu", "beverage", "kitchen", "kds"],
        "Medical Bill": ["hospital", "pharmacy", "clinic", "patient", "doctor", "dr.", "rx", "medicine", "tablet", "capsule", "batch", "mfg", "exp"],
        "Hotel Bill": ["hotel", "resort", "room", "guest", "check-in", "check-out", "nights", "tariff", "stay"],
        "Utility Bill": ["electricity", "power", "water", "gas", "consumer no", "meter reading", "kwh", "bill month"],
        "Transport Bill": ["freight", "transport", "vehicle", "truck", "lr no", "driver", "destination", "toll", "km"],
        "Purchase Invoice": ["tax invoice", "purchase order", "po no", "vendor", "supplier", "hsn", "gstin", "bill to", "ship to"],
        "Expense Receipt": ["receipt", "cash memo", "pos", "retail", "store", "counter"]
    }

    @staticmethod
    def classify_document(raw_text: str) -> str:
        text_lower = raw_text.lower()
        scores = {}
        for doc_type, keywords in ExtractionService.DOCUMENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text_lower))
            if score > 0:
                scores[doc_type] = score

        if scores:
            return max(scores, key=scores.get)
        return "Invoice / Bill"

    @staticmethod
    def extract_structured_data(raw_text: str, lines: List[str], blocks: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        doc_type = ExtractionService.classify_document(raw_text)
        
        # 1. Header Extraction
        header_data, header_conf = ExtractionService._extract_header_fields(raw_text, lines)
        
        # 2. Line Items Extraction
        line_items, line_conf = ExtractionService._extract_line_items(lines, raw_text)

        # 3. Data Validation & Cross-checking
        warnings = ExtractionService._validate_and_reconcile(header_data, line_items)

        return {
            "document_type": doc_type,
            "header": header_data,
            "header_confidence": header_conf,
            "line_items": line_items,
            "line_items_confidence": line_conf,
            "warnings": warnings,
            "raw_text": raw_text
        }

    @staticmethod
    def _extract_header_fields(raw_text: str, lines: List[str]):
        header = {}
        conf = {}

        # Vendor Name: Usually in the top 5 non-empty lines
        vendor_candidates = []
        for l in lines[:6]:
            clean_l = l.strip()
            # Ignore common noise headers
            if clean_l and not re.search(r'(invoice|bill|receipt|tax|date|cash|original|duplicate|gstin)', clean_l, re.I):
                vendor_candidates.append(clean_l)
        if vendor_candidates:
            header["vendor"] = vendor_candidates[0]
            conf["vendor"] = 92.0
        else:
            header["vendor"] = "Unknown Vendor"
            conf["vendor"] = 60.0

        # Invoice / Bill Number
        inv_match = re.search(
            r'(?:invoice\s*(?:no|num|number|#)?|bill\s*(?:no|num|number|#)?|memo\s*no|inv\s*#)[:.\s]*([A-Za-z0-9\-\/]+)', 
            raw_text, 
            re.I
        )
        if inv_match:
            header["invoice_number"] = inv_match.group(1).strip()
            conf["invoice_number"] = 95.0
        else:
            # Fallback search for token like INV-1001 or #1234
            tok_match = re.search(r'\b(INV-?[0-9]{3,}|#[0-9]{4,})\b', raw_text, re.I)
            if tok_match:
                header["invoice_number"] = tok_match.group(1).strip()
                conf["invoice_number"] = 85.0
            else:
                header["invoice_number"] = "INV-001"
                conf["invoice_number"] = 55.0

        # Date normalization
        date_match = re.search(
            r'(?:date|dt|dated)?[:.\s]*(\b(?:\d{1,2}[-\/.]\d{1,2}[-\/.](?:\d{4}|\d{2})|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b)',
            raw_text,
            re.I
        )
        if date_match:
            raw_date_str = date_match.group(1).strip()
            normalized_date = ExtractionService._normalize_date(raw_date_str)
            header["date"] = normalized_date
            conf["date"] = 96.0
        else:
            header["date"] = datetime.now().strftime("%d/%m/%Y")
            conf["date"] = 50.0

        # GSTIN / Tax ID
        gst_match = re.search(r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b', raw_text)
        if gst_match:
            header["gstin"] = gst_match.group(1)
            conf["gstin"] = 98.0

        # Grand Total / Net Amount
        total_patterns = [
            r'(?:grand\s*total|net\s*total|total\s*amount|total\s*payable|amount\s*payable|balance\s*due|final\s*amount|total)[:.\s]*(?:rs\.?|inr|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)',
            r'(?:total)[:.\s]*(?:rs\.?|inr|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)'
        ]
        total_val = None
        for pat in total_patterns:
            m = re.search(pat, raw_text, re.I)
            if m:
                clean_num = m.group(1).replace(",", "")
                try:
                    total_val = float(clean_num)
                    break
                except ValueError:
                    pass
        if total_val is not None:
            header["total_amount"] = total_val
            conf["total_amount"] = 94.0
        else:
            header["total_amount"] = 0.0
            conf["total_amount"] = 50.0

        # Tax / Subtotal if available
        subtotal_match = re.search(r'(?:sub\s*total|taxable\s*amount)[:.\s]*(?:rs\.?|inr|\$)?\s*([\d,]+(?:\.\d{1,2})?)', raw_text, re.I)
        if subtotal_match:
            try:
                header["subtotal"] = float(subtotal_match.group(1).replace(",", ""))
                conf["subtotal"] = 90.0
            except ValueError:
                pass

        return header, conf

    @staticmethod
    def _extract_line_items(lines: List[str], raw_text: str):
        """
        Dynamically extracts tabular line items.
        Handles construction boq, restaurant food items, medical medicines, invoices, etc.
        Pattern structure per line typically:
        <Description> <Quantity> <Rate/Price> <Amount>
        """
        line_items = []
        confidences = []

        # Find header separator line index if present (e.g. Item, Qty, Rate, Amount)
        start_idx = 0
        for idx, line in enumerate(lines):
            if re.search(r'(description|item|particulars|material|product|room|medicine)', line, re.I) and \
               re.search(r'(qty|quantity|rate|price|amount|total)', line, re.I):
                start_idx = idx + 1
                break

        # Process lines
        for idx in range(start_idx, len(lines)):
            line = lines[idx].strip()
            if not line:
                continue

            # Stop when reaching summary section
            if re.search(r'^(total|subtotal|grand total|tax|gst|cgst|sgst|discount|terms|signature|bank details)', line, re.I):
                break

            # Number regex for items: looking for numbers that could be Qty, Rate, Amount
            # Pattern: Words followed by numbers or numbers interleaved
            # Example: "Cement 43 Grade 10 Bags 400 4000" or "Masala Dosa 2 70 140"
            tokens = line.split()
            if len(tokens) >= 2:
                numbers = []
                num_indices = []
                for t_idx, token in enumerate(tokens):
                    clean_t = token.replace(",", "").rstrip(".")
                    if re.match(r'^\d+(\.\d+)?$', clean_t):
                        try:
                            val = float(clean_t)
                            numbers.append(val)
                            num_indices.append(t_idx)
                        except ValueError:
                            pass

                if len(numbers) >= 2:
                    # Description is text before the numbers
                    desc_part = " ".join(tokens[:num_indices[0]]).strip()
                    # Strip leading index numbers e.g. "1. Cement" or "01 Paracetamol"
                    desc_clean = re.sub(r'^\d+[\.\)]?\s*', '', desc_part)
                    
                    if not desc_clean and len(tokens) > len(numbers):
                        desc_clean = tokens[0]

                    item_data = {}
                    item_conf = {}

                    if len(numbers) >= 3:
                        # Qty, Rate, Amount
                        qty = numbers[0]
                        rate = numbers[1]
                        amount = numbers[2]
                        item_data = {
                            "description": desc_clean or f"Item {len(line_items) + 1}",
                            "quantity": qty,
                            "rate": rate,
                            "amount": amount
                        }
                        item_conf = {
                            "description": 90.0,
                            "quantity": 88.0,
                            "rate": 86.0,
                            "amount": 92.0
                        }
                    elif len(numbers) == 2:
                        # Qty, Amount (Rate calculated)
                        qty = numbers[0]
                        amount = numbers[1]
                        rate = round(amount / qty, 2) if qty > 0 else amount
                        item_data = {
                            "description": desc_clean or f"Item {len(line_items) + 1}",
                            "quantity": qty,
                            "rate": rate,
                            "amount": amount
                        }
                        item_conf = {
                            "description": 85.0,
                            "quantity": 85.0,
                            "rate": 78.0,
                            "amount": 88.0
                        }

                    # Detect units if present in the tokens e.g. "Bags", "Kg", "Nos", "Pcs", "Hours", "Days"
                    unit_match = re.search(r'\b(bags?|kgs?|tons?|nos?|pcs?|units?|ltrs?|mtrs?|box|strip|pack)\b', line, re.I)
                    if unit_match:
                        item_data["unit"] = unit_match.group(1).title()
                        item_conf["unit"] = 92.0

                    if item_data.get("description"):
                        line_items.append(item_data)
                        confidences.append(item_conf)

        # Fallback if no tabular rows detected: create at least 1 consolidated line item from header total
        if not line_items:
            total_amt = ExtractionService._extract_header_fields(raw_text, lines)[0].get("total_amount", 0.0)
            line_items.append({
                "description": "General Expense / Service",
                "quantity": 1,
                "rate": total_amt,
                "amount": total_amt
            })
            confidences.append({
                "description": 75.0,
                "quantity": 90.0,
                "rate": 75.0,
                "amount": 75.0
            })

        return line_items, confidences

    @staticmethod
    def _normalize_date(date_str: str) -> str:
        # Try multiple date formats
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
            "%m/%d/%Y", "%m-%d-%Y",
            "%Y-%m-%d", "%Y/%m/%d",
            "%d %b %Y", "%d %B %Y",
            "%b %d, %Y", "%B %d, %Y"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%d/%m/%Y")
            except ValueError:
                continue
        return date_str

    @staticmethod
    def _validate_and_reconcile(header: Dict[str, Any], items: List[Dict[str, Any]]) -> List[str]:
        warnings = []
        items_total = 0.0

        for idx, item in enumerate(items, start=1):
            qty = item.get("quantity")
            rate = item.get("rate")
            amount = item.get("amount")

            if qty is not None and rate is not None and amount is not None:
                expected = round(qty * rate, 2)
                # Allow rounding discrepancy up to 1.0
                if abs(expected - amount) > 1.0:
                    warnings.append(
                        f"Item #{idx} ('{item.get('description', '')}'): Qty ({qty}) × Rate ({rate}) = {expected}, but extracted Amount is {amount}."
                    )
            if amount is not None:
                items_total += amount

        header_total = header.get("total_amount", 0.0)
        if header_total > 0 and items_total > 0:
            if abs(header_total - items_total) > (header_total * 0.15 + 2.0):
                warnings.append(
                    f"Grand Total mismatch: Line items sum ({round(items_total, 2)}) differs from extracted Grand Total ({header_total}). Please review."
                )

        return warnings
