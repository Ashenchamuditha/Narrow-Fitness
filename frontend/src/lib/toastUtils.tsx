import { toast } from 'react-hot-toast';
import { Scissors, Check, X } from 'lucide-react';

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
