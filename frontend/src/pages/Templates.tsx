import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Plus, Table2, Layers, Check } from 'lucide-react';
import { Header } from '../components/Header';
import { TemplateUploader } from '../components/TemplateUploader';
import { TemplateService } from '../services/api';
import { TemplateSchema } from '../types';

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = () => {
    TemplateService.listTemplates()
      .then(res => setTemplates(res))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleTemplateSelected = async (file: File) => {
    setIsLoading(true);
    try {
      const res = await TemplateService.uploadTemplate(file);
      setSelectedTemplate(res.schema);
      loadTemplates();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Excel Templates Library"
        subtitle="Manage custom target Excel schemas for construction, purchases, medical, or food bills"
      />

      <div className="flex-1 w-full min-w-0 p-6 lg:p-8 space-y-8">
        {/* Upload New Template */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Add New Target Template
          </h3>
          <TemplateUploader
            template={selectedTemplate}
            onTemplateSelected={handleTemplateSelected}
            isLoading={isLoading}
          />
        </div>

        {/* Saved Templates List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Saved Templates</h3>
            <span className="text-xs text-slate-400">{templates.length} Active Templates</span>
          </div>

          <div className="divide-y divide-slate-100">
            {templates.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No templates uploaded yet. Upload your first Excel template above.
              </div>
            ) : (
              templates.map((tmpl) => (
                <div key={tmpl.id} className="p-5 hover:bg-slate-50/50 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-800">{tmpl.filename}</div>
                        <div className="text-[11px] text-slate-400">
                          Header Row #{tmpl.schema.header_row} · {tmpl.schema.fields.length} Columns
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Uploaded {new Date(tmpl.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pl-12">
                    {tmpl.schema.fields.map((f: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
