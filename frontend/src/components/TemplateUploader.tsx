import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Check, Sparkles, Table2, Layers } from 'lucide-react';
import { TemplateSchema } from '../types';

interface TemplateUploaderProps {
  template: TemplateSchema | null;
  onTemplateSelected: (file: File) => void;
  isLoading?: boolean;
}

export const TemplateUploader: React.FC<TemplateUploaderProps> = ({ template, onTemplateSelected, isLoading }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onTemplateSelected(acceptedFiles[0]);
    }
  }, [onTemplateSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-4">
      {/* Template dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-slate-50/50 shadow-sm'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Upload Target Excel Template
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Upload any template (.xlsx, .xls) with your desired columns. The AI will extract and map directly into it.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition">
          {isLoading ? 'Inspecting Template...' : 'Select Excel Template'}
        </div>
      </div>

      {/* Inspected schema preview */}
      {template && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Table2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">{template.filename}</h4>
                <p className="text-xs text-slate-500">
                  Sheet: <span className="font-semibold text-slate-700">{template.selected_sheet}</span> · Header Row: #{template.header_row}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5" /> Schema Detected
            </span>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Output Columns ({template.fields.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {template.fields.map((field, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2"
                >
                  <span className="font-semibold text-slate-800">{field.name}</span>
                  <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold">
                    {field.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
