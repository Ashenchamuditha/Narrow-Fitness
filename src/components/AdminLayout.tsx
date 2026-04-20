import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Calendar, 
  CreditCard, 
  Settings, 
  LogOut, 
  Bell, 
  Menu,
  X,
  Dumbbell,
  Tag,
  ChevronRight,
  Clock,
  MessageSquare, 
  Image as ImageIcon,
  Send, 
  Mail, 
  Loader2, 
  Megaphone 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date()); 
  
  const [broadcastData, setBroadcastData] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role?.toLowerCase() !== 'admin') {
        navigate('/member');
      }
      setUser(parsedUser);
    } else {
      navigate('/auth');
    }

    return () => clearInterval(timer); 
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('narrow_fitness_token');
    localStorage.removeItem('narrow_fitness_user');
    navigate('/');
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.subject || !broadcastData.message) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });

      if (res.ok) {
        alert("✅ Broadcast sent successfully to all members.");
        setBroadcastData({ subject: '', message: '' });
        setIsBroadcastModalOpen(false);
      } else {
        alert("❌ Failed to send broadcast.");
      }
    } catch (err) {
      alert("❌ Connection error.");
    } finally {
      setIsSending(false);
    }
  };

  const sidebarLinks = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'members', name: 'Members', icon: Users, path: '/admin/members' },
    { id: 'trainers', name: 'Trainers', icon: UserPlus, path: '/admin/trainers' },
    { id: 'classes', name: 'Classes', icon: Calendar, path: '/admin/classes' },
    { id: 'pricing', name: 'Pricing', icon: Tag, path: '/admin/pricing' },
    { id: 'inquiries', name: 'Inquiries', icon: MessageSquare, path: '/admin/inquiries' }, 
    { id: 'gallery', name: 'Gallery', icon: ImageIcon, path: '/admin/gallery' },    
  ];

  const activePage = sidebarLinks.find(link => link.path === location.pathname)?.name || 'Management';

  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-gray-100">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-black text-center uppercase tracking-tighter mb-2">Confirm Logout</h3>
              <p className="text-gray-500 text-center text-sm mb-8 font-medium">Are you sure you want to sign out of your admin account?</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowLogoutConfirm(false)} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleLogout} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">Logout</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- BROADCAST MODAL --- */}
      <AnimatePresence>
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBroadcastModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Megaphone className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black uppercase italic tracking-tighter">Broadcast</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email all gym members</p>
                  </div>
                </div>
                <button onClick={() => setIsBroadcastModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-5">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Message Subject</label>
                  <input required value={broadcastData.subject} onChange={e => setBroadcastData({...broadcastData, subject: e.target.value})} placeholder="e.g. Holiday Notice / Maintenance" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border border-slate-100 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Email Content</label>
                  <textarea required value={broadcastData.message} onChange={e => setBroadcastData({...broadcastData, message: e.target.value})} placeholder="Type your announcement here..." rows={6} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border border-slate-100 focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none" />
                </div>
                <button disabled={isSending} type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-xl disabled:bg-slate-200">
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send to all users</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-black text-white hidden lg:flex flex-col fixed h-full z-20">
        <div className="p-8 flex items-center gap-2">
          <Dumbbell className="w-8 h-8 text-orange-500" />
          <span className="text-2xl font-black tracking-tighter uppercase italic leading-none">Narrow<br/><span className="text-orange-500">Fitness</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${
                location.pathname === link.path ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-500 hover:text-white hover:bg-white/10'
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-900">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] text-red-500 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-500"><Menu className="w-6 h-6" /></button>
            <div className="hidden sm:flex flex-col">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <span>Narrow Fitness</span>
                  <ChevronRight className="w-3 h-3 text-orange-500" />
                  <span className="text-black">{activePage}</span>
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest">
                  <Clock className="w-3 h-3 text-orange-500" />
                  {formattedDate} | {formattedTime}
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            <button 
              onClick={() => setIsBroadcastModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm group"
            >
              <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Notify Members</span>
            </button>

            <button className="relative text-gray-400 hover:text-orange-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white text-[8px] text-white flex items-center justify-center font-black">3</span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-black text-black uppercase tracking-tight leading-none mb-1">{user?.name || 'Admin'}</div>
                <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Master Controller</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border-2 border-orange-500 shadow-lg font-black text-orange-500 italic text-xs">
                {user?.name ? user.name.split(' ').map((n: any) => n[0]).join('') : 'A'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-10">
          {children}
        </main>
      </div>
      
      {/* MOBILE SIDEBAR (FIXED LOGOUT BUTTON) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
           <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-30 lg:hidden" />
            <motion.aside 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              className="fixed inset-y-0 left-0 w-64 bg-black text-white z-40 lg:hidden flex flex-col shadow-2xl overflow-y-auto no-scrollbar"
            >
              <div className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-6 h-6 text-orange-500" />
                  <span className="text-xl font-black uppercase italic tracking-tighter">Narrow Fitness</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              
              <nav className="flex-1 px-4 space-y-2">
                {sidebarLinks.map((link) => (
                  <Link 
                    key={link.id} 
                    to={link.path} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${location.pathname === link.path ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <link.icon className="w-5 h-5" /> {link.name}
                  </Link>
                ))}
              </nav>

              {/* MOBILE LOGOUT BUTTON */}
              <div className="p-6 border-t border-gray-900 mt-auto">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); setShowLogoutConfirm(true); }} 
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              </div>
            </motion.aside>
           </>
        )}
      </AnimatePresence>
    </div>
  );
}