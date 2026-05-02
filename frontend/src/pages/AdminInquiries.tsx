import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { 
  Mail, MessageSquare, Trash2, CheckCircle, 
  Clock, User, Search, Filter, X, Eye, 
  MoreVertical, AlertCircle, Loader2, Send, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { confirmAction } from '../lib/toastUtils';

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, unread: 0 });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    fetchInquiries();
    fetchStats();
  };

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      // Use relative path so it works on both localhost (via proxy) and Vercel
      const res = await fetch('/api/admin/inquiries');
      
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      } else {
        const errData = await res.json();
        console.error("❌ Backend Error:", errData.message);
      }
    } catch (err) {
      console.error("❌ Network error. Check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats/inquiries');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) { console.log(err); }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/admin/inquiries/${id}/read`, { method: 'PUT' });
      setInquiries(prev => prev.map(msg => msg.id === id ? { ...msg, is_read: true } : msg));
      fetchStats();
    } catch (err) { console.error(err); }
  };

  const deleteInquiry = async (id: number) => {
    if (!window.confirm("Delete this message permanently?")) return;
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInquiries(prev => prev.filter(msg => msg.id !== id));
        if (selectedMsg?.id === id) setSelectedMsg(null);
        fetchStats();
      }
    } catch (err) { console.error(err); }
  };

  const filtered = inquiries.filter(item => 
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            User <span className="text-orange-600">Inquiries</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Incoming verified public leads</p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={refreshData}
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-orange-600 transition-all shadow-sm group"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform'}`} />
          </button>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unread</p>
                <p className="text-lg font-black text-orange-600 leading-none">{stats.unread}</p>
             </div>
             <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-500" />
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter messages..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Syncing Mailbox...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-20 text-center">
            <Mail className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No inquiries found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AnimatePresence>
            {filtered.map((msg) => (
              <motion.div 
                layout key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-6 rounded-[2rem] border-2 transition-all relative group ${!msg.is_read ? 'border-orange-500 shadow-orange-100/50 shadow-xl' : 'border-slate-50 shadow-sm'}`}
              >
                {!msg.is_read && (
                  <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2 py-1 bg-orange-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
                    New Request
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-orange-500 border border-white/10 shadow-lg">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{msg.full_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 lowercase">{msg.email}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 italic">{msg.subject}</div>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">{new Date(msg.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => deleteInquiry(msg.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setSelectedMsg(msg); if(!msg.is_read) markAsRead(msg.id); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg"
                    >
                      <Eye className="w-4 h-4" /> Read
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Message Modal */}
      <AnimatePresence>
        {selectedMsg && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{selectedMsg.subject}</h2>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Verified Inquiry</p>
                  </div>
                  <button onClick={() => setSelectedMsg(null)} className="p-2 bg-white rounded-full hover:bg-red-50 transition-all"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="p-8">
                  <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8 pb-8 border-b border-slate-50">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-orange-600">Sender</p>
                      <p className="text-xs font-black text-slate-900 uppercase">{selectedMsg.full_name}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-xs font-bold text-slate-900">{selectedMsg.email}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-7 rounded-3xl mb-8 min-h-[150px] border border-slate-100 italic">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                      "{selectedMsg.message}"
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => window.location.href = `mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`}
                      className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-orange-200"
                    >
                      <Send className="w-4 h-4" /> Reply via Email
                    </button>
                    <button onClick={() => setSelectedMsg(null)} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
                      Close
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}