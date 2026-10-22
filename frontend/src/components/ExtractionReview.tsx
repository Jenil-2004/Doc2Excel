import React, { useState, useEffect } from 'react';
import { Eye, Edit3, AlertTriangle, Plus, Trash2, Check, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';
import { ExtractedData, LineItem } from '../types';
import { DocumentService } from '../services/api';

interface ExtractionReviewProps {
  documentId: string;
  extractedData: ExtractedData;
  onDataSaved: (updated: ExtractedData) => void;
}

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  type?: 'text' | 'number';
  align?: 'left' | 'center' | 'right';
}

export const ExtractionReview: React.FC<ExtractionReviewProps> = ({
  documentId,
  extractedData,
  onDataSaved
}) => {
  const [data, setData] = useState<ExtractedData>(extractedData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (extractedData) {
      setData(extractedData);
    }
  }, [extractedData]);

  const handleHeaderChange = (key: string, value: any) => {
    setData(prev => {
      const updated = { ...prev.header, [key]: value };
      if (key === 'vendor') updated.company_name = value;
      return { ...prev, header: updated };
    });
  };

  const handleLineItemChange = (index: number, key: string, value: any) => {
    setData(prev => {
      const newItems = [...prev.line_items];
      newItems[index] = { ...newItems[index], [key]: value };

      // Auto recalculate amount if qty and rate are modified in standard invoice
      if (key === 'quantity' || key === 'rate') {
        const q = parseFloat(String(newItems[index].quantity ?? 0));
        const r = parseFloat(String(newItems[index].rate ?? 0));
        if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
          newItems[index].amount = Math.round(q * r * 100) / 100;
        }
      }

      return { ...prev, line_items: newItems };
    });
  };

  // Determine dynamic columns based on actual extracted data
  const getColumns = (): ColumnDef[] => {
    if (!data.line_items || data.line_items.length === 0) {
      return [
        { key: 'description', label: 'Description / Item', align: 'left' },
        { key: 'quantity', label: 'Qty', align: 'center', width: 'w-20' },
        { key: 'unit', label: 'Unit', align: 'center', width: 'w-20' },
        { key: 'rate', label: 'Rate', align: 'right', width: 'w-24' },
        { key: 'amount', label: 'Amount', align: 'right', width: 'w-28' }
      ];
    }

    const first = data.line_items[0];
    const isCylinder = ('sample_no' in first && first.sample_no != null) || 
                       ('compressive_strength_psi' in first && first.compressive_strength_psi != null) || 
                       ('max_load_lbs' in first && first.max_load_lbs != null) ||
                       data.document_type === 'Concrete Test Report';

    if (isCylinder) {
      return [
        { key: 'sample_no', label: 'Sample #', align: 'center', width: 'w-16' },
        { key: 'cast_date', label: 'Cast Date', align: 'center', width: 'w-24' },
        { key: 'date_received', label: 'Date Rcvd', align: 'center', width: 'w-24' },
        { key: 'date_tested', label: 'Date Tested', align: 'center', width: 'w-24' },
        { key: 'age_days', label: 'Age (Days)', align: 'center', width: 'w-20' },
        { key: 'diameter_in', label: 'Dia (in)', align: 'center', width: 'w-20' },
        { key: 'cross_area', label: 'Area (in²)', align: 'center', width: 'w-24' },
        { key: 'max_load_lbs', label: 'Max Load (lbs)', align: 'right', width: 'w-28' },
        { key: 'fracture_type', label: 'Fracture Type', align: 'center', width: 'w-24' },
        { key: 'compressive_strength_psi', label: 'Strength (PSI)', align: 'right', width: 'w-28' },
        { key: 'comments', label: 'Comments / Pass-Fail', align: 'left', width: 'w-32' }
      ];
    }

    const isInvoice = ('description' in first && first.description != null) || 
                      ('quantity' in first && first.quantity != null) || 
                      ('amount' in first && first.amount != null) ||
                      data.document_type === 'Tax Invoice' ||
                      data.document_type === 'Standard Invoice';

    if (isInvoice) {
      return [
        { key: 'description', label: 'Description / Material', align: 'left' },
        { key: 'quantity', label: 'Qty', align: 'center', width: 'w-20' },
        { key: 'unit', label: 'Unit', align: 'center', width: 'w-20' },
        { key: 'rate', label: 'Rate', align: 'right', width: 'w-24' },
        { key: 'amount', label: 'Amount', align: 'right', width: 'w-28' }
      ];
    }

    // Dynamic keys from extracted items
    const allKeys = new Set<string>();
    data.line_items.forEach(item => {
      Object.keys(item).forEach(k => {
        if (!k.startsWith('_') && k !== 'id' && item[k] !== null && item[k] !== undefined) {
          allKeys.add(k);
        }
      });
    });

    if (allKeys.size === 0) {
      Object.keys(first).filter(k => !k.startsWith('_') && k !== 'id').forEach(k => allKeys.add(k));
    }

    return Array.from(allKeys).map(k => ({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      align: typeof first[k] === 'number' ? 'right' : 'left'
    }));
  };

  const columns = getColumns();

  const addLineItem = () => {
    const isCylinder = columns.some(c => c.key === 'sample_no') || data.document_type === 'Concrete Test Report';
    const newItem: any = {};
    if (isCylinder) {
      newItem.sample_no = data.line_items.length + 1;
      newItem.cast_date = data.header.cast_date || data.header.date || '';
      newItem.date_received = '';
      newItem.date_tested = '';
      newItem.age_days = 28;
      newItem.diameter_in = 4;
      newItem.cross_area = 12.566;
      newItem.max_load_lbs = '';
      newItem.fracture_type = 5;
      newItem.compressive_strength_psi = '';
      newItem.comments = 'Pass';
    } else {
      newItem.description = 'New Item';
      newItem.quantity = 1;
      newItem.unit = 'Nos';
      newItem.rate = 0;
      newItem.amount = 0;
    }

    setData(prev => ({
      ...prev,
      line_items: [...prev.line_items, newItem]
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

  // Build clean list of header fields to display
  const knownHeaderMap: Record<string, string> = {
    vendor: 'Vendor / Company Name',
    company_name: 'Company / Project Name',
    project_number: 'Project Number / ID',
    tracking_number: 'Tracking Number',
    location: 'Placement Location',
    supplier: 'Supplier / Plant',
    technician: 'Field / Lab Technician',
    cast_date: 'Cast Date & Time',
    strength_required_psi: 'Required Strength (PSI)',
    slump: 'Slump',
    air: 'Air Content (%)',
    invoice_number: 'Invoice / Report Number',
    date: 'Date (DD/MM/YYYY)',
    total_amount: 'Total Amount'
  };

  const renderedKeys = new Set<string>();
  const effectiveHeaderEntries: { key: string; label: string; value: string }[] = [];

  const standardFields = [
    { key: 'vendor', label: 'Vendor / Company Name', value: String(data.header.vendor || data.header.company_name || '') },
    { key: 'project_number', label: 'Project Number / ID', value: String(data.header.project_number || '') },
    { key: 'tracking_number', label: 'Tracking Number', value: String(data.header.tracking_number || '') },
    { key: 'location', label: 'Placement Location', value: String(data.header.location || '') },
    { key: 'supplier', label: 'Supplier / Plant', value: String(data.header.supplier || '') },
    { key: 'technician', label: 'Field / Lab Technician', value: String(data.header.technician || '') },
    { key: 'cast_date', label: 'Cast Date & Time', value: String(data.header.cast_date || '') },
    { key: 'strength_required_psi', label: 'Required Strength (PSI)', value: String(data.header.strength_required_psi || '') },
    { key: 'slump', label: 'Slump', value: String(data.header.slump || '') },
    { key: 'air', label: 'Air Content (%)', value: String(data.header.air || '') },
    { key: 'invoice_number', label: 'Invoice / Report Number', value: String(data.header.invoice_number || '') },
    { key: 'date', label: 'Date (DD/MM/YYYY)', value: String(data.header.date || '') },
    { key: 'total_amount', label: 'Total Amount', value: data.header.total_amount != null ? String(data.header.total_amount) : '' }
  ];

  for (const item of standardFields) {
    if (item.value.trim() !== '') {
      effectiveHeaderEntries.push(item);
      renderedKeys.add(item.key);
      if (item.key === 'vendor') renderedKeys.add('company_name');
    }
  }

  // Discover any extra extracted header fields
  Object.keys(data.header || {}).forEach(k => {
    if (!renderedKeys.has(k) && !k.startsWith('_')) {
      const v = data.header[k];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        effectiveHeaderEntries.push({
          key: k,
          label: knownHeaderMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(v)
        });
        renderedKeys.add(k);
      }
    }
  });

  if (effectiveHeaderEntries.length === 0) {
    effectiveHeaderEntries.push(
      { key: 'vendor', label: 'Vendor / Company', value: '' },
      { key: 'invoice_number', label: 'Invoice / Bill Number', value: '' },
      { key: 'date', label: 'Date', value: '' },
      { key: 'total_amount', label: 'Total Amount', value: '' }
    );
  }

  const fileUrl = DocumentService.getDocumentFileUrl(documentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Source Document Viewer with Zoom Controls */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[780px] overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800">Source Document Preview</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
              {data.document_type}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 20))}
              className="p-1.5 hover:bg-slate-200 active:scale-90 rounded-lg text-slate-600 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-semibold text-slate-500 w-9 text-center select-none">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(250, prev + 20))}
              className="p-1.5 hover:bg-slate-200 active:scale-90 rounded-lg text-slate-600 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-slate-200 active:scale-90 rounded-lg text-slate-600 transition cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-slate-200 active:scale-90 rounded-lg text-slate-600 transition cursor-pointer"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
          <img
            src={fileUrl}
            alt="Source Document"
            style={{ width: `${zoomLevel}%`, maxWidth: 'none' }}
            className="rounded-lg shadow-md border border-slate-300 transition-all duration-150"
          />
        </div>
      </div>

      {/* Right Column: Editable Extracted Structured Data */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[780px] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75">
          <div>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-600" /> Extracted Structured Information
            </span>
            <p className="text-[11px] text-slate-500">
              Verified fields extracted by AI · Click any cell to edit before exporting
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer active:scale-95 ${
              saveSuccess
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Save Corrections</span>
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
              Document Header & Metadata
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {effectiveHeaderEntries.map((entry) => (
                <div key={entry.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1 truncate">
                    {entry.label}
                  </label>
                  <input
                    type="text"
                    value={(data.header[entry.key] !== null && data.header[entry.key] !== undefined && data.header[entry.key] !== '') ? data.header[entry.key] : (entry.value ?? '')}
                    onChange={(e) => handleHeaderChange(entry.key, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Line Item Data */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Line Items ({data.line_items.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  {columns.length} columns extracted
                </span>
              </div>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition border border-sky-200 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className={`py-2.5 px-3 text-${col.align || 'left'} ${col.width || ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.line_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      {columns.map(col => {
                        const val = item[col.key] ?? '';
                        return (
                          <td key={col.key} className="p-1.5">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => handleLineItemChange(idx, col.key, e.target.value)}
                              className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-${col.align || 'left'} text-slate-800 focus:bg-sky-50/30 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-sm`}
                            />
                          </td>
                        );
                      })}
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Delete this row"
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

export default ExtractionReview;
