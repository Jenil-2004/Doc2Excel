import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  Plus, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Header } from '../components/Header';
import { DashboardService } from '../services/api';
import { StatusBadge } from '../components/Badges';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    documents_count: 0,
    templates_count: 0,
    jobs_count: 0,
    generated_count: 0,
    recent_jobs: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardService.getStats()
      .then(res => setStats(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Document2Excel AI Dashboard"
        subtitle="Universal domain-independent bill & invoice extraction engine"
        action={
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Extraction Job
          </Link>
        }
      />

      <div className="p-8 space-y-8 flex-1 max-w-7xl">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Bills Processed</span>
              <FileText className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.documents_count}</div>
            <p className="text-[11px] text-slate-400 mt-1">Construction, medical, food, etc.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Templates Loaded</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.templates_count}</div>
            <p className="text-[11px] text-slate-400 mt-1">Custom user Excel schemas</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Processing Jobs</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.jobs_count}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total OCR extraction batches</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Excel Files Built</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.generated_count}</div>
            <p className="text-[11px] text-slate-400 mt-1">Formatted & downloaded</p>
          </div>
        </div>

        {/* Feature Banner */}
        <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Universal Template-Driven Architecture
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Turn any bill or invoice into your custom Excel format.
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              No hardcoded columns. Upload your civil construction bills, purchase invoices, medical slips, or hotel tariffs alongside your Excel template. Our OCR engine detects the structure and maps the fields dynamically.
            </p>
            <div className="pt-2">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-sky-500/25"
              >
                Start Extraction Pipeline <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Recent Extraction Jobs</h3>
              <p className="text-xs text-slate-500">Track current status and review generated Excel sheets</p>
            </div>
            <Link to="/history" className="text-xs text-sky-600 hover:underline font-bold">
              View All Jobs
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recent_jobs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No extraction jobs yet. Click "Start Extraction Pipeline" to begin.
              </div>
            ) : (
              stats.recent_jobs.map((job) => (
                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                      {job.id.substring(4, 8)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-800">{job.id}</div>
                      <div className="text-[11px] text-slate-400">
                        {job.doc_count || 1} Document(s) · Stage: {job.stage || 'Ready'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <StatusBadge status={job.status} />
                    <Link
                      to={`/review/${job.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      Open Job
                    </Link>
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
