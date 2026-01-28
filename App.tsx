import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlagiarismService } from './services/geminiService';
import {
  AnalysisResult,
  AnalysisStatus,
  User,
  ForensicHistoryItem,
  HumanizationMode,
  RewriteResult,
} from './types';
import { storageService } from './services/storageService';
import { cryptoService } from './services/cryptoService';
import Gauge from './components/Gauge';

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
  Database,
  Wifi,
  WifiOff,
  Check,
} from 'lucide-react';

// Constants
const MIN_TEXT_LENGTH = 100;
const WORD_COUNT_THRESHOLD = 100;
const AUTH_CHECK_TIMEOUT = 4000;

// Service instance
const plagiarismService = new PlagiarismService();

interface AppState {
  currentUser: User | null;
  isAuthChecking: boolean;
  authType: 'login' | 'signup';
  inputText: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: string | null;
  isRewriting: boolean;
  mode: HumanizationMode;
  rewriteResult: RewriteResult | null;
  isDarkMode: boolean;

  isUserMenuOpen: boolean;
  history: ForensicHistoryItem[];
  showHistory: boolean;
}

const initialState: AppState = {
  currentUser: null,
  isAuthChecking: true,
  authType: 'login',
  inputText: '',
  status: AnalysisStatus.IDLE,
  result: null,
  error: null,
  isRewriting: false,
  mode: HumanizationMode.NATURAL,
  rewriteResult: null,
  isDarkMode: false,

  isUserMenuOpen: false,
  history: [],
  showHistory: false,
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(initialState);

  // Update helper
  const updateState = useCallback(
    (updates: Partial<AppState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Initialize auth on mount
  useEffect(() => {
    const authTimeout = setTimeout(() => {
      if (state.isAuthChecking) {
        updateState({ isAuthChecking: false });
      }
    }, AUTH_CHECK_TIMEOUT);

    const unsubscribe = storageService.subscribeToAuth((user) => {
      updateState({ currentUser: user, isAuthChecking: false });
      clearTimeout(authTimeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  // Dark mode effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (state.isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  // Load history when user changes
  useEffect(() => {
    const loadHistory = async () => {
      if (state.currentUser) {
        try {
          const items = await storageService.getHistory(state.currentUser.id);
          updateState({ history: items });
        } catch (err) {
          console.error('Failed to load history:', err);
          updateState({ error: 'Unable to load forensic vault.' });
        }
      }
    };

    loadHistory();
  }, [state.currentUser]);

  // Handlers
  const handleLogout = useCallback(async () => {
    try {
      await storageService.logout();
      updateState({
        currentUser: null,
        isUserMenuOpen: false,
        history: [],
        result: null,
        inputText: '',
        status: AnalysisStatus.IDLE,
        rewriteResult: null,
        error: null,
      });
    } catch (err) {
      console.error('Logout failed:', err);
      updateState({ error: 'Failed to logout. Please try again.' });
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    const { inputText, currentUser } = state;

    if (!inputText.trim() || !currentUser) {
      updateState({ error: 'Please provide text to analyze.' });
      return;
    }

    if (inputText.length < MIN_TEXT_LENGTH) {
      updateState({
        error: `Audit requires a minimum of ${MIN_TEXT_LENGTH} characters.`,
      });
      return;
    }

    updateState({ status: AnalysisStatus.SCANNING, error: null });

    try {
      const analysisResult = await plagiarismService.analyzeText(inputText);
      updateState({
        result: analysisResult,
        status: AnalysisStatus.COMPLETED,
      });

      // Generate SHA-512 Hash for Integrity Trail
      const integrityHash = await cryptoService.generateSHA512(inputText);

      // Save to history
      const historyItem: Omit<ForensicHistoryItem, 'id'> = {
        timestamp: new Date().toISOString(),
        text: inputText,
        result: analysisResult,
        hash: integrityHash,
      };

      await storageService.saveHistoryItem(currentUser.id, historyItem);

      const updatedHistory = await storageService.getHistory(currentUser.id);
      updateState({ history: updatedHistory });
    } catch (err: any) {
      const errorMessage =
        err.message || 'Forensic analysis failed. Please try again.';
      updateState({ error: errorMessage, status: AnalysisStatus.ERROR });
    }
  }, [state.inputText, state.currentUser]);

  const handleRewrite = useCallback(async () => {
    const { inputText, mode } = state;

    if (!inputText.trim()) {
      updateState({ error: 'Please provide text to rewrite.' });
      return;
    }

    updateState({ isRewriting: true, error: null });

    try {
      const rewriteRes = await plagiarismService.rewriteToOriginal(
        inputText,
        mode
      );
      updateState({ rewriteResult: rewriteRes, status: AnalysisStatus.IDLE });
    } catch (err: any) {
      const errorMessage =
        err.message || 'Rewrite operation failed. Please try again.';
      updateState({ error: errorMessage });
    } finally {
      updateState({ isRewriting: false });
    }
  }, [state.inputText, state.mode]);

  const handleApplyRewrite = useCallback(() => {
    if (state.rewriteResult) {
      updateState({
        inputText: state.rewriteResult.humanizedText,
        rewriteResult: null,
        result: null,
        status: AnalysisStatus.IDLE,
      });
    }
  }, [state.rewriteResult]);

  const handleLoadHistoryItem = useCallback((item: ForensicHistoryItem) => {
    updateState({
      inputText: item.text,
      result: item.result,
      status: AnalysisStatus.COMPLETED,
      showHistory: false,
      rewriteResult: null,
    });
  }, []);

  const handleDeleteHistoryItem = useCallback(
    async (id: string) => {
      if (state.currentUser) {
        try {
          await storageService.deleteHistoryItem(state.currentUser.id, id);
          updateState({
            history: state.history.filter((item) => item.id !== id),
          });
        } catch (err) {
          console.error('Failed to delete history item:', err);
          updateState({ error: 'Unable to delete history item.' });
        }
      }
    },
    [state.currentUser, state.history]
  );

  const handleClearEditor = useCallback(() => {
    updateState({
      inputText: '',
      result: null,
      status: AnalysisStatus.IDLE,
      rewriteResult: null,
      error: null,
    });
  }, []);

  const handleDiscardRewrite = useCallback(() => {
    updateState({ rewriteResult: null });
  }, []);

  const handleToggleAuthType = useCallback(() => {
    updateState({
      authType: state.authType === 'login' ? 'signup' : 'login',
    });
  }, [state.authType]);

  // Computed values
  const wordCount = useMemo(
    () => state.inputText.split(/\s+/).filter(Boolean).length,
    [state.inputText]
  );

  const isProcessing = useMemo(
    () => state.status === AnalysisStatus.SCANNING || state.isRewriting,
    [state.status, state.isRewriting]
  );

  const isEditorDisabled = useMemo(
    () => isProcessing || state.status === AnalysisStatus.COMPLETED,
    [isProcessing, state.status]
  );

  const mainColumnSpan = useMemo(
    () => (state.showHistory ? 'lg:col-span-5' : 'lg:col-span-8'),
    [state.showHistory]
  );

  const sidebarColumnSpan = useMemo(
    () => (state.showHistory ? 'lg:col-span-7' : 'lg:col-span-4'),
    [state.showHistory]
  );

  const connectionStatus = useMemo(
    () => storageService.isLocalMode(),
    []
  );

  // Render functions
  const renderHighlightedText = useCallback(() => {
    if (!state.result) return state.inputText;

    let highlighted = state.inputText;
    state.result.highlights.forEach((highlight) => {
      const isPlagiarism = highlight.sourceUrl !== '';
      const bgColor = isPlagiarism
        ? state.isDarkMode
          ? 'bg-red-900/40'
          : 'bg-red-100'
        : state.isDarkMode
          ? 'bg-amber-900/40'
          : 'bg-amber-100';
      const textColor = isPlagiarism
        ? state.isDarkMode
          ? 'text-red-300'
          : 'text-red-900'
        : state.isDarkMode
          ? 'text-amber-300'
          : 'text-amber-900';
      const borderColor = isPlagiarism ? 'border-red-500' : 'border-amber-500';

      const escapedText = highlight.text.replace(
        /[-\/\\^$*+?.()|[\]{}]/g,
        '\\$&'
      );
      const regex = new RegExp(`(${escapedText})`, 'gi');
      highlighted = highlighted.replace(
        regex,
        `<mark class="${bgColor} ${textColor} px-1 rounded-sm border-b-2 ${borderColor} cursor-help font-medium">$1</mark>`
      );
    });

    return (
      <div
        dangerouslySetInnerHTML={{ __html: highlighted }}
        className="whitespace-pre-wrap leading-relaxed text-lg"
      />
    );
  }, [state.result, state.inputText, state.isDarkMode]);

  const renderLoadingOverlay = useCallback(() => {
    if (!isProcessing) return null;

    const isRewriting = state.isRewriting;

    return (
      <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center z-10 transition-all duration-500 backdrop-blur-md">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-indigo-100 dark:border-slate-800 rounded-full border-t-indigo-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            {isRewriting ? (
              <Wand2 className="text-indigo-600" size={32} />
            ) : (
              <Activity className="text-indigo-600" size={32} />
            )}
          </div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          {isRewriting ? 'Syntactic Shifting Active' : 'Forensic Audit Processing'}
        </h3>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
          Consulting 80B+ Global Indices...
        </p>
      </div>
    );
  }, [isProcessing, state.isRewriting]);

  const renderAuthChecking = useCallback(() => {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-indigo-600/50" size={24} />
          </div>
        </div>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
          Initializing Forensic Core
        </h2>
        <p className="text-[10px] text-slate-500 mt-2 font-bold tracking-widest">
          ESTABLISHING SECURE HANDSHAKE...
        </p>
      </div>
    );
  }, []);

  const renderAuthPage = useCallback(() => {
    return (
      <AuthPage
        type={state.authType}
        toggleType={handleToggleAuthType}
        onAuthSuccess={(user) => updateState({ currentUser: user })}
      />
    );
  }, [state.authType]);

  // Early returns
  if (state.isAuthChecking) {
    return renderAuthChecking();
  }

  if (!state.currentUser) {
    return renderAuthPage();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col">


      {/* Header */}
      <AppHeader
        currentUser={state.currentUser}
        isDarkMode={state.isDarkMode}
        isUserMenuOpen={state.isUserMenuOpen}
        showHistory={state.showHistory}
        connectionStatus={connectionStatus}
        onToggleDarkMode={() => updateState({ isDarkMode: !state.isDarkMode })}
        onToggleHistory={() => updateState({ showHistory: !state.showHistory })}
        onToggleUserMenu={() =>
          updateState({ isUserMenuOpen: !state.isUserMenuOpen })
        }

        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Section */}
        <EditorSection
          mainColumnSpan={mainColumnSpan}
          inputText={state.inputText}
          status={state.status}
          result={state.result}
          rewriteResult={state.rewriteResult}
          isProcessing={isProcessing}
          isEditorDisabled={isEditorDisabled}
          wordCount={wordCount}
          error={state.error}
          isDarkMode={state.isDarkMode}
          onInputChange={(text) => updateState({ inputText: text })}
          onAnalyze={handleAnalyze}
          onClear={handleClearEditor}
          onRenderHighlightedText={renderHighlightedText}
          onRenderLoadingOverlay={renderLoadingOverlay}
          onApplyRewrite={handleApplyRewrite}
          onDiscardRewrite={handleDiscardRewrite}
          onEditorClick={() => {
            updateState({ status: AnalysisStatus.IDLE, rewriteResult: null });
          }}
          onForensicsClick={() => {
            updateState({ status: AnalysisStatus.COMPLETED, rewriteResult: null });
          }}
        />

        {/* Sidebar Section */}
        <SidebarSection
          sidebarColumnSpan={sidebarColumnSpan}
          showHistory={state.showHistory}
          history={state.history}
          result={state.result}
          rewriteResult={state.rewriteResult}
          mode={state.mode}
          isDarkMode={state.isDarkMode}
          isRewriting={state.isRewriting}
          onLoadHistoryItem={handleLoadHistoryItem}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          onCloseHistory={() => updateState({ showHistory: false })}
          onChangeMode={(mode) => updateState({ mode })}
          onRewrite={handleRewrite}
        />
      </main>
    </div>
  );
};

// Sub-component: Header
interface AppHeaderProps {
  currentUser: User;
  isDarkMode: boolean;
  isUserMenuOpen: boolean;
  showHistory: boolean;
  connectionStatus: boolean;
  onToggleDarkMode: () => void;
  onToggleHistory: () => void;
  onToggleUserMenu: () => void;

  onLogout: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  isDarkMode,
  isUserMenuOpen,
  showHistory,
  connectionStatus,
  onToggleDarkMode,
  onToggleHistory,
  onToggleUserMenu,

  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-xl shadow-lg">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 leading-tight">
            VeriScan Pro
          </h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Forensic Intelligence v3.5
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus
          isOffline={connectionStatus}
          isDarkMode={isDarkMode}
        />

        <button
          onClick={onToggleHistory}
          className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${showHistory
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600'
            }`}
        >
          <History size={20} />
          <span className="text-xs font-black hidden lg:block uppercase tracking-widest">
            Vault
          </span>
        </button>

        <button
          onClick={onToggleDarkMode}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />



        <UserMenu
          currentUser={currentUser}
          isOpen={isUserMenuOpen}
          onToggle={onToggleUserMenu}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
};

// Sub-component: Connection Status
interface ConnectionStatusProps {
  isOffline: boolean;
  isDarkMode: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOffline,
  isDarkMode,
}) => {
  return (
    <div
      className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOffline
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'
        }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
      />
      <span
        className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isOffline
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-emerald-700 dark:text-emerald-400'
          }`}
      >
        {isOffline ? (
          <>
            Offline Mode <WifiOff size={10} />
          </>
        ) : (
          <>
            Cloud Sync <Wifi size={10} />
          </>
        )}
      </span>
    </div>
  );
};

// Sub-component: User Menu
interface UserMenuProps {
  currentUser: User;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  isOpen,
  onToggle,
  onLogout,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 pr-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-xs">
          {currentUser.name.charAt(0)}
        </div>
        <div className="text-left hidden md:block">
          <div className="text-[11px] font-black leading-none mb-0.5">
            {currentUser.name}
          </div>
          <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">
            {currentUser.tier} Profile
          </div>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Operative ID
            </p>
            <p className="text-xs font-bold truncate text-slate-600 dark:text-slate-300">
              {currentUser.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors font-bold text-xs"
          >
            <LogOut size={16} /> Termination Session
          </button>
        </div>
      )}
    </div>
  );
};

