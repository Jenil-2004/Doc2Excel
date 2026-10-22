import React, { useState } from 'react';
import { Download, Search, FileSpreadsheet, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { ExcelService } from '../services/api';

interface ExcelPreviewProps {
  fileId: string;
  filename: string;
  initialData: any[];
}

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({ fileId, filename, initialData }) => {
  const [data, setData] = useState<any[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract column keys from first row excluding internal meta keys
  const columns = data.length > 0
    ? Object.keys(data[0]).filter(k => !k.startsWith('_'))
    : [];

  const handleCellChange = (rowIndex: number, colKey: string, value: any) => {
    setData(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [colKey]: value };
      return updated;
    });
  };

  const addRow = () => {
    const emptyRow: any = {};
    columns.forEach(c => emptyRow[c] = '');
    setData(prev => [...prev, emptyRow]);
  };

  const deleteRow = (index: number) => {
    setData(prev => prev.filter((_, i) => i !== index));
  };

  const filteredData = data.filter(row =>
    columns.some(col => String(row[col] || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{filename}</h3>
            <p className="text-xs text-slate-500">
              {data.length} records generated · Excel styling and formulas preserved
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search cells..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>

          <a
            href={ExcelService.getDownloadUrl(fileId)}
            download={filename}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4" /> Download Final Excel (.xlsx)
          </a>
        </div>
      </div>

      {/* Interactive Editable Table */}
      <div className="overflow-x-auto max-h-[550px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider z-10">
              <th className="py-3 px-3 w-12 text-center">#</th>
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 px-4 min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    {col}
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              ))}
              <th className="py-3 px-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                  {rIdx + 1}
                </td>
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="py-1.5 px-2">
                    <input
                      type="text"
                      value={row[col] ?? ''}
                      onChange={(e) => handleCellChange(rIdx, col, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-medium text-slate-800 transition"
                    />
                  </td>
                ))}
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => deleteRow(rIdx)}
                    className="p-1 hover:bg-slate-100 text-slate-300 hover:text-rose-600 rounded transition"
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
  );
};
