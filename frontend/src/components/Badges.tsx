import React from 'react';
import { Check, Clock, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface ConfidenceBadgeProps {
  score?: number;
  showIcon?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score = 85, showIcon = true }) => {
  let color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = Check;
  let label = `${Math.round(score)}% Confident`;

  if (score < 70) {
    color = 'bg-amber-50 text-amber-700 border-amber-200';
    Icon = AlertTriangle;
    label = `${Math.round(score)}% Low Confidence`;
  } else if (score < 85) {
    color = 'bg-sky-50 text-sky-700 border-sky-200';
    Icon = Clock;
    label = `${Math.round(score)}% Good`;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'complete':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3" /> Complete
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </span>
      );
    case 'needs_review':
    case 'review':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" /> Needs Review
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};
