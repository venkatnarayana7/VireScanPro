
import React from 'react';
import { 
  X, Check, Sparkles, ShieldCheck, Zap, Globe, 
  BookOpen, Lock, CreditCard, Star, 
  ArrowLeft, LayoutDashboard, ChevronLeft
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    { 
      icon: <Zap className="text-amber-500" size={20} />, 
      title: "Stealth Bypass™ v4", 
      desc: "Deep neural entropy shifting to stay undetectable by E-Detector and Turnitin." 
    },
    { 
      icon: <Globe className="text-indigo-500" size={20} />, 
      title: "Global Forensic Index", 
      desc: "Cross-reference 120B+ sources including paywalled archives and dark web leaks." 
    },
    { 
      icon: <BookOpen className="text-emerald-500" size={20} />, 
      title: "Linguistic Authenticity", 
      desc: "Advanced 'Human-Burstiness' logic to ensure natural sentence variance." 
    },
    { 
      icon: <Lock className="text-rose-500" size={20} />, 
      title: "Zero-Trace Vault", 
      desc: "Military-grade data shredding. Your documents exist only while you're editing." 
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden animate-in fade-in duration-300">
      {/* Immersive background with blur */}
      <div 
        className="absolute inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-[40px] transition-all cursor-pointer group" 
        onClick={onClose} 
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-black text-xs uppercase tracking-widest">
            Click anywhere to return
          </div>
        </div>
      </div>
      
      {/* Back Button Floating (For quick exit) */}
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 z-[1010] bg-white text-slate-950 px-6 py-4 rounded-full shadow-2xl border border-white/20 transition-all group hidden lg:flex items-center gap-3 hover:scale-105 active:scale-95"
      >
        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-black text-xs uppercase tracking-widest pr-2">Return Home</span>
      </button>
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-full lg:h-[85vh] lg:rounded-[3.5rem] shadow-[0_0_100px_rgba(79,70,229,0.3)] overflow-hidden flex flex-col lg:flex-row border border-white/20 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-5 duration-500">
        
        {/* Left Side: Brand Story */}
        <div className="lg:w-2/5 bg-slate-900 dark:bg-black p-10 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-800 rounded-full blur-[120px]" />
          </div>
          
          <div className="relative z-10">
            <button 
              onClick={onClose}
              className="group lg:hidden flex items-center gap-3 text-indigo-400 font-black text-[10px] tracking-[0.3em] uppercase mb-14 hover:text-white transition-all"
            >
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                <ArrowLeft size={16} />
              </div>
              Back to Dashboard
            </button>

            <div className="flex items-center gap-4 mb-10">
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 rounded-2xl shadow-xl shadow-indigo-500/20">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <span className="font-black tracking-[0.4em] uppercase text-[10px] block text-indigo-400 mb-0.5">Elite Access</span>
                <span className="text-xl font-black text-white">Neural Full-Stack</span>
              </div>
            </div>

            <h2 className="text-5xl lg:text-6xl font-black mb-8 leading-[1.05] tracking-tighter">
              Unlock the <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-violet-400">Genius</span> <br /> Tier.
            </h2>
            <p className="text-slate-400 text-lg font-medium max-w-sm leading-relaxed mb-10 opacity-80">
              Grammarly-level precision with forensic stealth. The ultimate suite for professional manuscript audit.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-8 pt-10 border-t border-white/10">
             <div>
               <div className="text-3xl font-black">Unlimited</div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly Scans</div>
             </div>
             <div>
               <div className="text-3xl font-black">256-bit</div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">AES Security</div>
             </div>
          </div>
        </div>

        {/* Right Side: Options */}
        <div className="flex-1 p-8 lg:p-20 flex flex-col overflow-y-auto bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex justify-between items-start mb-14">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em] mb-2">Service Tiers</h3>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Choose Your Plan</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-2xl transition-all hover:scale-110 shadow-sm"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-16">
            {features.map((f, i) => (
              <div key={i} className="flex gap-6 group hover:translate-x-1 transition-transform">
                <div className="flex-shrink-0 w-14 h-14 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-indigo-100 dark:group-hover:shadow-none transition-all">
                  {f.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">{f.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold opacity-80">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-10">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Annual Plan */}
              <div className="flex-1 p-10 rounded-[3rem] border-4 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-950 shadow-2xl relative group/card transition-all hover:-translate-y-2">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-xl whitespace-nowrap">Elite Selection</div>
                
                <div className="mb-10 text-center">
                  <h5 className="font-black text-slate-900 dark:text-white text-xl mb-2">Annual Pass</h5>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">$12</span>
                    <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">/mo</span>
                  </div>
                  <p className="text-[10px] text-indigo-500 font-black mt-2 uppercase tracking-widest">Billed as $144 yearly</p>
                </div>

                <ul className="space-y-5 mb-12">
                   <li className="flex items-center gap-3 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                     <Check size={18} className="text-emerald-500 shrink-0" strokeWidth={3} /> Pro Stealth Rewrite
                   </li>
                   <li className="flex items-center gap-3 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                     <Check size={18} className="text-emerald-500 shrink-0" strokeWidth={3} /> Real-time Source Sync
                   </li>
                </ul>

                <button className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 text-[11px] tracking-[0.2em] uppercase">
                  <CreditCard size={18} /> Initialize Elite
                </button>
              </div>

              {/* Monthly Plan */}
              <div className="flex-1 p-10 rounded-[3rem] border-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 transition-all hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700">
                <div className="mb-10 text-center">
                  <h5 className="font-black text-slate-900 dark:text-white text-xl mb-2">Flex Pass</h5>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">$29</span>
                    <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">/mo</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-widest">Standard Monthly</p>
                </div>

                <button className="w-full py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-black rounded-2xl transition-all hover:bg-slate-50 text-[11px] tracking-[0.2em] uppercase">
                  Subscribe Flex
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-10 mt-6 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Star size={14} className="text-amber-500 fill-amber-500" /> Premium Quality
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-indigo-500" /> 100% Secure Audit
                </div>
              </div>

              <button 
                onClick={onClose}
                className="group flex items-center gap-3 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:opacity-70 transition-all bg-indigo-50 dark:bg-indigo-900/20 px-8 py-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/40"
              >
                <LayoutDashboard size={14} className="group-hover:rotate-12 transition-transform" /> 
                Exit to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
