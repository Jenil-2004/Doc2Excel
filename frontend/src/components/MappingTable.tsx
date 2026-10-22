import React from 'react';
import { ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { FieldMapping } from '../types';

interface MappingTableProps {
  mappings: FieldMapping[];
  setMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>;
  onAutoMap: () => void;
  onConfirm: () => void;
  isGenerating?: boolean;
}

const AVAILABLE_EXTRACTED_FIELDS = [
  { value: 'none', label: '-- Do Not Map (Leave Blank) --' },
  { value: 'vendor', label: 'Header → Vendor / Supplier' },
  { value: 'invoice_number', label: 'Header → Invoice / Bill Number' },
  { value: 'date', label: 'Header → Normalized Date (DD/MM/YYYY)' },
  { value: 'gstin', label: 'Header → GSTIN / Tax ID' },
  { value: 'total_amount', label: 'Header → Grand Total Amount' },
  { value: 'subtotal', label: 'Header → Subtotal' },
  { value: 'description', label: 'Item → Item Description / Material' },
  { value: 'quantity', label: 'Item → Quantity' },
  { value: 'unit', label: 'Item → Measuring Unit (Bags, Kg, Nos)' },
  { value: 'rate', label: 'Item → Unit Rate / Price' },
  { value: 'amount', label: 'Item → Line Amount' },
  { value: 'source_filename', label: 'Meta → Source Document Filename' }
];

export const MappingTable: React.FC<MappingTableProps> = ({
  mappings,
  setMappings,
  onAutoMap,
  onConfirm,
  isGenerating
}) => {
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Dynamic Field Mapping</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirm how extracted document data aligns into each column of your Excel template.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAutoMap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Auto-Map Fields
          </button>
          <button
            onClick={onConfirm}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isGenerating ? 'Generating Excel...' : 'Confirm Mapping & Generate Excel'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-6">Excel Template Column</th>
              <th className="py-3 px-4 w-12 text-center"></th>
              <th className="py-3 px-6">Extracted Document Value</th>
              <th className="py-3 px-6">Match Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mappings.map((m, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition">
                <td className="py-3.5 px-6 font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {m.excel_field}
                </td>
                <td className="py-3.5 px-4 text-center text-slate-400">
                  <ArrowRight className="w-4 h-4 mx-auto" />
                </td>
                <td className="py-3.5 px-6">
                  <select
                    value={m.extracted_field}
                    onChange={(e) => handleSelectChange(m.excel_field, e.target.value)}
                    className="w-full max-w-sm px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    {AVAILABLE_EXTRACTED_FIELDS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3.5 px-6">
                  {m.extracted_field === 'none' ? (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
