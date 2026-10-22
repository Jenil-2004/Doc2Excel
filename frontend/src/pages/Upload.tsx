import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles, AlertCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { DocumentUploader } from '../components/DocumentUploader';
import { TemplateUploader } from '../components/TemplateUploader';
import { ProcessingStepper } from '../components/ProcessingStepper';
import { DocumentService, TemplateService, JobService } from '../services/api';
import { TemplateSchema } from '../types';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [template, setTemplate] = useState<TemplateSchema | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTemplateSelected = async (file: File) => {
    setTemplateFile(file);
    setIsTemplateLoading(true);
    setErrorMsg('');
    try {
      const res = await TemplateService.uploadTemplate(file);
      setTemplate(res.schema);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to inspect Excel template.');
    } finally {
      setIsTemplateLoading(false);
    }
  };

  const handleStartExtraction = async () => {
    if (docFiles.length === 0) {
      setErrorMsg('Please upload at least one bill, invoice, or receipt file.');
      return;
    }
    if (!template) {
      setErrorMsg('Please upload your target Excel template file.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Upload documents
      const docRes = await DocumentService.uploadDocuments(docFiles);
      const documentIds = docRes.documents.map(d => d.id);

      // 2. Create extraction job
      const jobRes = await JobService.createJob(documentIds, template.template_id);

      // 3. Navigate to review screen
      navigate(`/review/${jobRes.job_id}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to initiate processing pipeline.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Upload & Start Extraction"
        subtitle="Step 1: Upload documents and template"
      />

      <div className="flex-1 w-full min-w-0 p-6 lg:p-8 space-y-6">
        <ProcessingStepper currentStep={1} />

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bill / Invoice Dropzone */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Step 1 · Source Documents
              </span>
              <span className="text-[11px] text-slate-400">Multiple files supported</span>
            </div>
            <DocumentUploader
              files={docFiles}
              setFiles={setDocFiles}
              uploadedDocs={[]}
            />
          </div>

          {/* Excel Template Dropzone */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Step 2 · Target Excel Template
              </span>
              <span className="text-[11px] text-slate-400">Preserves layout & formulas</span>
            </div>
            <TemplateUploader
              template={template}
              onTemplateSelected={handleTemplateSelected}
              isLoading={isTemplateLoading}
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {docFiles.length} Document(s) selected · {template ? 'Template verified' : 'Template required'}
          </div>

          <button
            onClick={handleStartExtraction}
            disabled={isSubmitting || docFiles.length === 0 || !template}
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            {isSubmitting ? 'Starting Processing...' : 'Start OCR & Extraction Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
};
