from abc import ABC, abstractmethod
from typing import Dict, Any, List

class DocumentExtractor(ABC):
    """Abstract base class for OCR and document understanding providers."""

    @abstractmethod
    def extract_text_and_layout(self, file_path: str) -> Dict[str, Any]:
        """
        Extract raw text, words, bounding boxes, and blocks from the document.
        Returns:
            {
                "raw_text": str,
                "confidence": float,
                "lines": List[str],
                "blocks": List[Dict[str, Any]]
            }
        """
        pass
