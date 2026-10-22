import axios from 'axios';
import { UploadedDocument, TemplateSchema, ExtractedData, JobStatus, FieldMapping } from '../types';

const api = axios.create({
  baseURL: '/api'
});

export const DocumentService = {
  uploadDocuments: async (files: File[]): Promise<{ documents: UploadedDocument[]; count: number }> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getDocumentData: async (documentId: string): Promise<ExtractedData> => {
    const response = await api.get(`/documents/${documentId}/data`);
    return response.data;
  },

  updateDocumentData: async (documentId: string, data: Partial<ExtractedData>): Promise<void> => {
    await api.put(`/documents/${documentId}/data`, data);
  },

  getDocumentFileUrl: (documentId: string): string => {
    return `/api/documents/${documentId}/file`;
  }
};

export const TemplateService = {
  uploadTemplate: async (file: File): Promise<{ template_id: string; filename: string; schema: TemplateSchema }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  listTemplates: async (): Promise<Array<{ id: string; filename: string; schema: TemplateSchema; created_at: string }>> => {
    const response = await api.get('/templates');
    return response.data;
  }
};

export const JobService = {
  createJob: async (documentIds: string[], templateId?: string): Promise<{ job_id: string; status: string; progress: number }> => {
    const response = await api.post('/jobs', {
      document_ids: documentIds,
      template_id: templateId
    });
    return response.data;
  },

  getJob: async (jobId: string): Promise<JobStatus> => {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },

  updateMapping: async (jobId: string, mappings: FieldMapping[]): Promise<void> => {
    await api.post(`/jobs/${jobId}/mapping`, { mappings });
  },

  autoMapJob: async (jobId: string): Promise<{ mappings: FieldMapping[] }> => {
    const response = await api.post(`/jobs/${jobId}/auto-map`);
    return response.data;
  }
};

export const ExcelService = {
  generateExcel: async (jobId: string, templateId?: string, mappings?: FieldMapping[]): Promise<{
    file_id: string;
    filename: string;
    row_count: number;
    preview_data: any[];
    download_url: string;
  }> => {
    const response = await api.post('/excel/generate', {
      job_id: jobId,
      template_id: templateId,
      mappings: mappings
    });
    return response.data;
  },

  getDownloadUrl: (fileId: string): string => {
    return `/api/excel/${fileId}/download`;
  }
};

export const DashboardService = {
  getStats: async (): Promise<any> => {
    const response = await api.get('/stats');
    return response.data;
  },
  getHealth: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  }
};
