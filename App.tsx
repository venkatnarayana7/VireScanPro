
import React, { useState, useEffect } from 'react';
import { PlagiarismService } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, User, ForensicHistoryItem } from './types';
import { storageService } from './services/storageService';
import Gauge from './components/Gauge';
import PricingModal from './components/PricingModal';
import WritingReport from './components/WritingReport';
import HistorySidebar from './components/HistorySidebar';
import { AuthPage } from './components/AuthPages';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  Trash2,
  LayoutDashboard,
  Wand2,
  Sparkles,
  Sun,
  Moon,
  Type,
  Zap,
  Globe,
  Activity,
  LogOut,
  ChevronDown,
  History,
  Loader2,
  Cloud,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';

const gemini = new PlagiarismService();

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [history, setHistory] = useState<ForensicHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const authTimeout = setTimeout(() => {
      if (isAuthChecking) {
        setIsAuthChecking(false);
      }
    }, 4000);

    const unsubscribe = storageService.subscribeToAuth((user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
      clearTimeout(authTimeout);
    });
    
    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
    };
  }, [isAuthChecking]);

  useEffect(() => {
    const loadHistory = async () => {
      if (currentUser) {
        try {
          const items = await storageService.getHistory(currentUser.id);
          setHistory(items);
        } catch (err) {
          console.error("History sync error:", err);
        }
      }
    };
    loadHistory();
  }, [currentUser]);

  const handleLogout = async () => {
    await storageService.logout();
    setCurrentUser(null);
    setIsUserMenuOpen(false);
    setHistory([]);
    setResult(null);
    setInputText('');
    setStatus(AnalysisStatus.IDLE);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() || !currentUser) return;
    if (inputText.length < 100) {
      setError("Audit requires a minimum of 100 characters.");
      return;
    }

    setStatus(AnalysisStatus.SCANNING);
    setError(null);
    
    try {
      const data = await gemini.analyzeText(inputText);
      setResult(data);
      setStatus(AnalysisStatus.COMPLETED);
      
      const historyItem: Omit<ForensicHistoryItem, 'id'> = {
        timestamp: new Date().toISOString(),
        text: inputText,
        result: data
      };
      await storageService.saveHistoryItem(currentUser.id, historyItem);
      
      const items = await storageService.getHistory(currentUser.id);
      setHistory(items);
    } catch (err: any) {
      setError(err.message || "Forensic node connection failed.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) return;
    setIsRewriting(true);
    setError(null);

    try {
      const rewritten = await gemini.rewriteToOriginal(inputText);
      setInputText(rewritten);
      setResult(null);
      setStatus(AnalysisStatus.IDLE);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRewriting(false);
    }
  };

  const loadHistoryItem = (item: ForensicHistoryItem) => {
    setInputText(item.text);
    setResult(item.result);
    setStatus(AnalysisStatus.COMPLETED);
    setShowHistory(false);
  };

  const deleteHistoryItem = async (id: string) => {
    if (currentUser) {
      await storageService.deleteHistoryItem(currentUser.id, id);
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const renderHighlightedText = () => {
    if (!result) return inputText;
    let highlighted = inputText;
    result.highlights.forEach((h) => {
      const isPlagiarism = h.sourceUrl !== "";
      const bgColor = isPlagiarism 
        ? (isDarkMode ? "bg-red-900/40" : "bg-red-100") 
        : (isDarkMode ? "bg-amber-900/40" : "bg-amber-100");
      const textColor = isPlagiarism 
        ? (isDarkMode ? "text-red-300" : "text-red-900") 
        : (isDarkMode ? "text-amber-300" : "text-amber-900");
      
      const regex = new RegExp(`(${h.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
      highlighted = highlighted.replace(regex, `<mark class="${bgColor} ${textColor} px-1 rounded-sm border-b-2 ${isPlagiarism ? 'border-red-500' : 'border-amber-500'} cursor-help font-medium">$1</mark>`);
    });
    return <div dangerouslySetInnerHTML={{ __html: highlighted }} className="whitespace-pre-wrap leading-relaxed text-lg" />;
  };

  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-indigo-600/50" size={24} />
          </div>
        </div>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initializing Forensic Core</h2>
        <p className="text-[10px] text-slate-500 mt-2 font-bold tracking-widest">ESTABLISHING SECURE HANDSHAKE...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage 
        type={authType} 
        toggleType={() => setAuthType(authType === 'login' ? 'signup' : 'login')}
        onAuthSuccess={setCurrentUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col">
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
      
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-xl shadow-lg">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 leading-tight">
              VeriScan Pro
            </h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Forensic Intelligence v3.5</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border ${storageService.isLocalMode() ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'}`}>
             <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${storageService.isLocalMode() ? 'bg-amber-500' : 'bg-emerald-500'}`} />
             <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${storageService.isLocalMode() ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
               {storageService.isLocalMode() ? (
                 <>Offline Mode <WifiOff size={10} /></>
               ) : (
                 <>Cloud Sync <Wifi size={10} /></>
               )}
             </span>
          </div>

          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${showHistory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}
          >
            <History size={20} />
            <span className="text-xs font-black hidden lg:block uppercase tracking-widest">Vault</span>
          </button>

          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <button onClick={() => setIsPricingOpen(true)} className="hidden sm:flex bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg items-center gap-2 uppercase tracking-widest">
             <Sparkles size={16} /> <span>Elite</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 pr-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-[11px] font-black leading-none mb-0.5">{currentUser.name}</div>
                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">{currentUser.tier} Profile</div>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operative ID</p>
                  <p className="text-xs font-bold truncate text-slate-600 dark:text-slate-300">{currentUser.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors font-bold text-xs"
                >
                  <LogOut size={16} /> Termination Session
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] mx-auto w-full p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor Main Section */}
        <div className={`flex flex-col gap-6 transition-all duration-500 ${showHistory ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[70vh]">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/50">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button onClick={() => setStatus(AnalysisStatus.IDLE)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em] ${status !== AnalysisStatus.COMPLETED ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Editor</button>
                {result && <button onClick={() => setStatus(AnalysisStatus.COMPLETED)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em] ${status === AnalysisStatus.COMPLETED ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Forensics</button>}
              </div>
              <button onClick={() => { setInputText(''); setResult(null); setStatus(AnalysisStatus.IDLE); }} className="p-2.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex-1 relative overflow-auto p-12">
              {status === AnalysisStatus.COMPLETED ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                   {renderHighlightedText()}
                </div>
              ) : (
                <textarea
                  className="w-full h-full resize-none border-none focus:ring-0 text-xl text-slate-800 dark:text-slate-100 leading-relaxed bg-transparent font-medium"
                  placeholder="Paste manuscript for forensic audit..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={status === AnalysisStatus.SCANNING || isRewriting}
                />
              )}

              {(status === AnalysisStatus.SCANNING || isRewriting) && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center z-10 transition-all duration-500 backdrop-blur-md">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-indigo-100 dark:border-slate-800 rounded-full border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       {isRewriting ? <Wand2 className="text-indigo-600" size={32} /> : <Activity className="text-indigo-600" size={32} />}
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                    {isRewriting ? "Syntactic Shifting Active" : "Forensic Audit Processing"}
                  </h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Consulting 80B+ Global Indices...</p>
                </div>
              )}
            </div>

            <div className="px-10 py-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-6 justify-between items-center bg-slate-50/20 dark:bg-slate-900/20">
               <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                 <div className="flex items-center gap-2.5"><Type size={16} className="text-indigo-500" /> {inputText.split(/\s+/).filter(Boolean).length} Words</div>
                 <div className="flex items-center gap-2.5 hidden sm:flex"><Database size={16} className="text-emerald-500" /> Forensic Vault Protected</div>
               </div>
               <div className="flex gap-4 w-full sm:w-auto">
                  <button 
                    onClick={handleAnalyze} 
                    disabled={status === AnalysisStatus.SCANNING || !inputText.trim()} 
                    className="w-full sm:w-auto bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white px-12 py-5 rounded-2xl font-black shadow-2xl transition-all active:scale-[0.98] uppercase text-[10px] tracking-[0.2em]"
                  >
                     RUN DEEP AUDIT
                  </button>
               </div>
            </div>
          </div>
          {error && <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-8 py-5 rounded-[2rem] flex items-center gap-3 animate-in slide-in-from-bottom-4"><AlertTriangle size={18} /> <span className="text-xs font-bold uppercase tracking-wide">{error}</span></div>}
        </div>

        {/* Dynamic Sidebar Section */}
        <aside className={`flex flex-col gap-6 transition-all duration-500 ${showHistory ? 'lg:col-span-7' : 'lg:col-span-4'}`}>
          {showHistory ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-start">
               <HistorySidebar 
                history={history} 
                onSelectItem={loadHistoryItem} 
                onDeleteItem={deleteHistoryItem}
                isDark={isDarkMode}
               />
               <div className="bg-indigo-600 rounded-[3rem] p-12 text-white flex flex-col justify-between overflow-hidden relative min-h-[450px] shadow-2xl">
                 <Zap size={200} className="absolute -right-16 -bottom-16 opacity-10 rotate-12" />
                 <div className="relative z-10">
                   <h4 className="text-3xl font-black mb-8 tracking-tighter">Manuscript Vault</h4>
                   <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-12 opacity-80">
                     Every forensic audit is securely hashed and indexed. 
                     Sync across your professional network to maintain a verified integrity trail.
                   </p>
                   <div className="space-y-6">
                     <div className="flex items-center gap-4 bg-white/10 p-6 rounded-[2rem] backdrop-blur-md border border-white/5">
                       <ShieldCheck className="text-indigo-300" size={24} />
                       <div>
                         <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-0.5">Privacy Layer</span>
                         <span className="text-xs font-bold">SHA-512 End-to-End</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-4 bg-white/10 p-6 rounded-[2rem] backdrop-blur-md border border-white/5">
                       <Activity className="text-indigo-300" size={24} />
                       <div>
                         <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-0.5">Footprint</span>
                         <span className="text-xs font-bold">{history.length} Verified Entries</span>
                       </div>
                     </div>
                   </div>
                 </div>
                 <button 
                  onClick={() => setShowHistory(false)}
                  className="relative z-10 w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-[10px] tracking-[0.2em] mt-12 uppercase hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
                 >
                   CLOSE VAULT
                 </button>
               </div>
            </div>
          ) : (
            <>
              {result && <WritingReport scores={result.writingScores} isDark={isDarkMode} />}
              
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-200 dark:border-slate-800 p-10 flex flex-col gap-8">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3"><LayoutDashboard size={16} className="text-indigo-500" /> Forensic Metrics</h3>
                <div className="grid grid-cols-2 gap-10">
                  <Gauge value={result?.originalityScore ?? 0} label="Originality" color="#4f46e5" isDark={isDarkMode} />
                  <Gauge value={result?.aiScore ?? 0} label="Humanity" color="#10b981" isDark={isDarkMode} />
                </div>
              </div>

              {result && (
                <div className="bg-gradient-to-br from-indigo-700 to-violet-950 text-white rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl">
                   <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none" />
                   <Zap size={100} className="absolute -right-5 -top-5 opacity-10" />
                   <div className="relative z-10">
                     <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-8 flex items-center gap-2"><Sparkles size={14} className="animate-pulse" /> Neural Verdict</h3>
                     <p className="text-xl font-bold italic mb-10 leading-relaxed opacity-95">"{result.summary}"</p>
                     {(result.similarityScore > 5 || result.writingScores.conciseness > 0) && (
                       <button onClick={handleRewrite} disabled={isRewriting} className="w-full py-5 bg-white text-indigo-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] uppercase active:scale-95">
                         <Wand2 size={18} className={isRewriting ? "animate-spin" : "animate-pulse text-indigo-500"} /> HUMAN-SIGNATURE REWRITE
                       </button>
                     )}
                   </div>
                </div>
              )}

              {result && result.sources.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 shadow-sm">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-2"><Globe size={14} className="text-indigo-500" /> Source Evidence</h3>
                  <div className="space-y-6">
                    {result.sources.slice(0, 3).map((s, i) => (
                      <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group cursor-pointer shadow-sm">
                        <h5 className="text-[11px] font-black mb-1.5 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{s.title}</h5>
                        <p className="text-[9px] text-slate-400 truncate mb-5 font-bold uppercase tracking-tighter">{s.uri}</p>
                        <a href={s.uri} target="_blank" className="text-[10px] font-black text-indigo-500 flex items-center gap-2 hover:underline tracking-[0.1em] uppercase"><ExternalLink size={12} /> OPEN EVIDENCE</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  );
};

export default App;
