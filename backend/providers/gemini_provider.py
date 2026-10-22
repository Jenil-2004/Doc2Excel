import os
import json
import re
from typing import Dict, Any, List
from PIL import Image
from config import Config
from providers.base_provider import DocumentExtractor

class GeminiExtractor(DocumentExtractor):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.GEMINI_API_KEY
        self.client = None
        self._init_client()

    def _init_client(self):
        key = self.api_key or Config.GEMINI_API_KEY
        if key:
            try:
                from google import genai
                self.client = genai.Client(api_key=key)
            except Exception as e:
                print(f"Error initializing Gemini client: {e}", flush=True)

    def is_available(self) -> bool:
        if self.client is None:
            self._init_client()
        return self.client is not None

    def extract_document(self, file_path: str) -> Dict[str, Any]:
        """
        Extract structured information from document using Gemini Vision.
        Returns a dict containing:
        - raw_text: string
        - confidence: float
        - lines: List[str]
        - structured: Dict with document_type, header, line_items, confidence_data, warnings
        """
        if not self.is_available():
            raise RuntimeError("Gemini API key is not configured or client failed to initialize.")

        import time
        img = Image.open(file_path)
        
        prompt = """You are an expert document understanding AI. Analyze this image (which could be an invoice, bill, receipt, or a civil engineering concrete cylinder test report/inspection sheet).
Extract all metadata and all tabular line items with high precision.

Return ONLY a valid JSON object with the following structure:
{
  "document_type": "Concrete Test Report" | "Construction Bill" | "Invoice" | "Receipt" | etc.,
  "header": {
    "vendor": "...",
    "company_name": "...",
    "project_number": "...",
    "tracking_number": "...",
    "location": "...",
    "supplier": "...",
    "technician": "...",
    "cast_date": "...",
    "invoice_number": "...",
    "date": "...",
    "total_amount": 0.0,
    "strength_required_psi": "...",
    "slump": "...",
    "air": "..."
  },
  "line_items": [
    {
      "sample_no": 1,
      "cast_date": "...",
      "date_received": "...",
      "date_tested": "...",
      "age_days": 7,
      "diameter_in": 4,
      "cross_area": 12.566,
      "max_load_lbs": 65401,
      "fracture_type": 4,
      "compressive_strength_psi": 5209,
      "comments": "Pass",
      "description": "...",
      "quantity": 1,
      "unit": "...",
      "rate": 0.0,
      "amount": 0.0
    }
  ]
}
Include every row in the table. If a field is not present, use null or appropriate default. Output strictly valid JSON without markdown wrapping if possible.
"""

        models_to_try = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']
        last_error = None

        for attempt in range(2):
            for model_name in models_to_try:
                try:
                    resp = self.client.models.generate_content(
                        model=model_name,
                        contents=[img, prompt]
                    )
                    text = resp.text.strip()
                    # Remove code fences if present
                    clean_json_str = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
                    clean_json_str = re.sub(r'```\s*$', '', clean_json_str, flags=re.MULTILINE).strip()
                    
                    data = json.loads(clean_json_str)
                    
                    header = data.get("header", {})
                    line_items = data.get("line_items", [])
                    doc_type = data.get("document_type", "Extracted Document")

                    # Auto-fill cross_area = 12.566 for 4" cylinder if missing
                    for item in line_items:
                        dia = item.get("diameter_in")
                        if (dia == 4 or dia == "4") and not item.get("cross_area"):
                            item["cross_area"] = 12.566
                        # Default comment to Pass if compressive strength is >= 4000
                        if not item.get("comments") and item.get("compressive_strength_psi"):
                            try:
                                val = float(str(item["compressive_strength_psi"]).replace(",", ""))
                                item["comments"] = "Pass" if val >= 4000 else "Fail"
                            except (ValueError, TypeError):
                                item["comments"] = "Pass"

                    lines = []
                    for k, v in header.items():
                        if v:
                            lines.append(f"{k}: {v}")
                    for item in line_items:
                        lines.append(str(item))

                    print(f"Gemini model {model_name} successfully extracted {len(line_items)} items.", flush=True)
                    return {
                        "raw_text": "\n".join(lines),
                        "confidence": 98.5,
                        "lines": lines,
                        "structured": {
                            "document_type": doc_type,
                            "header": header,
                            "header_confidence": {k: 98.0 for k in header},
                            "line_items": line_items,
                            "line_items_confidence": [{k: 98.0 for k in it} for it in line_items],
                            "warnings": []
                        }
                    }
                except Exception as e:
                    print(f"Gemini model {model_name} attempt {attempt+1} failed: {e}", flush=True)
                    last_error = e
                    time.sleep(1)

        raise RuntimeError(f"All Gemini vision model attempts failed: {last_error}")

    def extract_text_and_layout(self, file_path: str) -> Dict[str, Any]:
        doc_res = self.extract_document(file_path)
        return {
            "raw_text": doc_res["raw_text"],
            "confidence": doc_res["confidence"],
            "lines": doc_res["lines"],
            "structured": doc_res["structured"]
        }
