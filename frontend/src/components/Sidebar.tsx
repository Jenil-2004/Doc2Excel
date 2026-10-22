import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileSpreadsheet, 
  Cpu, 
  CheckCircle2, 
  History, 
  Sparkles,
  Layers
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload & Process', icon: UploadCloud },
    { to: '/templates', label: 'Excel Templates', icon: FileSpreadsheet },
    { to: '/history', label: 'History & Jobs', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-slate-900 tracking-tight text-lg flex items-center gap-1.5">
            Doc2Excel <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-semibold">AI</span>
          </div>
          <p className="text-xs text-slate-600 font-medium">Universal Bill Extraction</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-600 uppercase">Menu</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Engine Status pill */}
      <div className="p-4 m-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-200">OCR Engine Online</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Tesseract v5.5 + Document Preprocessing + Rapid Schema Matcher ready.
        </p>
      </div>
    </aside>
  );
};