// Sub-component: Editor Section
interface EditorSectionProps {
  mainColumnSpan: string;
  inputText: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  rewriteResult: RewriteResult | null;
  isProcessing: boolean;
  isEditorDisabled: boolean;
  wordCount: number;
  error: string | null;
  isDarkMode: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  onRenderHighlightedText: () => React.ReactNode;
  onRenderLoadingOverlay: () => React.ReactNode;
  onApplyRewrite: () => void;
  onDiscardRewrite: () => void;
  onEditorClick: () => void;
  onForensicsClick: () => void;
}

const EditorSection: React.FC<EditorSectionProps> = ({
  mainColumnSpan,
  inputText,
  status,
  result,
  rewriteResult,
  isProcessing,
  isEditorDisabled,
  wordCount,
  error,
  isDarkMode,
  onInputChange,
  onAnalyze,
  onClear,
  onRenderHighlightedText,
  onRenderLoadingOverlay,
  onApplyRewrite,
  onDiscardRewrite,
  onEditorClick,
  onForensicsClick,
}) => {
  return (
    <div className={`flex flex-col gap-6 transition-all duration-500 ${mainColumnSpan}`}>
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[60vh] lg:min-h-[70vh]">
        {/* Tabs */}
        <EditorTabs
          status={status}
          hasResult={!!result}
          hasRewriteResult={!!rewriteResult}
          onEditorClick={onEditorClick}
          onForensicsClick={onForensicsClick}
          onClear={onClear}
        />

        {/* Content Area */}
        <div className="flex-1 relative overflow-auto p-6 lg:p-12">
          {status === AnalysisStatus.COMPLETED ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
              {onRenderHighlightedText()}
            </div>
          ) : rewriteResult ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-lg">
              {rewriteResult.humanizedText}
            </div>
          ) : (
            <textarea
              className="w-full h-full resize-none border-none focus:ring-0 text-base lg:text-xl text-slate-800 dark:text-slate-100 leading-relaxed bg-transparent font-medium"
              placeholder="Paste manuscript for forensic audit..."
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={isEditorDisabled}
            />
          )}

          {onRenderLoadingOverlay()}
        </div>

        {/* Footer */}
        <EditorFooter
          wordCount={wordCount}
          rewriteResult={rewriteResult}
          isProcessing={isProcessing}
          inputTextEmpty={!inputText.trim()}
          onAnalyze={onAnalyze}
          onApplyRewrite={onApplyRewrite}
          onDiscardRewrite={onDiscardRewrite}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-6 lg:px-8 py-4 lg:py-5 rounded-[2rem] flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <AlertTriangle size={18} />
          <span className="text-xs font-bold uppercase tracking-wide">{error}</span>
        </div>
      )}
    </div>
  );
};

