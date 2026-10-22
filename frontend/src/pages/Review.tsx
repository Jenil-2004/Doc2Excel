import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Layers, 
  ArrowRight,
  RefreshCw 
} from 'lucide-react';
import { Header } from '../components/Header';
import { ProcessingStepper } from '../components/ProcessingStepper';
import { MappingTable } from '../components/MappingTable';
import { ExtractionReview } from '../components/ExtractionReview';
import { ExcelPreview } from '../components/ExcelPreview';
import { JobService, DocumentService, ExcelService } from '../services/api';
import { JobStatus, ExtractedData, FieldMapping } from '../types';

export const Review: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobStatus | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Poll Job Status
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await JobService.getJob(jobId);
        if (!isMounted) return;
        setJob(res);
        setMappings(res.mappings || []);

        // Pick first document by default
        if (res.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(res.documents[0].id);
        }

        // Stop polling if completed or failed
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (err: any) {
        console.error(err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [jobId, selectedDocId]);

  // 2. Fetch selected document extracted details
  useEffect(() => {
    if (!selectedDocId || job?.status !== 'completed') return;
    DocumentService.getDocumentData(selectedDocId)
      .then(res => {
        setExtractedData(res);
        setErrorMsg('');
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.error || 'Failed to load extracted document data.');
      });
  }, [selectedDocId, job?.status]);

  useEffect(() => {
    if (job?.status === 'failed') {
      setErrorMsg(job.message || 'Document extraction failed.');
    }
  }, [job?.message, job?.status]);

  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const handleAutoMap = async () => {
    if (!job) return;
    setIsAutoMapping(true);
    setErrorMsg('');
    try {
      const res = await JobService.autoMapJob(job.id);
      if (res && res.mappings) {
        setMappings(res.mappings);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to auto-map fields.');
    } finally {
      setIsAutoMapping(false);
    }
  };

  const handleGenerateExcel = async () => {
    if (!job) return;
    setIsGenerating(true);
    setErrorMsg('');
    try {
      // 1. Save confirmed mappings
      await JobService.updateMapping(job.id, mappings);

      // 2. Generate Excel
      const res = await ExcelService.generateExcel(job.id, job.template_id, mappings);
      setGeneratedResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to generate Excel file.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading Job Details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title={`Review Extraction & Mapping (${job.id})`}
        subtitle={`Stage: ${job.stage || 'In Progress'} · Progress: ${job.progress}%`}
      />

      <div className="flex-1 w-full min-w-0 p-6 lg:p-8 space-y-8">
        {/* Processing Stepper */}
        <ProcessingStepper
          currentStep={
            generatedResult
              ? 5
              : job.status === 'completed'
              ? 4
              : 2
          }
        />

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700 font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* In Progress Loader Banner */}
        {job.status === 'processing' && (
          <div className="p-6 bg-white border border-sky-200 rounded-2xl shadow-sm flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-sky-600 animate-spin shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                <span>{job.stage || 'Reading Documents & Performing OCR...'}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Selector Pills (If Multiple Uploaded) */}
        {job.documents.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-2">
              Bills in Batch:
            </span>
            {job.documents.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDocId(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  selectedDocId === d.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {d.filename}
              </button>
            ))}
          </div>
        )}

        {/* 1. Review & Edit Screen */}
        {extractedData && (
          <ExtractionReview
            documentId={selectedDocId}
            extractedData={extractedData}
            onDataSaved={(updated) => setExtractedData(updated)}
          />
        )}

        {/* 2. Field Mapping Section */}
        {mappings.length > 0 && (
          <MappingTable
            mappings={mappings}
            setMappings={setMappings}
            onAutoMap={handleAutoMap}
            onConfirm={handleGenerateExcel}
            isGenerating={isGenerating}
          />
        )}

        {/* 3. Generated Excel Workbook Section */}
        {generatedResult && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">
                  Excel Workbook Successfully Generated with Layout & Styles Preserved!
                </span>
              </div>
              <a
                href={ExcelService.getDownloadUrl(generatedResult.file_id)}
                download={generatedResult.filename}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Download (.xlsx)
              </a>
            </div>

            <ExcelPreview
              fileId={generatedResult.file_id}
              filename={generatedResult.filename}
              initialData={generatedResult.preview_data}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Review;
