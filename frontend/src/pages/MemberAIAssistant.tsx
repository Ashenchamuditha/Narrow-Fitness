import React, { useState, useEffect, useRef, memo } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  Bot, Send, User, Dumbbell, Utensils, ShieldCheck, Zap, Lock, 
  RefreshCw, Info, X, Target, Activity, Crown, ArrowRight, Timer, Mic, 
  Paperclip, ChevronDown, MessageSquare, Plus, FileText, Image as ImageIcon, Trash2, Menu, CheckCircle2, PlayCircle,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../lib/toastUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Attachment {
  id?: string;
  name: string;
  type: string;
  preview?: string;
  base64?: string;
  file?: File;
  extractedText?: string;
  icon?: any;
}

// --- ELITE UI COMPONENTS ---

const ChatMessages = memo(({ messages, onDownloadPDF }: { messages: any[], onDownloadPDF: (msg: any) => void }) => (
  <div className="space-y-10 pb-10">
    {messages.map((msg) => (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-3`}>
        {msg.role === 'model' && (
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 shadow-sm mb-1">
            <Bot className="w-5 text-orange-600" />
          </div>
        )}
        <div className={`max-w-[92%] lg:max-w-[80%] p-6 rounded-[2rem] text-sm leading-relaxed shadow-sm relative ${
          msg.role === 'user' ? 'bg-slate-900 text-white rounded-br-none border border-slate-800' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
        }`}>
          {msg.inputType === 'file' && (
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10 text-orange-400 text-[10px] font-black italic">
              <FileText className="w-3" /> analyzing workout: {msg.fileName}
            </div>
          )}
          
          <div className="prose prose-slate max-w-none font-sans overflow-x-auto leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                table: (p) => <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-md"><table className="min-w-full divide-y divide-slate-100 bg-white" {...p} /></div>,
                thead: (p) => <thead className="bg-slate-900 text-white" {...p} />,
                th: (p) => <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest" {...p} />,
                td: (p) => <td className="px-4 py-4 text-[11px] font-bold text-slate-600 border-t border-slate-50" {...p} />,
                tr: (p) => <tr className="even:bg-slate-50/80 hover:bg-orange-50/50 transition-colors" {...p} />,
                strong: (p) => <strong className="text-orange-600 font-bold" {...p} />,
                a: ({ href, children }) => {
                  const isYoutube = href?.includes('youtube.com');
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={isYoutube ? "inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase mt-2 border border-orange-500/30 hover:bg-orange-600 transition-all shadow-lg" : "text-orange-600 font-bold underline"}>
                      {isYoutube && <PlayCircle className="w-4 h-4 text-orange-500" />} {children}
                    </a>
                  );
                }
            }}>{msg.text}</ReactMarkdown>
          </div>

          {msg.role === 'model' && msg.text.includes('|') && (msg.text.toLowerCase().includes('download') || msg.text.toLowerCase().includes('pdf')) && (
            <button 
              onClick={() => onDownloadPDF(msg)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all text-[9px] font-black uppercase mt-6 shadow-sm border border-orange-100 group"
            >
              <FileText className="w-3.5 group-hover:scale-110 transition-transform" /> download plan (pdf)
            </button>
          )}

          <div className={`text-[8px] mt-4 opacity-30 font-black uppercase flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <span className={msg.role === 'model' ? 'text-orange-600' : ''}>{msg.role === 'user' ? 'athlete' : 'coach'}</span>
             <span className="w-1 h-1 bg-slate-300 rounded-full" />
             <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        {msg.role === 'user' && (
             <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700 shadow-sm mb-1">
                <User className="w-5 text-white" />
             </div>
          )}
      </motion.div>
    ))}
  </div>
));

