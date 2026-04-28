import { motion, AnimatePresence } from 'framer-motion';
import { io } from "socket.io-client";
import { useState, useEffect } from 'react';
import { 
  Users, 
  Dumbbell, 
  TrendingUp, 
  Tag, 
  Calendar,
  ChevronRight,
  Plus,
  Users2,
  Activity,
  ShieldCheck,
  Loader2,
  Mail,
  Image as ImageIcon,
  Megaphone,
  X,
  Send,
  CheckCircle2,
  MessageSquare,
  Settings,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalTrainers: 0,
    totalClasses: 0,
    totalPackages: 0 
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- BROADCAST STATES ---
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ subject: '', message: '' });

  // 1. NAVIGATION PROTECTION
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handleBackButton = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);

  // 2. DATA FETCHING
 useEffect(() => {
  const storedUser = localStorage.getItem('narrow_fitness_user');
  if (!storedUser) {
    navigate('/auth');
    return;
  }

  const parsedUser = JSON.parse(storedUser);
  if (parsedUser.role?.toLowerCase() !== 'admin') {
    navigate('/member');
    return;
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const statsRes = await fetch(`/api/admin/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const usersRes = await fetch(`/api/admin/users/recent`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setRecentUsers(usersData);
      }
    } catch (err) {
      console.error('❌ Dashboard Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardData();
}, [navigate]);

  // --- BROADCAST HANDLER ---
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true); // START PROCESSING

    try {
      const res = await fetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });

      if (res.ok) {
        setSendSuccess(true);
        // Wait 2.5 seconds to show success before refreshing
        setTimeout(() => {
          window.location.reload();
        }, 2500);
      } else {
        alert("Failed to send emails. Gmail limit reached or credentials invalid.");
        setIsSending(false);
      }
    } catch (err) {
      alert("Server connection error.");
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Admin Data...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* --- BROADCAST MODAL --- */}
      <AnimatePresence>
        {isBroadcastOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative overflow-hidden"
            >
              
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Megaphone className={`w-6 h-6 text-orange-600 ${isSending ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">System Broadcast</h2>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Email Dispatch</p>
                  </div>
                </div>
                {/* Close button hidden during sending */}
                {!isSending && (
                  <button onClick={() => setIsBroadcastOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                )}
              </div>

              {sendSuccess ? (
                <div className="py-10 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1.1 }} className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <h3 className="text-2xl font-black uppercase text-slate-900 italic">Broadcast Success</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">All members notified. Syncing UI...</p>
                </div>
              ) : (
                <form onSubmit={handleSendBroadcast} className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Subject Line</label>
                     <input required disabled={isSending} value={broadcastData.subject} onChange={e => setBroadcastData({...broadcastData, subject: e.target.value})} placeholder="e.g. Maintenance Notice" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50" />
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Email Message</label>
                     <textarea required disabled={isSending} value={broadcastData.message} onChange={e => setBroadcastData({...broadcastData, message: e.target.value})} placeholder="Type message details here..." rows={6} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-500 resize-none disabled:opacity-50" />
                   </div>
                   
                   {/* DYNAMIC PROCESSING BUTTON */}
                   <button 
                    disabled={isSending} 
                    type="submit" 
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-xl ${
                        isSending ? 'bg-zinc-800 text-orange-500 cursor-wait' : 'bg-black text-white hover:bg-orange-600'
                    }`}
                   >
                      {isSending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="animate-pulse">PROCESSING BROADCAST - PLEASE WAIT</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Dispatch to all Members</span>
                        </>
                      )}
                   </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DASHBOARD CONTENT --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter leading-none">Management Hub</h1>
          <p className="text-gray-500 font-medium tracking-tight mt-1">Control Center & <span className="text-orange-600 font-black italic">Narrow Insights</span></p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/members" className="flex items-center gap-2 bg-black text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-105 shadow-lg"><Users className="w-4 h-4" />Manage Members</Link>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group border border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-600/40"><ShieldCheck className="w-8 h-8 text-white" /></div>
            <div>
              <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">System Health</div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Cloud Infrastructure Secure</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Broadcast Email Server: ONLINE</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg backdrop-blur-md">
             <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest animate-pulse">● Live Stream Monitoring</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Members', value: stats.totalMembers, icon: Users2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Trainers', value: stats.totalTrainers, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Live Classes', value: stats.totalClasses, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pricing Tiers', value: stats.totalPackages, icon: Tag, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}><stat.icon className="w-6 h-6" /></div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8 px-2">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Recent Enrollments</h3>
            <Link to="/admin/members" className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline">Full Database</Link>
          </div>
          <div className="space-y-4">
            {recentUsers.length > 0 ? recentUsers.map((member, i) => (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm font-black text-orange-500 uppercase border border-slate-100">{member.name[0]}</div>
                  <div>
                    <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{member.name}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right hidden sm:block">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Joined</p>
                      <p className="text-[10px] font-bold text-slate-900">{new Date(member.created_at).toLocaleDateString()}</p>
                   </div>
                   <Link to="/admin/members" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:text-orange-500 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></Link>
                </div>
              </motion.div>
            )) : <p className="text-center py-10 text-slate-300 uppercase font-black text-xs">Waiting for registrations...</p>}
          </div>
        </div>

        {/* --- DYNAMIC FAST CONFIG --- */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-orange-600" /> Fast Config</h3>
            <div className="space-y-3">
               <Link to="/admin/payments" className="w-full flex items-center justify-between p-4 rounded-2xl bg-black text-white hover:bg-orange-600 transition-all group shadow-lg">
                  <div className="flex items-center gap-3">
                     <Clock className="w-4 h-4 text-orange-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Payments & Cash</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
               </Link>
               <button onClick={() => { setSendSuccess(false); setIsBroadcastOpen(true); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-orange-600 text-white hover:bg-black transition-all group shadow-lg shadow-orange-100">
                  <div className="flex items-center gap-3">
                     <Megaphone className="w-4 h-4 text-white" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Broadcast Email</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
               </button>
               <Link to="/admin/trainers" className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-orange-500 transition-all group">
                  <div className="flex items-center gap-3"><Plus className="w-4 h-4 text-slate-400 group-hover:text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-black">Add Coach</span></div>
                  <ChevronRight className="w-4 h-4 opacity-10" />
               </Link>
               <Link to="/admin/classes" className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-orange-500 transition-all group">
                  <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-slate-400 group-hover:text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-black">Schedule</span></div>
                  <ChevronRight className="w-4 h-4 opacity-10" />
               </Link>
               <Link to="/admin/pricing" className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-orange-500 transition-all group">
                  <div className="flex items-center gap-3"><Tag className="w-4 h-4 text-slate-400 group-hover:text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-black">Pricing</span></div>
                  <ChevronRight className="w-4 h-4 opacity-10" />
               </Link>
               <Link to="/admin/inquiries" className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-orange-500 transition-all group">
                  <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-black">Inquiries</span></div>
                  <ChevronRight className="w-4 h-4 opacity-10" />
               </Link>
               <Link to="/admin/gallery" className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-zinc-100 hover:border-orange-500 transition-all group">
                  <div className="flex items-center gap-3"><ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-black">Gallery</span></div>
                  <ChevronRight className="w-4 h-4 opacity-10" />
               </Link>
            </div>
          </div>

          <div className="bg-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-600/20">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-2">Admin Protocol</h4>
             <p className="text-[11px] font-medium leading-relaxed uppercase tracking-tight opacity-90 italic">Verify all athlete credentials before bulk notifying changes to membership pricing or session availability.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}