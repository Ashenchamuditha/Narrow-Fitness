import { toast } from 'react-hot-toast';
import { Scissors, Check, X, Dumbbell } from 'lucide-react';

/**
 * Premium Confirmation Toast
 * Replaces window.confirm()
 */
export const confirmAction = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const toastId = toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-[#1a1a1a] shadow-2xl rounded-[20px] pointer-events-auto flex flex-col border border-white/10 overflow-hidden`}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-1">Confirmation Required</p>
              <p className="text-sm font-bold text-white leading-relaxed uppercase tracking-tight italic">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-t border-white/5 bg-white/5">
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(false);
            }}
            className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all flex items-center justify-center gap-2 border-r border-white/5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(true);
            }}
            className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-3.5 h-3.5" /> Confirm
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  });
};

/**
 * Premium Prompt Toast
 * Replaces window.prompt()
 */
export const promptAction = (message: string, defaultValue: string = ''): Promise<string | null> => {
  return new Promise((resolve) => {
    let value = defaultValue;
    const toastId = toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-[#1a1a1a] shadow-2xl rounded-[20px] pointer-events-auto flex flex-col border border-white/10 overflow-hidden`}
      >
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-1">Input Required</p>
                <p className="text-sm font-bold text-white leading-relaxed uppercase tracking-tight italic">
                  {message}
                </p>
              </div>
            </div>
            <input 
              autoFocus
              defaultValue={defaultValue}
              onChange={(e) => value = e.target.value}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-orange-500 transition-all text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    toast.dismiss(toastId);
                    resolve(value);
                }
              }}
            />
          </div>
        </div>
        <div className="flex border-t border-white/5 bg-white/5">
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(null);
            }}
            className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all flex items-center justify-center gap-2 border-r border-white/5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(value);
            }}
            className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-3.5 h-3.5" /> Submit
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  });
};

/**
 * Premium Welcome Toast
 * Shows a personalized welcome message for 10 seconds (Light Theme)
 */
export const showWelcomeToast = (name: string) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-sm w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[24px] pointer-events-auto flex items-center border-2 border-orange-500/10 overflow-hidden p-5 gap-5`}
    >
      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0 border-2 border-orange-100 relative group">
        <div className="absolute inset-0 bg-orange-500/10 rounded-2xl animate-pulse group-hover:animate-none" />
        <Dumbbell className="w-7 h-7 text-orange-600 relative z-10 -rotate-12" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/70">Member Access Granted</p>
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none tracking-tighter">
          Welcome back, <span className="text-orange-600">{name}</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-2 flex items-center gap-1">
           Ready to crush your goals today?
        </p>
      </div>

      <button
        onClick={() => toast.dismiss(t.id)}
        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-orange-600 transition-all text-slate-400 hover:text-white group border border-slate-100"
        title="Dismiss Welcome Note"
      >
        <Scissors className="w-4 h-4 group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  ), { duration: 10000, position: 'top-center' });
};
