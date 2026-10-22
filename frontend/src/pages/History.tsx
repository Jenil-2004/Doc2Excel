import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, ArrowRight, FileSpreadsheet, Layers } from 'lucide-react';
import { Header } from '../components/Header';
import { DashboardService } from '../services/api';
import { StatusBadge } from '../components/Badges';

export const HistoryPage: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    DashboardService.getStats()
      .then(res => setJobs(res.recent_jobs || []))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title="Extraction History & Jobs"
        subtitle="Review previous batch processing jobs, document OCR logs, and generated Excel files"
      />

      <div className="flex-1 w-full min-w-0 p-6 lg:p-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Processing Jobs History</h3>
            <span className="text-xs text-slate-400">{jobs.length} Total Jobs</span>
          </div>

          <div className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No past jobs found. Run a new extraction from the Upload page.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                      {job.id.substring(4, 8)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">{job.id}</div>
                      <div className="text-xs text-slate-400">
                        {job.doc_count || 1} Document(s) · Stage: {job.stage} · {new Date(job.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <StatusBadge status={job.status} />
                    <Link
                      to={`/review/${job.id}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      View Job <ArrowRight className="w-3.5 h-3.5" />
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
