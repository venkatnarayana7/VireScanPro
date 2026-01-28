
import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react';
import { WritingIssueCounts } from '../types';

interface WritingReportProps {
  scores: WritingIssueCounts;
  isDark?: boolean;
}

const WritingReport: React.FC<WritingReportProps> = ({ scores, isDark }) => {
  const categories = [
    { label: 'Plagiarism found', value: scores.plagiarism, isBinary: true },
    { label: 'Grammar', value: scores.grammar, isBinary: false },
    { label: 'Spelling', value: scores.spelling, isBinary: false },
    { label: 'Punctuation', value: scores.punctuation, isBinary: false },
    { label: 'Conciseness', value: scores.conciseness, isBinary: false },
    { label: 'Readability', value: scores.readability, isBinary: false },
    { label: 'Word choice', value: scores.wordChoice, isBinary: false },
    { label: 'Additional issues', value: scores.additional, isBinary: false },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center relative ${scores.plagiarism ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
          <div className={`absolute inset-0 rounded-full border-4 animate-ping opacity-20 ${scores.plagiarism ? 'border-red-500' : 'border-emerald-500'}`} />
          {scores.plagiarism ? (
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-black">!</div>
          ) : (
            <CheckCircle2 className="text-emerald-500 w-10 h-10" />
          )}
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {scores.plagiarism ? "Plagiarism Detected" : "Integrity Validated"}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {scores.additional > 0 ? `We found ${scores.additional + scores.grammar + scores.conciseness} writing issues.` : "Your text looks clean and professional."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
        {categories.map((cat, i) => {
          const hasIssue = cat.isBinary ? cat.value === true : (cat.value as number) > 0;
          return (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 group">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {cat.label}
              </span>
              <div className="flex items-center gap-2">
                {hasIssue ? (
                  cat.isBinary ? (
                    <div className="bg-red-500 rounded-full p-1 text-white"><XCircle size={14} fill="currentColor" className="text-red-500" /></div>
                  ) : (
                    <div className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-red-200 dark:shadow-none">
                      {cat.value}
                    </div>
                  )
                ) : (
                  <div className="bg-emerald-500 rounded-full p-1 text-white">
                    <CheckCircle2 size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WritingReport;
