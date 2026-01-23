
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  Database,
  ExternalLink,
  Settings2,
  DatabaseZap,
  Cloud
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { User } from '../types';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  type: 'login' | 'signup';
  toggleType: () => void;
}

export const AuthPage: React.FC<AuthProps> = ({ onAuthSuccess, type, toggleType }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupError, setSetupError] = useState(false);

  const handleOfflineMode = async () => {
    storageService.switchToLocal();
    setError('');
    setSetupError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSetupError(false);
    setLoading(true);

    try {
      if (type === 'signup') {
        const user = await storageService.signup(name, email, password);
        onAuthSuccess(user);
      } else {
        const user = await storageService.login(email, password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      console.error("Auth System Diagnostic:", err.code);
      
      if (err.code === 'auth/configuration-not-found') {
        setSetupError(true);
        setError('Firebase Authentication is not enabled in your console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already associated with an account.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Verification failed. Incorrect email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'The forensic node returned an error. Check connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocal = storageService.isLocalMode();

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex overflow-hidden">
      {/* Visual Branding Side */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-16 flex-col justify-between relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xl border border-white/10 shadow-2xl">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <span className="text-xs font-black text-white tracking-[0.4em] uppercase">VeriScan v4.0</span>
          </div>
          <h2 className="text-7xl font-black text-white leading-[1] mb-8 tracking-tighter">
            Audit <br /> <span className="text-indigo-400">Integrity</span>.
          </h2>
          <p className="text-indigo-100 text-lg font-medium opacity-70 max-w-sm leading-relaxed">
            The professional standard for forensic writing analysis and neural stealth verification.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8 border-t border-white/5 pt-12">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
             {isLocal ? <DatabaseZap className="text-amber-400" size={20} /> : <Cloud className="text-emerald-400" size={20} />}
             <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {isLocal ? 'Local Profile Mode' : 'Cloud Sync Enabled'}
             </span>
          </div>
        </div>
      </div>

      {/* Auth Interface Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400">
               {isLocal ? <Database size={16} /> : <Cloud size={16} />}
               <span className="text-[9px] font-black uppercase tracking-[0.3em]">{storageService.getProviderName()}</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              {type === 'login' ? 'Welcome Back' : 'Create Identity'}
            </h1>
            <p className="text-slate-500 font-medium">
              {type === 'login' ? 'Secure access to your manuscript vault.' : 'Initialize your forensic audit profile.'}
            </p>
          </div>

          {setupError ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                   <Settings2 size={24} />
                 </div>
                 <h3 className="font-black text-lg">Console Sync Required</h3>
               </div>
               
               <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                 Firebase is initialized, but the <span className="font-bold">Email/Password Provider</span> is disabled in your project console.
               </p>

               <div className="space-y-3 mb-8">
                 <a 
                   href="https://console.firebase.google.com/" 
                   target="_blank" 
                   className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                 >
                   <span>1. Open Project Console</span>
                   <ExternalLink size={14} />
                 </a>
                 <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                   2. Enable Email/Password Auth
                 </div>
               </div>

               <div className="flex flex-col gap-3">
                 <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] tracking-widest uppercase hover:bg-indigo-700 transition-all shadow-lg"
                 >
                   RE-SCAN CONNECTION
                 </button>
                 <button 
                  onClick={handleOfflineMode}
                  className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-black rounded-2xl text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                 >
                   <Database size={14} /> USE LOCAL FORENSIC CORE
                 </button>
               </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {type === 'signup' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      placeholder="Agent Smith"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    placeholder="name@agency.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Key</label>
                  {type === 'login' && <button type="button" className="text-[10px] font-bold text-indigo-600 uppercase hover:underline tracking-tighter">Reset Access</button>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 leading-tight">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 tracking-[0.2em] uppercase text-[10px] disabled:opacity-50"
              >
                {loading ? 'Analyzing Credentials...' : (
                  <>
                    {type === 'login' ? 'Authorize' : 'Initialize Vault'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-4 text-center">
                <p className="text-sm font-medium text-slate-500">
                  {type === 'login' ? "New Operative?" : "Already Authorized?"}
                  <button onClick={toggleType} className="ml-2 text-indigo-600 font-black hover:underline tracking-tight">
                    {type === 'login' ? 'Create profile' : 'Return to login'}
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
