import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

interface ProcessingStepperProps {
  currentStep: number;
}

export const ProcessingStepper: React.FC<ProcessingStepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 1, title: 'Upload Files', desc: 'Bills & Template' },
    { id: 2, title: 'OCR & Understand', desc: 'Preprocessing & Structuring' },
    { id: 3, title: 'Schema Mapping', desc: 'Dynamic Field Alignment' },
    { id: 4, title: 'Review & Edit', desc: 'Human Verification' },
    { id: 5, title: 'Excel Generated', desc: 'Preview & Download' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, idx) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-4 ring-sky-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : step.id}
                </div>
                <div>
                  <div className={`text-xs font-bold ${isCurrent ? 'text-sky-900' : isDone ? 'text-slate-800' : 'text-slate-600'}`}>
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-600 hidden sm:block">{step.desc}</div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
