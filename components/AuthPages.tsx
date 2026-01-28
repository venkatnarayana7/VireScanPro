import React, { useState, useEffect, useCallback } from 'react';
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
  Cloud,
  Loader2,
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { User } from '../types';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  type: 'login' | 'signup';
  toggleType: () => void;
}

interface FormState {
  email: string;
  password: string;
  name: string;
  error: string;
  loading: boolean;
  setupError: boolean;
}

const initialFormState: FormState = {
  email: '',
  password: '',
  name: '',
  error: '',
  loading: false,
  setupError: false,
};

export const AuthPage: React.FC<AuthProps> = ({
  onAuthSuccess,
  type,
  toggleType,
}) => {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        setIsCheckingSession(true);
        const currentUser = await storageService.getCurrentUser();

        if (currentUser) {
          onAuthSuccess(currentUser);
          return;
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [onAuthSuccess]);

  // Persist auth state listener
  useEffect(() => {
    const unsubscribe = storageService.onAuthStateChanged((user) => {
      if (user) {
        onAuthSuccess(user);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [onAuthSuccess]);

  const updateFormState = useCallback((updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleOfflineMode = useCallback(async () => {
    try {
      storageService.switchToLocal();
      updateFormState({ error: '', setupError: false });
    } catch (err) {
      console.error('Failed to switch to offline mode:', err);
      updateFormState({
        error: 'Failed to initialize offline mode. Please try again.',
      });
    }
  }, [updateFormState]);

  const validateForm = useCallback((): boolean => {
    if (!formState.email || !formState.password) {
      updateFormState({ error: 'Email and password are required.' });
      return false;
    }

    if (!formState.email.includes('@')) {
      updateFormState({ error: 'Please enter a valid email address.' });
      return false;
    }

    if (formState.password.length < 6) {
      updateFormState({
        error: 'Password must be at least 6 characters.',
      });
      return false;
    }

    if (type === 'signup' && !formState.name.trim()) {
      updateFormState({ error: 'Full name is required for signup.' });
      return false;
    }

    return true;
  }, [formState, type, updateFormState]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      updateFormState({ error: '', loading: true });

      try {
        let user: User;

        if (type === 'signup') {
          user = await storageService.signup(
            formState.name,
            formState.email,
            formState.password
          );
        } else {
          user = await storageService.login(
            formState.email,
            formState.password
          );
        }

        // Auth state change listener will handle the redirect
        onAuthSuccess(user);
      } catch (err: any) {
        console.error('Auth Error Code:', err.code, 'Message:', err.message);

        const errorHandling = {
          'auth/configuration-not-found': {
            message: 'Firebase Authentication is not configured.',
            setupError: true,
          },
          'auth/email-already-in-use': {
            message: 'This email is already associated with an account.',
            setupError: false,
          },
          'auth/invalid-credential': {
            message: 'Verification failed. Incorrect email or password.',
            setupError: false,
          },
          'auth/user-not-found': {
            message: 'No account found with this email address.',
            setupError: false,
          },
          'auth/wrong-password': {
            message: 'Incorrect password. Please try again.',
            setupError: false,
          },
          'auth/weak-password': {
            message: 'Password must be at least 6 characters long.',
            setupError: false,
          },
          'auth/too-many-requests': {
            message:
              'Too many login attempts. Please try again in a few minutes.',
            setupError: false,
          },
          'auth/network-request-failed': {
            message:
              'Network error. Please check your connection and try again.',
            setupError: false,
          },
        };

        const errorInfo =
          errorHandling[err.code as keyof typeof errorHandling] || {
            message:
              err.message || 'An unexpected error occurred. Please try again.',
            setupError: false,
          };

        updateFormState({
          error: errorInfo.message,
          setupError: errorInfo.setupError,
        });
      } finally {
        updateFormState({ loading: false });
      }
    },
    [type, formState, validateForm, updateFormState, onAuthSuccess]
  );

  const handleFieldChange = useCallback(
    (field: keyof Omit<FormState, 'error' | 'loading' | 'setupError'>) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateFormState({ [field]: e.target.value });
      },
    [updateFormState]
  );

  const isLocal = storageService.isLocalMode();

  if (isCheckingSession) {
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            Checking Session...
          </p>
        </div>
      </div>
    );
  }

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
            <span className="text-xs font-black text-white tracking-[0.4em] uppercase">
              VeriScan v4.0
            </span>
          </div>
          <h2 className="text-7xl font-black text-white leading-[1] mb-8 tracking-tighter">
            Audit <br /> <span className="text-indigo-400">Integrity</span>.
          </h2>
          <p className="text-indigo-100 text-lg font-medium opacity-70 max-w-sm leading-relaxed">
            The professional standard for forensic writing analysis and neural
            stealth verification.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8 border-t border-white/5 pt-12">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            {isLocal ? (
              <DatabaseZap className="text-amber-400" size={20} />
            ) : (
              <Cloud className="text-emerald-400" size={20} />
            )}
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
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                {storageService.getProviderName()}
              </span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              {type === 'login' ? 'Welcome Back' : 'Create Identity'}
            </h1>
            <p className="text-slate-500 font-medium">
              {type === 'login'
                ? 'Secure access to your manuscript vault.'
                : 'Initialize your forensic audit profile.'}
            </p>
          </div>

          {formState.setupError ? (
            <SetupErrorPanel
              onRescan={() => window.location.reload()}
              onOfflineMode={handleOfflineMode}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {type === 'signup' && (
                <FormInput
                  label="Full Name"
                  type="text"
                  value={formState.name}
                  onChange={handleFieldChange('name')}
                  placeholder="Agent Smith"
                  icon={<UserIcon size={18} />}
                />
              )}

              <FormInput
                label="Email Address"
                type="email"
                value={formState.email}
                onChange={handleFieldChange('email')}
                placeholder="name@agency.com"
                icon={<Mail size={18} />}
              />

              <PasswordInput
                value={formState.password}
                onChange={handleFieldChange('password')}
                type={type}
              />

              {formState.error && (
                <ErrorAlert
                  error={formState.error}
                  isLocal={isLocal}
                  onOfflineMode={handleOfflineMode}
                />
              )}

              <SubmitButton
                type={type}
                loading={formState.loading}
                disabled={formState.loading}
              />

              <AuthToggle type={type} onToggle={toggleType} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component: Form Input
interface FormInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        <input
          required
          type={type}
          value={value}
          onChange={onChange}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          placeholder={placeholder}
          disabled={false}
        />
      </div>
    </div>
  );
};

// Sub-component: Password Input
interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type: 'login' | 'signup';
}

const PasswordInput: React.FC<PasswordInputProps> = ({ value, onChange, type }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Master Key
        </label>
        {type === 'login' && (
          <button
            type="button"
            className="text-[10px] font-bold text-indigo-600 uppercase hover:underline tracking-tighter disabled:opacity-50"
            disabled
            title="Password reset coming soon"
          >
            Reset Access
          </button>
        )}
      </div>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          required
          type="password"
          value={value}
          onChange={onChange}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          placeholder="••••••••"
        />
      </div>
    </div>
  );
};