const SessionItem = memo(({ s, currentSid, switchSession, deleteSession }: { s: any, currentSid: number | null, switchSession: (sid: number) => void, deleteSession: (e: any, sid: number) => void }) => (
  <div className="relative group">
    <button onClick={() => switchSession(s.id)} className={`w-full text-left p-5 rounded-2xl transition-all border ${currentSid === s.id ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-md' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
      <p className="text-[11px] font-black italic truncate leading-none pr-6">"{s.title}"</p>
      <p className="text-[8px] font-bold mt-2 opacity-50 uppercase tracking-widest">{new Date(s.created_at).toLocaleDateString()}</p>
    </button>
    <button onClick={(e) => deleteSession(e, s.id)} className="absolute right-4 top-5 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
  </div>
));

const ChatSidebar = memo(({ sessions, currentSid, switchSession, deleteSession, setIsNewSessionModalOpen, isSidebarOpen }: any) => (
  <AnimatePresence initial={false}>
    {isSidebarOpen && (
      <motion.div 
        initial={{ width: 0, opacity: 0, marginRight: 0 }}
        animate={{ width: 288, opacity: 1, marginRight: 24 }}
        exit={{ width: 0, opacity: 0, marginRight: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden"
      >
        <div className="w-72 p-6 flex flex-col h-full">
          <button onClick={() => setIsNewSessionModalOpen(true)} className="w-full py-4 bg-black text-white rounded-2xl font-black italic text-[11px] mb-6 flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shrink-0">
            <Plus className="w-4 h-4" /> new workout chat
          </button>
          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
            {sessions.map((s: any) => (
              <SessionItem key={s.id} s={s} currentSid={currentSid} switchSession={switchSession} deleteSession={deleteSession} />
            ))}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
));

export default function MemberAIAssistant() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- STATES ---
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSid, setCurrentSid] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [activeInputType, setActiveInputType] = useState<'text' | 'voice'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [lockMessage, setLockMessage] = useState(''); 
  const [usageInfo, setUsageInfo] = useState({ current: 0, max: 10, sessionMax: 30 });
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- FUNCTIONS ---

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  }, []);

  const handleScroll = React.useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
    }
  }, []);

  const switchSession = React.useCallback((sid: number) => {
    setCurrentSid(sid);
    setIsDrawerOpen(false);
    fetch(`/api/member/ai/history/${sid}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages.map((m: any) => ({
          role: m.role, text: m.message, id: m.id, inputType: m.input_type, fileName: m.file_name, createdAt: m.created_at
        })));
        if (data.messages.length === 0) {
            setMessages([{ role: 'model', text: `Vanguard Link Active. Systems ready. Let's engineer your peak performance.`, id: 'welcome' }]);
        }
        setTimeout(scrollToBottom, 100);
      });
  }, [scrollToBottom]);

  const loadSessions = React.useCallback(async (uid: number) => {
    const res = await fetch(`/api/member/ai/sessions/${uid}`);
    const data = await res.json();
    setSessions(data);
    if (data.length > 0) switchSession(data[0].id);
    else setIsNewSessionModalOpen(true);
  }, [switchSession]);

  const handleCreateSession = React.useCallback(async () => {
    if (!newSessionTitle.trim() || !user) return;
    try {
      const res = await fetch('/api/member/ai/sessions/new', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: user.id, title: newSessionTitle })
      });
      const newS = await res.json();
      setSessions(prev => [newS, ...prev]);
      setNewSessionTitle('');
      setIsNewSessionModalOpen(false);
      switchSession(newS.id);
    } catch (err) { console.error("Session creation failed"); }
  }, [newSessionTitle, user, switchSession]);

  const deleteSession = React.useCallback(async (e: React.MouseEvent, sid: number) => {
    e.stopPropagation();
    if (!(await confirmAction("are you sure you want to delete?"))) return;
    const res = await fetch(`/api/member/ai/sessions/${sid}`, { method: 'DELETE' });
    if (res.ok) {
        setSessions(prev => {
          const filtered = prev.filter(s => s.id !== sid);
          if (currentSid === sid && filtered.length > 0) switchSession(filtered[0].id);
          else if (filtered.length === 0) window.location.reload();
          return filtered;
        });
    }
  }, [currentSid, switchSession]);

  const handleSendMessage = React.useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || limitReached || !user || !currentSid) return;

    const currentInputType = attachedFiles.length > 0 ? 'file' : activeInputType;
    const currentFileName = attachedFiles.length > 0 ? attachedFiles[0].name : null;

    let finalMessage = input;
    if (attachedFiles.length > 0) {
        finalMessage += `\n\nATTACHED WORKOUT CONTEXT:\n` + attachedFiles.map(f => f.extractedText).join("\n");
    }
    
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { 
        role: 'user', 
        text: input || "analyzing attachments...", 
        id: userMsgId, 
        createdAt: new Date(),
        inputType: currentInputType,
        fileName: currentFileName 
    }]);
    
    setInput('');
    setActiveInputType('text'); // Reset to text after sending
    setAttachedFiles([]); 
    setIsLoading(true);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch('/api/member/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message: finalMessage, sessionId: currentSid, inputType: currentInputType, fileName: currentFileName })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'model', text: data.text, id: Date.now() + 1, createdAt: new Date() }]);
        if (data.usage) {
            setUsageInfo({
              current: data.usage.current,
              max: data.usage.max,
              sessionMax: data.usage.sessionMax
            });
        }
      } else if (res.status === 403 || res.status === 422) {
        setLimitReached(true); setLockMessage(data.message);
      }
    } catch (error) {
        console.error("AI Analysis Failed");
    } finally { setIsLoading(false); setTimeout(scrollToBottom, 150); }
  }, [input, attachedFiles, isLoading, limitReached, user, currentSid, activeInputType, scrollToBottom]);

  const handleFileUpload = React.useCallback(async (e: any) => {
    const file = e.target.files[0]; if (!file) return;

    if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
      toast.error("⚠️ Word documents (.doc, .docx) are not supported. Please convert your workout to a PDF or copy-paste the text.");
      e.target.value = '';
      return;
    }

    setIsProcessingMedia(true);
    const formData = new FormData(); formData.append('file', file);
    try {
        const res = await fetch('/api/member/ai/process-media', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) setAttachedFiles(prev => [...prev, { name: file.name, type: data.type, extractedText: data.text, icon: file.type.includes('pdf') ? FileText : ImageIcon }]);
    } finally { setIsProcessingMedia(false); e.target.value = ''; }
  }, []);

  const toggleVoice = React.useCallback(async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) {
          toast.error("Audio too short. Please try again.");
          return;
        }

        setIsProcessingMedia(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice_input.webm');

        try {
          const res = await fetch('/api/member/ai/process-media', { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok && data.text) {
            // Preview the exact transcription in the input field before sending
            setInput(data.text);
            setActiveInputType('voice');
            toast.success("Voice detected. Review and send whenever you're ready!");
          } else {
            toast.error("Could not understand the audio. Try again.");
          }
        } catch (err) {
          console.error("Voice transcription failed", err);
          toast.error("Transcription service unavailable.");
        } finally {
          setIsProcessingMedia(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      toast.error("Please allow microphone access for voice input.");
      console.error(err);
    }
  }, [isListening]);

  const handleDownloadPDF = React.useCallback(async (msg: any) => {
    if (!user || !currentSid) return;
    const loadingToast = toast.loading("Generating professional PDF...");
    try {
      const currentSession = sessions.find(s => s.id === currentSid);
      const res = await fetch('/api/member/ai/generate-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: msg.text, 
          title: currentSession?.title || 'Narrow Fitness Plan',
          userName: user.name
        })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Narrow_Fitness_${(currentSession?.title || 'Plan').replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Plan downloaded successfully!", { id: loadingToast });
      } else {
        toast.error("Failed to generate PDF", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Download failed. System busy.", { id: loadingToast });
    }
  }, [user, currentSid, sessions]);

  // --- SESSION MESSAGE COUNTER ---
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    const count = messages.filter(m => m.role === 'user').length;
    setSessionCount(count);
  }, [messages]);

  // --- 1. FETCH ALL DATA ON LOAD ---
  useEffect(() => {
    const stored = localStorage.getItem('narrow_fitness_user');
    if (!stored) {
      navigate('/auth');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    loadSessions(parsed.id);

    fetchLiveUsage(parsed.id);
  }, [navigate, loadSessions]);

  const fetchLiveUsage = React.useCallback(async (uid: number) => {
    try {
      const res = await fetch(`/api/member/ai/stats/${uid}`);
      const data = await res.json();
      if (res.ok) {
        setUsageInfo({
          current: data.current,
          max: data.max,
          sessionMax: data.sessionMax
        });
      }
    } catch (e) {
      console.error("Failed to fetch live usage stats", e);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading, scrollToBottom]);

  if (!user) return null;

  return (
    <MemberLayout fullWidth>
      <div className="flex h-[calc(100vh-7rem)] w-full gap-6 px-2 lg:px-4">
        
        <ChatSidebar 
          sessions={sessions} 
          currentSid={currentSid} 
          switchSession={switchSession} 
          deleteSession={deleteSession} 
          setIsNewSessionModalOpen={setIsNewSessionModalOpen}
          isSidebarOpen={isSidebarOpen}
        />

        {/* --- MAIN CHAT UI --- */}
        <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-white/95 backdrop-blur-md z-20 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDrawerOpen(true)} className="lg:hidden p-2.5 bg-slate-50 text-slate-900 rounded-xl"><Menu className="w-5" /></button>
              
              {/* Sidebar Toggle for Desktop */}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="hidden lg:flex p-2.5 bg-slate-50 text-slate-900 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all group"
                title={isSidebarOpen ? "Hide History" : "Show History"}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5" /> : <PanelLeftOpen className="w-5" />}
              </button>

              {/* Quick New Chat Button when sidebar is hidden */}
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsNewSessionModalOpen(true)} 
                  className="hidden lg:flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-orange-600 transition-all shadow-md group shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px] font-black italic uppercase">New Chat</span>
                </button>
              )}

              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg"><Bot className="text-white w-6" /></div>
              <div>
                 <h3 className="text-lg font-black italic text-slate-900 leading-none">ai coach</h3>
                 <span className="text-[8px] font-black text-green-500 uppercase tracking-widest mt-1 block">link active</span>
              </div>
            </div>
            {/* ✅ "Add Session" Button removed from here per request */}
            <button onClick={() => setIsInfoOpen(true)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"><Info className="w-5" /></button>
          </div>

          <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 lg:px-16 space-y-10 no-scrollbar bg-[#fcfcfc]">
            <ChatMessages messages={messages} onDownloadPDF={handleDownloadPDF} />
            {(isLoading || isProcessingMedia) && (
              <div className="flex justify-start items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100"><RefreshCw className="w-4 text-orange-600 animate-spin" /></div>
                <div className="text-[10px] font-bold text-orange-500 animate-pulse uppercase tracking-tighter">analysing biometrics...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <AnimatePresence>
            {showScrollBtn && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={scrollToBottom} className="absolute bottom-40 right-8 p-3 bg-black text-white rounded-full shadow-2xl z-30 hover:bg-orange-600">
                    <ChevronDown className="w-6" />
                </motion.button>
            )}
          </AnimatePresence>

          <div className="px-3 lg:px-12 pb-6 lg:pb-8 pt-4 bg-white border-t border-slate-50">
            <AnimatePresence>
              {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                      {attachedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-lg border border-white/10">
                              <file.icon className="w-4 text-orange-500" />
                              <span className="text-[9px] font-bold truncate max-w-[100px]">{file.name}</span>
                              <button onClick={() => setAttachedFiles(f => f.filter((_, i) => i !== idx))} className="text-orange-600 p-0.5"><X className="w-3.5" /></button>
                          </div>
                      ))}
                  </div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 lg:gap-3 max-w-5xl mx-auto">
              <label className="p-3.5 lg:p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 cursor-pointer transition-all shrink-0">
                  {isProcessingMedia ? <RefreshCw className="w-5 animate-spin text-orange-600" /> : <Paperclip className="w-5" />}
                  <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
              </label>
              
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-2 focus-within:border-orange-500 transition-all shadow-sm overflow-hidden">
                  <input 
                    value={input} 
                    disabled={limitReached || isLoading} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                    placeholder="message coach..." 
                    className="flex-1 bg-transparent py-4 px-3 outline-none font-bold text-sm min-w-0 placeholder:font-medium placeholder:italic text-slate-800"
                    style={{ fontFamily: "inherit" }}
                  />
                  <button onClick={handleSendMessage} disabled={isLoading || (!input.trim() && attachedFiles.length === 0) || limitReached} className="p-2.5 bg-black text-white rounded-xl hover:bg-orange-600 transition-all shrink-0 shadow-lg"><Send className="w-5" /></button>
              </div>
              
              <button onClick={toggleVoice} disabled={limitReached} className={`p-3.5 lg:p-4 rounded-2xl transition-all shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-orange-600'}`}><Mic className="w-5" /></button>
            </div>
          </div>

          {/* Cooldown/Limit Overlay */}
          {limitReached && (
             <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center p-6 text-center px-4">
                <div className="bg-slate-900 rounded-[3rem] p-10 max-sm w-full shadow-2xl border border-orange-500/30">
                    <Timer className="w-12 text-white mx-auto mb-6 shadow-glow" />
                    <h4 className="text-2xl font-black text-white italic mb-2 leading-none uppercase tracking-tighter">session capped</h4>
                    <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">{lockMessage}</p>
                    <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-black rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl">refresh system status</button>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* MODAL: NEW SESSION */}
      <AnimatePresence>
        {isNewSessionModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl text-center border border-slate-100">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-orange-600 shadow-inner"><Dumbbell className="w-8 h-8" /></div>
                <h3 className="text-2xl font-black italic text-slate-900 uppercase leading-none mb-2">new workout</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 px-4 leading-relaxed">name your current physical objective or routine</p>
                <input autoFocus value={newSessionTitle} onChange={(e) => setNewSessionTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()} placeholder="e.g. fat loss plan / leg day" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-sm focus:border-orange-500 outline-none mb-8 transition-all" />
                <div className="flex gap-3">
                  <button onClick={() => {setIsNewSessionModalOpen(false); if(sessions.length === 0) navigate('/member');}} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                  <button onClick={handleCreateSession} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-orange-500/30">Initialize</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[200] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="absolute inset-y-0 left-0 w-80 bg-white p-6 shadow-2xl flex flex-col rounded-r-[3rem] border-r border-slate-100 overflow-y-auto">
              <div className="flex justify-between items-center mb-8 pr-2">
                 <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">workouts</h2>
                 <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5" /></button>
              </div>
              <button onClick={() => {setIsNewSessionModalOpen(true); setIsDrawerOpen(false);}} className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black italic uppercase text-[11px] mb-8 shadow-lg">start new workout</button>
              <div className="flex-1 space-y-4 pr-1">
                {sessions.map(s => (
                   <div key={s.id} className="relative group">
                    <button onClick={() => switchSession(s.id)} className={`w-full text-left p-5 rounded-2xl transition-all border ${currentSid === s.id ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-md' : 'bg-slate-50 border-transparent'}`}>
                        <p className="text-xs font-black italic truncate leading-none pr-6">"{s.title}"</p>
                    </button>
                    <button onClick={(e) => deleteSession(e, s.id)} className="absolute right-4 top-5 p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                   </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COACH HUB (INFO) */}
      <AnimatePresence>
        {isInfoOpen && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-[2.5rem] p-10 max-w-md w-full relative shadow-2xl overflow-hidden">
                    <button onClick={() => setIsInfoOpen(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-all"><X className="w-6" /></button>
                    <div className="flex items-center gap-3 mb-8 text-orange-600"><ShieldCheck className="w-10 h-10" /><h2 className="text-3xl font-black italic text-slate-900 leading-none">coach hub</h2></div>
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2-hour message limit:</span><span className="text-sm font-black text-orange-600 uppercase">{usageInfo.max - usageInfo.current} / {usageInfo.max} Chats left</span></div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${(usageInfo.current / usageInfo.max) * 100}%` }} className="bg-orange-600 h-full shadow-[0_0_10px_#f97316]" /></div>
                        </div>
                        <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden shadow-lg border border-white/5">
                            <div className="flex justify-between items-center mb-4 relative z-10"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">current session status:</span><span className="text-sm font-black text-orange-500 uppercase">{30 - sessionCount} / 30 left</span></div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4 relative z-10">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${(sessionCount / 30) * 100}%` }} 
                                    className="bg-orange-500 h-full shadow-[0_0_10px_#f97316]" 
                                />
                            </div>
                            <p className="text-[12px] font-medium leading-relaxed italic z-10 relative">Each session is capped at 30 messages to maintain coaching accuracy. Start a new workout chat once a routine is perfected.</p>
                            <Target className="absolute -bottom-8 -right-8 w-24 h-24 text-white/5 rotate-12" />
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </MemberLayout>
  );
}