// Helper: Editor Tabs
interface EditorTabsProps {
  status: AnalysisStatus;
  hasResult: boolean;
  hasRewriteResult: boolean;
  onEditorClick: () => void;
  onForensicsClick: () => void;
  onClear: () => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  status,
  hasResult,
  hasRewriteResult,
  onEditorClick,
  onForensicsClick,
  onClear,
}) => {
  return (
    <div className="px-5 py-4 lg:px-8 lg:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/50">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-[70vw]">
        <button
          onClick={onEditorClick}
          className={`px-4 lg:px-6 py-2 rounded-xl text-[9px] lg:text-[10px] font-black transition-all uppercase tracking-[0.2em] whitespace-nowrap ${status !== AnalysisStatus.COMPLETED && !hasRewriteResult
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
            : 'text-slate-500'
            }`}
        >
          Editor
        </button>
        {hasResult && (
          <button
            onClick={onForensicsClick}
            className={`px-4 lg:px-6 py-2 rounded-xl text-[9px] lg:text-[10px] font-black transition-all uppercase tracking-[0.2em] whitespace-nowrap ${status === AnalysisStatus.COMPLETED
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
              : 'text-slate-500'
              }`}
          >
            Forensics
          </button>
        )}
        {hasRewriteResult && (
          <button className="px-4 lg:px-6 py-2 rounded-xl text-[9px] lg:text-[10px] font-black transition-all uppercase tracking-[0.2em] whitespace-nowrap bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm">
            Humanized
          </button>
        )}
      </div>
      <button
        onClick={onClear}
        className="p-2.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex-shrink-0 ml-2"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

// Helper: Editor Footer
interface EditorFooterProps {
  wordCount: number;
  rewriteResult: RewriteResult | null;
  isProcessing: boolean;
  inputTextEmpty: boolean;
  onAnalyze: () => void;
  onApplyRewrite: () => void;
  onDiscardRewrite: () => void;
}

const EditorFooter: React.FC<EditorFooterProps> = ({
  wordCount,
  rewriteResult,
  isProcessing,
  inputTextEmpty,
  onAnalyze,
  onApplyRewrite,
  onDiscardRewrite,
}) => {
  return (
    <div className="px-6 py-6 lg:px-10 lg:py-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-6 justify-between items-center bg-slate-50/20 dark:bg-slate-900/20">
      <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
        <div className="flex items-center gap-2.5">
          <Type size={16} className="text-indigo-500" /> {wordCount} Words
        </div>
        <div className="flex items-center gap-2.5 hidden sm:flex">
          <Database size={16} className="text-emerald-500" /> Forensic Vault Protected
        </div>
      </div>
      <div className="flex gap-4 w-full sm:w-auto">
        {rewriteResult ? (
          <>
            <button
              onClick={onDiscardRewrite}
              className="px-8 py-5 rounded-2xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all uppercase text-[10px] tracking-[0.2em]"
            >
              Discard
            </button>
            <button
              onClick={onApplyRewrite}
              className="px-8 py-5 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] shadow-lg flex items-center gap-2"
            >
              <Check size={16} /> Use Text
            </button>
          </>
        ) : (
          <button
            onClick={onAnalyze}
            disabled={isProcessing || inputTextEmpty}
            className="w-full sm:w-auto bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-5 rounded-2xl font-black shadow-2xl transition-all active:scale-[0.98] uppercase text-[10px] tracking-[0.2em]"
          >
            RUN DEEP AUDIT
          </button>
        )}
      </div>
    </div>
  );
};

// Sub-component: Sidebar Section
interface SidebarSectionProps {
  sidebarColumnSpan: string;
  showHistory: boolean;
  history: ForensicHistoryItem[];
  result: AnalysisResult | null;
  rewriteResult: RewriteResult | null;
  mode: HumanizationMode;
  isDarkMode: boolean;
  isRewriting: boolean;
  onLoadHistoryItem: (item: ForensicHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onCloseHistory: () => void;
  onChangeMode: (mode: HumanizationMode) => void;
  onRewrite: () => void;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  sidebarColumnSpan,
  showHistory,
  history,
  result,
  rewriteResult,
  mode,
  isDarkMode,
  isRewriting,
  onLoadHistoryItem,
  onDeleteHistoryItem,
  onCloseHistory,
  onChangeMode,
  onRewrite,
}) => {
  return (
    <aside
      className={`flex flex-col gap-6 transition-all duration-500 ${sidebarColumnSpan}`}
    >
      {showHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-start">
          <HistorySidebar
            history={history}
            onSelectItem={onLoadHistoryItem}
            onDeleteItem={onDeleteHistoryItem}
            isDark={isDarkMode}
          />
          <VaultInfoPanel onClose={onCloseHistory} historyCount={history.length} />
        </div>
      ) : rewriteResult ? (
        <RewriteResultPanel rewriteResult={rewriteResult} isDarkMode={isDarkMode} />
      ) : (
        <AnalysisResultPanel
          result={result}
          mode={mode}
          isDarkMode={isDarkMode}
          isRewriting={isRewriting}
          onChangeMode={onChangeMode}
          onRewrite={onRewrite}
        />
      )}
    </aside>
  );
};

// Helper: Vault Info Panel
interface VaultInfoPanelProps {
  onClose: () => void;
  historyCount: number;
}

const VaultInfoPanel: React.FC<VaultInfoPanelProps> = ({ onClose, historyCount }) => {
  return (
    <div className="bg-indigo-600 rounded-[3rem] p-12 text-white flex flex-col justify-between overflow-hidden relative min-h-[450px] shadow-2xl">
      <Zap size={200} className="absolute -right-16 -bottom-16 opacity-10 rotate-12" />
      <div className="relative z-10">
        <h4 className="text-3xl font-black mb-8 tracking-tighter">
          Manuscript Vault
        </h4>
        <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-12 opacity-80">
          Every forensic audit is securely hashed and indexed. Sync across your
          professional network to maintain a verified integrity trail.
        </p>
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white/10 p-6 rounded-[2rem] backdrop-blur-md border border-white/5">
            <ShieldCheck className="text-indigo-300" size={24} />
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-0.5">
                Privacy Layer
              </span>
              <span className="text-xs font-bold">SHA-512 End-to-End</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/10 p-6 rounded-[2rem] backdrop-blur-md border border-white/5">
            <Activity className="text-indigo-300" size={24} />
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-0.5">
                Footprint
              </span>
              <span className="text-xs font-bold">{historyCount} Verified Entries</span>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="relative z-10 w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-[10px] tracking-[0.2em] mt-12 uppercase hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
      >
        CLOSE VAULT
      </button>
    </div>
  );
};

// Helper: Rewrite Result Panel
interface RewriteResultPanelProps {
  rewriteResult: RewriteResult;
  isDarkMode: boolean;
}

const RewriteResultPanel: React.FC<RewriteResultPanelProps> = ({
  rewriteResult,
  isDarkMode,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
          <Zap size={16} className="text-indigo-500" /> Transformation Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Gauge
            value={rewriteResult.originalAiProbability}
            label="Old AI Prob"
            color="#ef4444"
            isDark={isDarkMode}
          />
          <Gauge
            value={rewriteResult.newAiProbability}
            label="New AI Prob"
            color="#10b981"
            isDark={isDarkMode}
          />
        </div>
        <div className="mt-8 flex justify-center">
          <Gauge
            value={rewriteResult.readabilityScore}
            label="Readability"
            color="#3b82f6"
            isDark={isDarkMode}
          />
        </div>
      </div>

      <div className="bg-indigo-600 text-white rounded-[3rem] p-8 shadow-xl relative overflow-hidden">
        <Sparkles className="absolute -right-4 -top-4 opacity-20" size={120} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 relative z-10 flex items-center gap-2">
          <LayoutDashboard size={14} /> Tone Analysis
        </h3>
        <p className="font-bold text-lg mb-6 leading-relaxed relative z-10 opacity-90">
          {rewriteResult.toneAnalysis}
        </p>

        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 relative z-10">
          Key Changes
        </h3>
        <ul className="space-y-2 relative z-10">
          {rewriteResult.keyChanges.map((change: string, i: number) => (
            <li key={i} className="text-xs font-medium flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full mt-1.5 flex-shrink-0" />
              <span className="opacity-90">{change}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Helper: Analysis Result Panel
interface AnalysisResultPanelProps {
  result: AnalysisResult | null;
  mode: HumanizationMode;
  isDarkMode: boolean;
  isRewriting: boolean;
  onChangeMode: (mode: HumanizationMode) => void;
  onRewrite: () => void;
}

const AnalysisResultPanel: React.FC<AnalysisResultPanelProps> = ({
  result,
  mode,
  isDarkMode,
  isRewriting,
  onChangeMode,
  onRewrite,
}) => {
  return (
    <>
      {result && <WritingReport scores={result.writingScores} isDark={isDarkMode} />}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] shadow-xl border border-slate-200 dark:border-slate-800 p-6 lg:p-10 flex flex-col gap-6 lg:gap-8">
        <h3 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
          <LayoutDashboard size={16} className="text-indigo-500" /> Forensic
          Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-10">
          <Gauge
            value={result ? 100 - result.aiScore : 0}
            label="Real Time Humanity"
            color="#10b981"
            isDark={isDarkMode}
          />
          <Gauge
            value={result?.aiScore ?? 0}
            label="AI Percentage"
            color="#ef4444"
            isDark={isDarkMode}
          />
        </div>
      </div>

      {result && (
        <NeuralVerdictPanel
          result={result}
          mode={mode}
          isRewriting={isRewriting}
          onChangeMode={onChangeMode}
          onRewrite={onRewrite}
        />
      )}

      {result && result.sources.length > 0 && (
        <SourceEvidencePanel sources={result.sources} />
      )}
    </>
  );
};

// Helper: Neural Verdict Panel
interface NeuralVerdictPanelProps {
  result: AnalysisResult;
  mode: HumanizationMode;
  isRewriting: boolean;
  onChangeMode: (mode: HumanizationMode) => void;
  onRewrite: () => void;
}

const NeuralVerdictPanel: React.FC<NeuralVerdictPanelProps> = ({
  result,
  mode,
  isRewriting,
  onChangeMode,
  onRewrite,
}) => {
  const showRewriteOption =
    result.similarityScore > 5 || result.writingScores.conciseness > 0;

  return (
    <div className="bg-gradient-to-br from-indigo-700 to-violet-950 text-white rounded-[2rem] lg:rounded-[3rem] p-8 lg:p-12 relative overflow-hidden group shadow-2xl">
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none" />
      <Zap size={100} className="absolute -right-5 -top-5 opacity-10" />
      <div className="relative z-10">
        <h3 className="text-[9px] lg:text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-6 lg:mb-8 flex items-center gap-2">
          <Sparkles size={14} className="animate-pulse" /> Neural Verdict
        </h3>
        <p className="text-lg lg:text-xl font-bold italic mb-8 lg:mb-10 leading-relaxed opacity-95">
          "{result.summary}"
        </p>
        {showRewriteOption && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
              {Object.values(HumanizationMode).map((m) => (
                <button
                  key={m}
                  onClick={() => onChangeMode(m)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${mode === m
                    ? 'bg-white text-indigo-900 shadow-md'
                    : 'text-indigo-200 hover:bg-white/5'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={onRewrite}
              disabled={isRewriting}
              className="w-full py-5 bg-white text-indigo-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] uppercase active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2
                size={18}
                className={
                  isRewriting
                    ? 'animate-spin'
                    : 'animate-pulse text-indigo-500'
                }
              />{' '}
              HUMAN-SIGNATURE REWRITE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper: Source Evidence Panel
interface SourceEvidencePanelProps {
  sources: Array<{ title: string; uri: string }>;
}

const SourceEvidencePanel: React.FC<SourceEvidencePanelProps> = ({
  sources,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 shadow-sm">
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-2">
        <Globe size={14} className="text-indigo-500" /> Source Evidence
      </h3>
      <div className="space-y-6">
        {sources.slice(0, 3).map((source, i) => (
          <div
            key={i}
            className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group cursor-pointer shadow-sm"
          >
            <h5 className="text-[11px] font-black mb-1.5 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
              {source.title}
            </h5>
            <p className="text-[9px] text-slate-400 truncate mb-5 font-bold uppercase tracking-tighter">
              {source.uri}
            </p>
            <a
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black text-indigo-500 flex items-center gap-2 hover:underline tracking-[0.1em] uppercase"
            >
              <ExternalLink size={12} /> OPEN EVIDENCE
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
