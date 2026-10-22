import React from 'react';
import { Sparkles, FileText } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, action }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </header>
  );
};
