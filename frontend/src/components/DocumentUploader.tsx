import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Check, Image as ImageIcon } from 'lucide-react';
import { UploadedDocument } from '../types';

interface DocumentUploaderProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploadedDocs: UploadedDocument[];
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ files, setFiles, uploadedDocs }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, [setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-sky-500 bg-sky-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-sky-400 bg-white hover:bg-slate-50/50 shadow-sm'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 shadow-sm">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Upload Bills, Invoices or Receipts
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Drop construction, purchase, restaurant, medical, or handwritten bills. JPG, PNG, WEBP, or PDF.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition">
          Browse Files
        </div>
      </div>

      {/* File queue list */}
      {files.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selected Bills ({files.length})
            </span>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Clear All
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto mt-2">
            {files.map((file, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    {file.type.includes('pdf') ? <FileText className="w-4 h-4 text-rose-500" /> : <ImageIcon className="w-4 h-4 text-sky-600" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 truncate max-w-xs">{file.name}</div>
                    <div className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
