import React, { useState, useEffect, useRef } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  Bot, Send, User, Sparkles, Dumbbell, Utensils, 
  ShieldCheck, Zap, Lock, RefreshCw, Info, X, Target, Activity, Crown, ArrowRight, AlertTriangle, Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MemberAIAssistant() {
  // --- STATES ---
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [lockMessage, setLockMessage] = useState(''); 
  const [usageInfo, setUsageInfo] = useState({ current: 0, max: 5 });
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { text: "Give me a workout table", icon: Dumbbell },
    { text: "Show a high protein diet", icon: Utensils },
    { text: "How to improve my form?", icon: Info },
    { text: "Recovery tips", icon: Zap }
  ];

  // --- 1. INITIAL LOAD & HISTORY FETCH (The Loop Detector) ---
  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const firstName = parsedUser.name.split(' ')[0];

      // Fetch Chat History and Usage Status from Database
      fetch(`/api/member/ai/history/${parsedUser.id}`)
        .then(res => res.json())
        .then(data => {
          // A. Load Messages from the 'messages' array
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m: any) => ({
              role: m.role,
              text: m.message,
              id: m.id || `hist-${Math.random()}`
            })));
          } else {
            setMessages([{
              role: 'model',
              text: `Hi ${firstName}! 🔥 I'm your Narrow AI Coach. Ask me for a **workout table** or **diet plan** to get started!`,
              id: 'welcome'
            }]);
          }

          // B. HANDLE LOOP / UNBLOCK LOGIC
          if (data.usage) {
            const isPremiumUser = parsedUser.subscription_status === 'active' || parsedUser.role === 'admin' || parsedUser.role === 'trainer';
            const limit = isPremiumUser ? 100 : 5;
            
            // Check time difference
            const lastMsgTime = new Date(data.usage.last_message_at).getTime();
            const msPassed = Date.now() - lastMsgTime;
            const hoursPassed = msPassed / (1000 * 60 * 60);

            // If usage >= limit AND it has been less than 2 hours
            if (!isPremiumUser && data.usage.daily_count >= limit && hoursPassed < 2) {
              setLimitReached(true);
              const unlockDate = new Date(lastMsgTime + (2 * 60 * 60 * 1000));
              const timeStr = unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setLockMessage(`Daily free limit reached. Chat will unblock at ${timeStr}.`);
            } else {
              // COOLDOWN OVER OR UNDER LIMIT -> UNBLOCK
              setLimitReached(false);
              setLockMessage('');
            }
            
            // Sync usage counter in the info hub
            setUsageInfo({ current: data.usage.daily_count, max: limit });
          }
        })
        .catch(err => console.error("History fetch error:", err));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages, isLoading, limitReached]);

  // --- 2. SEND MESSAGE HANDLER ---
  const handleSendMessage = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading || limitReached) return;
    if (!user?.id) return;

    const timestamp = Date.now();
    setMessages(prev => [...prev, { role: 'user', text: messageText, id: `u-${timestamp}` }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/member/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message: messageText })
      });

      const data = await res.json();

      if (res.status === 403) {
        // --- LOGIC: LIMIT REACHED (Backend triggers this if under 2 hours) ---
        setLimitReached(true);
        setLockMessage(data.message); 
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: `🚨 **Access Paused**\n\n${data.message}\n\n[UPGRADE TO PRO FOR UNLIMITED ACCESS](/member/payments)`, 
          id: `limit-${timestamp}` 
        }]);
        if (data.usage) setUsageInfo({ current: data.usage.current, max: data.usage.max });
      } else if (res.ok) {
        // --- SUCCESS: RESET OR INCREMENT ---
        setMessages(prev => [...prev, { role: 'model', text: data.text, id: `ai-${timestamp}` }]);
        
        // Update usage count live from the backend's new count
        if (data.usage) {
          setUsageInfo({ current: data.usage.current, max: data.usage.max });
          // If the backend reset the count to 1 after 2 hours, we stay unlocked
          setLimitReached(false);
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again.", id: `fail-${timestamp}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremium = user?.subscription_status === 'active' || user?.role === 'admin' || user?.role === 'trainer';

  return (
    <MemberLayout>
      {/* --- INFO POPUP MODAL --- */}
      <AnimatePresence>
        {isInfoOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 relative overflow-hidden">
              <button onClick={() => setIsInfoOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 transition-all"><X className="w-4 h-4" /></button>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-6 text-slate-900">Coach Hub</h2>
              <div className="space-y-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Athlete Goal</p>
                   <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">{user?.primary_goal || 'General Fitness'}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Session Usage</p>
                   <p className="text-sm font-bold text-slate-700 uppercase">{isPremium ? 'Unlimited Pro Access' : `${usageInfo.current} / ${usageInfo.max} Messages`}</p>
                 </div>
                 <div className="p-5 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
                    <p className="text-[11px] font-medium leading-relaxed relative z-10 italic">
                      "I analyze your biometrics to generate precise schedules. Upgrade to Pro for 100+ daily sessions."
                    </p>
                    <ShieldCheck className="absolute -bottom-4 -right-4 w-16 h-16 text-white/10 rotate-12" />
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="h-[calc(100vh-11rem)] w-full flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="px-8 py-3 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
              <Bot className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Narrow AI Assistant</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${limitReached ? 'bg-red-50 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{limitReached ? 'Session Paused' : 'Neural Link Active'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsInfoOpen(true)} className="p-2.5 bg-slate-100 text-slate-900 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm">
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* --- SCROLLABLE CHAT AREA --- */}
        <div className="flex-1 overflow-y-auto p-6 lg:px-32 lg:py-12 space-y-10 no-scrollbar bg-[#fdfdfd]">
          {messages.map((msg) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-4`}>
              
              {msg.role === 'model' && (
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 mb-1 border border-orange-200">
                  <Bot className="w-6 h-6 text-orange-600" />
                </div>
              )}

              <div className={`max-w-[95%] lg:max-w-[85%] p-7 rounded-[2rem] text-sm md:text-base leading-[1.7] shadow-sm font-medium ${
                msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-br-none tracking-tight' 
                : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
              }`}>
                <div className="overflow-x-auto font-sans prose prose-slate max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm"><table className="min-w-full divide-y divide-slate-200 bg-white" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-slate-900 text-white" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 text-xs border-t border-slate-100 font-bold text-slate-600" {...props} />,
                      tr: ({node, ...props}) => <tr className="even:bg-slate-50 hover:bg-orange-50/50 transition-colors" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-black text-orange-600" {...props} />,
                      a: ({node, ...props}) => <Link to={props.href || ''} className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase mt-4 hover:bg-black transition-all shadow-lg shadow-orange-200"><Crown className="w-3.5 h-3.5"/> Upgrade to Pro Access</Link>
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mb-1 border border-slate-700 shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </motion.div>
          ))}
          
          {/* --- UPGRADE ALERT CARD (When Limit Hit) --- */}
          <AnimatePresence>
            {limitReached && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center py-6">
                 <div className="bg-slate-900 border-2 border-orange-500/30 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden text-center">
                    <div className="relative z-10">
                      <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mb-6 shadow-xl mx-auto">
                        <Timer className="w-10 h-10 text-white" />
                      </div>
                      <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Access Paused</h4>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 px-4">
                        {lockMessage}
                      </p>
                      <Link 
                        to="/member/payments" 
                        className="flex items-center gap-3 bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 hover:text-white transition-all transform active:scale-95 shadow-xl"
                      >
                        <Crown className="w-5 h-5 text-orange-500" /> Unlock Now with Pro
                      </Link>
                    </div>
                    <AlertTriangle className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 -rotate-12" />
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && (
            <div className="flex justify-start items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-orange-600 animate-spin" /></div>
              <div className="bg-white border border-slate-100 px-6 py-4 rounded-2xl shadow-sm italic font-bold text-orange-600 text-sm animate-pulse tracking-tighter">
                Coach is preparing your elite strategy...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- FOOTER INPUT SECTION --- */}
        <div className="px-8 pb-8 pt-4 bg-white border-t border-slate-100">
          
          {!limitReached && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 px-2">
              {suggestions.map((item, i) => (
                <button 
                  key={i} 
                  disabled={isLoading}
                  onClick={() => handleSendMessage(item.text)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black uppercase border border-slate-200 hover:bg-orange-600 hover:text-white transition-all active:scale-95 whitespace-nowrap shadow-sm"
                >
                  <item.icon className="w-3 h-3" />
                  {item.text}
                </button>
              ))}
            </div>
          )}

          <div className="relative group max-w-6xl mx-auto w-full">
            <input 
              value={input} 
              disabled={limitReached || isLoading}
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={limitReached ? "SESSION LOCKED - UPGRADE TO CONTINUE" : "Ask your coach about schedules, meals, or form..."}
              className={`w-full border-2 rounded-[2.5rem] py-5 pl-8 pr-20 outline-none transition-all font-bold text-sm shadow-inner ${
                limitReached 
                ? 'bg-red-50 border-red-100 text-red-300 cursor-not-allowed italic' 
                : 'bg-slate-50 border-slate-100 focus:border-orange-500 focus:bg-white'
              }`}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={isLoading || !input.trim() || limitReached}
              className={`absolute right-3 top-3 bottom-3 px-8 rounded-3xl transition-all flex items-center justify-center shadow-lg ${
                limitReached ? 'bg-slate-200 text-slate-400' : 'bg-black text-white hover:bg-orange-600'
              }`}
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : limitReached ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}