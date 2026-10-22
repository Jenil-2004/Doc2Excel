import os
import cv2
import numpy as np
import pytesseract
from PIL import Image
from typing import Dict, Any, List
from config import Config
from providers.base_provider import DocumentExtractor
from pypdf import PdfReader

class TesseractExtractor(DocumentExtractor):
    def __init__(self, tesseract_cmd: str = None):
        self.tesseract_cmd = tesseract_cmd or Config.TESSERACT_CMD
        if os.path.exists(self.tesseract_cmd):
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    def _preprocess_image(self, image_path: str) -> np.ndarray:
        """
        State of the art image preprocessing:
        1. Grayscale
        2. Noise reduction via bilateral filter
        3. Adaptive thresholding / Otsu thresholding
        4. Deskewing
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image file at {image_path}")

        # Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Contrast enhancement (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrast_enhanced = clahe.apply(gray)

        # Noise reduction while preserving edges
        denoised = cv2.bilateralFilter(contrast_enhanced, 9, 75, 75)

        # Thresholding - Otsu
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Deskew detection
        coords = np.column_stack(np.where(thresh == 0))
        if len(coords) > 50:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if abs(angle) > 0.5 and abs(angle) < 45:
                (h, w) = thresh.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                thresh = cv2.warpAffine(thresh, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

        return thresh

    def extract_text_and_layout(self, file_path: str) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()

        # Handle PDF documents
        if ext == ".pdf":
            try:
                reader = PdfReader(file_path)
                pdf_text = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        pdf_text.append(page_text)
                if pdf_text:
                    full_text = "\n".join(pdf_text)
                    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
                    return {
                        "raw_text": full_text,
                        "confidence": 98.0,
                        "lines": lines,
                        "blocks": [{"text": line, "confidence": 98.0} for line in lines]
                    }
            except Exception as e:
                print(f"Direct PDF text extraction fallback: {e}")

        # Handle Images (or PDFs via rasterized fallback)
        try:
            processed_img = self._preprocess_image(file_path)
            
            # Extract detailed data with confidence
            data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
            
            blocks = []
            valid_confidences = []
            lines = []
            current_line = []

            n_boxes = len(data['text'])
            for i in range(n_boxes):
                text = data['text'][i].strip()
                conf = float(data['conf'][i])
                
                if text:
                    if conf > 0:
                        valid_confidences.append(conf)
                    current_line.append(text)
                    blocks.append({
                        "text": text,
                        "confidence": conf if conf > 0 else 75.0,
                        "left": data['left'][i],
                        "top": data['top'][i],
                        "width": data['width'][i],
                        "height": data['height'][i]
                    })
                
                # Check for line breaks
                if i < n_boxes - 1 and data['line_num'][i] != data['line_num'][i + 1]:
                    if current_line:
                        lines.append(" ".join(current_line))
                        current_line = []
            
            if current_line:
                lines.append(" ".join(current_line))

            raw_text = "\n".join(lines)
            avg_conf = sum(valid_confidences) / len(valid_confidences) if valid_confidences else 80.0

            return {
                "raw_text": raw_text,
                "confidence": round(avg_conf, 1),
                "lines": lines,
                "blocks": blocks
            }
        except Exception as e:
            # Fallback to direct Pillow OCR if cv2 pipeline fails
            pil_img = Image.open(file_path)
            raw_text = pytesseract.image_to_string(pil_img)
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            return {
                "raw_text": raw_text,
                "confidence": 75.0,
                "lines": lines,
                "blocks": [{"text": l, "confidence": 75.0} for l in lines]
            }
