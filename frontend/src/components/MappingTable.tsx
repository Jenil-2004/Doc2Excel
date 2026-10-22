import React, { useState } from 'react';
import { ArrowRight, RefreshCw, CheckCircle2, Sparkles, Check, Filter } from 'lucide-react';
import { FieldMapping } from '../types';

interface MappingTableProps {
  mappings: FieldMapping[];
  setMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>;
  onAutoMap: () => void;
  onConfirm: () => void;
  isGenerating?: boolean;
}

const BASE_OPTIONS: { value: string; label: string; group?: string }[] = [
  { value: 'none', label: '-- Do Not Map (Leave Blank) --' },

  // Concrete Testing & Cylinder Form Fields
  { value: 'sample_no', label: 'Item → Sample No. / Cylinder #' },
  { value: 'cast_date', label: 'Item → Cast Date / Date Made' },
  { value: 'date_received', label: 'Item → Date Received' },
  { value: 'date_tested', label: 'Item → Date Tested' },
  { value: 'age_days', label: 'Item → Age (Days)' },
  { value: 'diameter_in', label: 'Item → Diameter (in)' },
  { value: 'cross_area', label: 'Item → Cross. Area (in²)' },
  { value: 'max_load_lbs', label: 'Item → Max. Load (lbs)' },
  { value: 'fracture_type', label: 'Item → Fracture Type (1–6)' },
  { value: 'compressive_strength_psi', label: 'Item → Compressive Strength (PSI)' },
  { value: 'comments', label: 'Item → Comments / Pass-Fail Status' },

  // Invoice & Expense Line Items
  { value: 'description', label: 'Item → Description / Material' },
  { value: 'quantity', label: 'Item → Quantity' },
  { value: 'unit', label: 'Item → Measuring Unit (Bags, Kg, Nos)' },
  { value: 'rate', label: 'Item → Unit Rate / Price' },
  { value: 'amount', label: 'Item → Line Amount' },

  // Header & Project Metadata
  { value: 'project_number', label: 'Header → Project No. / ID' },
  { value: 'tracking_number', label: 'Header → Tracking Number' },
  { value: 'location', label: 'Header → Placement Location / Site' },
  { value: 'supplier', label: 'Header → Concrete Supplier / Plant' },
  { value: 'technician', label: 'Header → Field / Lab Technician' },
  { value: 'vendor', label: 'Header → Vendor / Contractor Name' },
  { value: 'invoice_number', label: 'Header → Invoice / Report Number' },
  { value: 'date', label: 'Header → Document / Bill Date' },
  { value: 'gstin', label: 'Header → GSTIN / Tax ID' },
  { value: 'total_amount', label: 'Header → Grand Total Amount' },
  { value: 'subtotal', label: 'Header → Subtotal' },
  { value: 'source_filename', label: 'Meta → Source Document Filename' }
];

export const MappingTable: React.FC<MappingTableProps> = ({
  mappings,
  setMappings,
  onAutoMap,
  onConfirm,
  isGenerating = false
}) => {
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [autoMapSuccess, setAutoMapSuccess] = useState(false);

  const handleSelectChange = (excelField: string, newTarget: string) => {
    setMappings(prev =>
      prev.map(m => {
        if (m.excel_field === excelField) {
          return {
            ...m,
            extracted_field: newTarget,
            confidence: newTarget === 'none' ? 0 : 1.0
          };
        }
        return m;
      })
    );
  };

  const handleTriggerAutoMap = async () => {
    setIsAutoMapping(true);
    setAutoMapSuccess(false);
    try {
      await onAutoMap();
      setAutoMapSuccess(true);
      setTimeout(() => setAutoMapSuccess(false), 2000);
    } finally {
      setIsAutoMapping(false);
    }
  };

  const mappedCount = mappings.filter(m => m.extracted_field && m.extracted_field !== 'none').length;
  const totalCount = mappings.length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">Dynamic Field Mapping</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
              {mappedCount} of {totalCount} Mapped
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Align extracted document fields into each column of your target Excel template.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTriggerAutoMap}
            disabled={isAutoMapping || isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-sky-500 hover:bg-sky-50/50 active:scale-95 text-slate-700 hover:text-sky-700 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Automatically align Excel columns using semantic synonym matching"
          >
            {autoMapSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Auto-Mapped!</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isAutoMapping ? 'animate-spin' : ''}`} />
                <span>Auto-Map Fields</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isGenerating || mappings.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 active:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/25 hover:shadow-lg hover:shadow-sky-600/35 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Excel...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Mapping & Generate Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-6">Excel Template Column</th>
              <th className="py-3 px-4 w-12 text-center"></th>
              <th className="py-3 px-6">Extracted Document Value</th>
              <th className="py-3 px-6">Match Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mappings.map((m, idx) => {
              // Ensure the current extracted_field exists in option list so select doesn't fall back to 'none'
              const options = [...BASE_OPTIONS];
              if (m.extracted_field && !options.some(o => o.value === m.extracted_field)) {
                options.push({
                  value: m.extracted_field,
                  label: `Extracted → ${m.extracted_field.replace(/_/g, ' ')}`
                });
              }

              const isMapped = m.extracted_field && m.extracted_field !== 'none';

              return (
                <tr key={idx} className="hover:bg-slate-50/75 transition">
                  <td className="py-3.5 px-6 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isMapped ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="whitespace-pre-line">{m.excel_field}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400">
                    <ArrowRight className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="py-3.5 px-6">
                    <select
                      value={m.extracted_field || 'none'}
                      onChange={(e) => handleSelectChange(m.excel_field, e.target.value)}
                      className={`w-full max-w-md px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm cursor-pointer hover:border-sky-400 ${
                        isMapped
                          ? 'border-emerald-300 text-emerald-950 bg-emerald-50/20'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-6">
                    {!isMapped ? (
                      <span className="text-[11px] text-slate-400 italic">Unmapped</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          m.confidence >= 0.85
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {Math.round(m.confidence * 100)}% Match
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MappingTable;