// Sub-component: Error Alert
interface ErrorAlertProps {
  error: string;
  isLocal: boolean;
  onOfflineMode: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  isLocal,
  onOfflineMode,
}) => {
  return (
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-red-600 dark:text-red-400 leading-tight">
          {error}
        </p>
      </div>
      {!isLocal && (
        <button
          type="button"
          onClick={onOfflineMode}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 self-end flex items-center gap-1"
        >
          <Database size={12} /> Switch to Offline Mode
        </button>
      )}
    </div>
  );
};

// Sub-component: Submit Button
interface SubmitButtonProps {
  type: 'login' | 'signup';
  loading: boolean;
  disabled: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  type,
  loading,
  disabled,
}) => {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 tracking-[0.2em] uppercase text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Analyzing Credentials...
        </>
      ) : (
        <>
          {type === 'login' ? 'Authorize' : 'Initialize Vault'}
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
};

// Sub-component: Auth Toggle
interface AuthToggleProps {
  type: 'login' | 'signup';
  onToggle: () => void;
}

const AuthToggle: React.FC<AuthToggleProps> = ({ type, onToggle }) => {
  return (
    <div className="pt-4 text-center">
      <p className="text-sm font-medium text-slate-500">
        {type === 'login' ? 'New Operative?' : 'Already Authorized?'}
        <button
          onClick={onToggle}
          className="ml-2 text-indigo-600 font-black hover:underline tracking-tight"
        >
          {type === 'login' ? 'Create profile' : 'Return to login'}
        </button>
      </p>
    </div>
  );
};

// Sub-component: Setup Error Panel
interface SetupErrorPanelProps {
  onRescan: () => void;
  onOfflineMode: () => void;
}

const SetupErrorPanel: React.FC<SetupErrorPanelProps> = ({
  onRescan,
  onOfflineMode,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/50 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600">
          <Settings2 size={24} />
        </div>
        <h3 className="font-black text-lg">Console Sync Required</h3>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        Firebase is initialized, but the{' '}
        <span className="font-bold">Email/Password Provider</span> is disabled
        in your project console.
      </p>

      <div className="space-y-3 mb-8">
        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
          onClick={onRescan}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] tracking-widest uppercase hover:bg-indigo-700 transition-all shadow-lg"
        >
          RE-SCAN CONNECTION
        </button>
        <button
          onClick={onOfflineMode}
          className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-black rounded-2xl text-[10px] tracking-widest uppercase hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <Database size={14} /> USE LOCAL FORENSIC CORE
        </button>
      </div>
    </div>
  );
};
