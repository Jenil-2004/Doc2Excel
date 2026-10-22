export interface UploadedDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
}

export interface FieldSchema {
  name: string;
  type: string;
  sample_values?: string[];
  required?: boolean;
}

export interface TemplateSchema {
  template_id: string;
  filename: string;
  sheet_names: string[];
  selected_sheet: string;
  header_row: number;
  fields: FieldSchema[];
}

export interface HeaderData {
  vendor?: string;
  invoice_number?: string;
  date?: string;
  gstin?: string;
  total_amount?: number;
  subtotal?: number;
  [key: string]: any;
}

export interface LineItem {
  id?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  [key: string]: any;
}

export interface ExtractedData {
  document_id: string;
  document_type: string;
  header: HeaderData;
  line_items: LineItem[];
  confidence: {
    overall?: number;
    header?: Record<string, number>;
    line_items?: Array<Record<string, number>>;
  };
  warnings: string[];
  raw_text: string;
}

export interface FieldMapping {
  excel_field: string;
  extracted_field: string;
  source_type: string;
  confidence: number;
}

export interface JobStatus {
  id: string;
  template_id?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  message?: string;
  documents: Array<{
    id: string;
    filename: string;
    file_type: string;
    document_type: string;
    warnings: string[];
    confidence: any;
  }>;
  mappings: FieldMapping[];
}
