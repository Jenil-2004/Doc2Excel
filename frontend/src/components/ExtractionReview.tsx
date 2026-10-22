import React, { useState } from 'react';
import { Eye, Edit3, AlertTriangle, Plus, Trash2, FileText, Check } from 'lucide-react';
import { ExtractedData, LineItem } from '../types';
import { DocumentService } from '../services/api';
import { ConfidenceBadge } from './Badges';

interface ExtractionReviewProps {
  documentId: string;
  extractedData: ExtractedData;
  onDataSaved: (updated: ExtractedData) => void;
}

export const ExtractionReview: React.FC<ExtractionReviewProps> = ({
  documentId,
  extractedData,
  onDataSaved
}) => {
  const [data, setData] = useState<ExtractedData>(extractedData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleHeaderChange = (key: string, value: any) => {
    setData(prev => ({
      ...prev,
      header: { ...prev.header, [key]: value }
    }));
  };

  const handleLineItemChange = (index: number, key: string, value: any) => {
    setData(prev => {
      const newItems = [...prev.line_items];
      newItems[index] = { ...newItems[index], [key]: value };

      // Auto recalculate amount if qty and rate are modified
      if (key === 'quantity' || key === 'rate') {
        const q = parseFloat(String(newItems[index].quantity ?? 0));
        const r = parseFloat(String(newItems[index].rate ?? 0));
        if (!isNaN(q) && !isNaN(r)) {
          newItems[index].amount = Math.round(q * r * 100) / 100;
        }
      }

      return { ...prev, line_items: newItems };
    });
  };

  const addLineItem = () => {
    setData(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { description: 'New Item', quantity: 1, unit: 'Nos', rate: 0, amount: 0 }
      ]
    }));
  };

  const removeLineItem = (index: number) => {
    setData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await DocumentService.updateDocumentData(documentId, data);
      onDataSaved(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Original Document Viewer */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[750px] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800">Source Document Preview</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
            {data.document_type}
          </span>
        </div>
        <div className="flex-1 bg-slate-100 p-3 overflow-auto flex items-center justify-center">
          <img
            src={DocumentService.getDocumentFileUrl(documentId)}
            alt="Source Bill"
            className="max-h-full max-w-full object-contain rounded-lg shadow-sm border border-slate-300"
            onError={(e) => {
              // Fallback for PDF or broken image
              (e.target as any).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Right Column: Editable Extracted Structured Data */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[750px] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-600" /> Extracted Structured Information
            </span>
            <p className="text-[11px] text-slate-500">Edit any OCR field before generating final Excel</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm ${
              saveSuccess ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Saved!
              </>
            ) : (
              'Save Corrections'
            )}
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Validation Warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Validation Discrepancies Detected
              </div>
              {data.warnings.map((w, idx) => (
                <p key={idx} className="text-xs text-amber-700 ml-6">
                  • {w}
                </p>
              ))}
            </div>
          )}

          {/* Header Level Data */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Header Fields
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Vendor / Supplier Name
                </label>
                <input
                  type="text"
                  value={data.header.vendor || ''}
                  onChange={(e) => handleHeaderChange('vendor', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Invoice / Bill Number
                </label>
                <input
                  type="text"
                  value={data.header.invoice_number || ''}
                  onChange={(e) => handleHeaderChange('invoice_number', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Bill Date (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={data.header.date || ''}
                  onChange={(e) => handleHeaderChange('date', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Total Amount (₹)
                </label>
                <input
                  type="number"
                  value={data.header.total_amount ?? ''}
                  onChange={(e) => handleHeaderChange('total_amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Line Item Data */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Line Items ({data.line_items.length})
              </h4>
              <button
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Description / Material</th>
                    <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-16 text-center">Unit</th>
                    <th className="py-2.5 px-2 w-24 text-right">Rate</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.line_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity ?? ''}
                          onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => handleLineItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.rate ?? ''}
                          onChange={(e) => handleLineItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.amount ?? ''}
                          onChange={(e) => handleLineItemChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-bold text-slate-800"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeLineItem(idx)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
