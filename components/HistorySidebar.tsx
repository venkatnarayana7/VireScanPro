
import React from 'react';
import { ForensicHistoryItem } from '../types';
import { Clock, Trash2, ChevronRight, FileText, Search } from 'lucide-react';

interface HistorySidebarProps {
  history: ForensicHistoryItem[];
  onSelectItem: (item: ForensicHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  isDark?: boolean;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelectItem, onDeleteItem, isDark }) => {
  const [filter, setFilter] = React.useState('');

  const filteredHistory = history.filter(item => 
    item.text.toLowerCase().includes(filter.toLowerCase()) ||
    item.result.summary.toLowerCase().includes(filter.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
          <Clock size={16} className="text-indigo-500" /> Audit History
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search scans..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-6">
            <FileText size={32} className="opacity-20 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">No audits found</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div 
              key={item.id} 
              className="group relative bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 transition-all cursor-pointer hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900"
              onClick={() => onSelectItem(item)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                  {item.result.originalityScore}% Original
                </span>
                <span className="text-[9px] font-bold text-slate-400">{formatDate(item.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-medium leading-relaxed">
                {item.text}
              </p>
              
              <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                   <div className={`h-1.5 w-1.5 rounded-full ${item.result.writingScores.plagiarism ? 'bg-red-500' : 'bg-emerald-500'}`} />
                   <div className={`h-1.5 w-1.5 rounded-full ${item.result.aiScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
