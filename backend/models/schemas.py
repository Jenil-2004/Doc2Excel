from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FieldSchema(BaseModel):
    name: str
    type: str = "text"  # text, number, currency, date
    sample_values: List[str] = Field(default_factory=list)
    required: bool = False

class TemplateSchema(BaseModel):
    template_id: str
    filename: str
    sheet_names: List[str]
    selected_sheet: str
    header_row: int
    fields: List[FieldSchema]

class LineItem(BaseModel):
    id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    confidence: Dict[str, float] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)

class ExtractedDocumentData(BaseModel):
    document_id: str
    filename: str
    document_type: str = "Invoice"  # Invoice, Receipt, Medical Bill, Construction Bill, etc.
    header_fields: Dict[str, Any] = Field(default_factory=dict)
    header_confidence: Dict[str, float] = Field(default_factory=dict)
    line_items: List[Dict[str, Any]] = Field(default_factory=list)
    line_items_confidence: List[Dict[str, float]] = Field(default_factory=list)
    raw_text: str = ""
    warnings: List[str] = Field(default_factory=list)

class FieldMappingItem(BaseModel):
    excel_field: str
    extracted_field: str
    source_type: str = "auto"  # 'header', 'line_item', 'static'
    confidence: float = 1.0

class MappingConfiguration(BaseModel):
    job_id: str
    mappings: List[FieldMappingItem]
