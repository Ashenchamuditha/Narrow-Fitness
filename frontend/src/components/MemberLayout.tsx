import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Dumbbell, 
  CreditCard, 
  LogOut, 
  Bell, 
  Menu,
  X,
  User,
  ChevronDown,
  Bot,
  Settings,
  ShieldCheck,
  Star,
  Check,
  Info,
  AlertCircle
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface MemberLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function MemberLayout({ children, fullWidth = false }: MemberLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('narrow_fitness_user');
    const token = localStorage.getItem('narrow_fitness_token');
    
    if (!userStr) {
      navigate('/auth', { replace: true });
      return;
    }

    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);

    // Initial Notifications Fetch
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/member/notifications/${parsedUser.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      } catch (err) { console.error("Error fetching notifications:", err); }
    };
    fetchNotifications();

    // Socket.io integration
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    socket.on(`notification_${parsedUser.id}`, (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    socket.on('new_global_notification', (notification: Notification) => {
      setNotifications(prev => {
        if (prev.find(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    });

    const role = parsedUser.role?.toLowerCase();
    const isComplete = parsedUser.is_profile_complete === true;
    const isOnOnboardingPage = location.pathname === '/member/onboarding';

    if (role === 'admin') {
      if (!location.pathname.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      }
      return; 
    }

    if (!isComplete) {
      if (!isOnOnboardingPage) {
        navigate('/member/onboarding', { replace: true });
        return;
      }
    } else {
      if (isOnOnboardingPage) {
        navigate('/member', { replace: true });
        return;
      }
    }

    // Fetch Membership Status
    const fetchMembership = async () => {
      try {
        const res = await fetch(`/api/member/membership/${parsedUser.id}`);
        const data = await res.json();
        setMembership(data);
      } catch (e) { console.error("Membership fetch error", e); }
    };
    fetchMembership();

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      socket.disconnect();
    };
  }, [navigate, location.pathname]);

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('narrow_fitness_token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/member/notifications/mark-read/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error("Error marking read:", err); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('narrow_fitness_token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/member/notifications/mark-all-read/${user.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) { console.error("Error marking all read:", err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('narrow_fitness_token');
    localStorage.removeItem('narrow_fitness_user');
    window.location.href = '/'; 
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/member') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.location.reload(); 
    } else {
      window.location.href = '/member';
    }
  };

  const navLinks = [
    { id: 'dashboard', name: 'Narrow Hub', icon: LayoutDashboard, path: '/member' },
    { id: 'classes', name: 'Classes', icon: Calendar, path: '/member/classes' },
    { id: 'workout', name: 'Workouts', icon: Dumbbell, path: '/member/workout' },
    { id: 'ai-assistant', name: 'AI Assistant', icon: Bot, path: '/member/ai-assistant' },
    { id: 'payments', name: 'Memberships', icon: CreditCard, path: '/member/payments' },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-orange-500" />;
    }
  };

  if (!user && location.pathname !== '/member/onboarding') return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-white/20"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-black text-center uppercase tracking-tighter mb-2">Sign Out?</h3>
              <p className="text-gray-500 text-center text-sm mb-8 font-medium">Are you sure you want to end your current training session?</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowLogoutConfirm(false)} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleLogout} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-all">Logout</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOP NAVBAR --- */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-black text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* LOGO BUTTON */}
            <button 
              onClick={handleHomeClick}
              className="flex items-center gap-3 group text-left outline-none cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center group-hover:rotate-12 transition-transform">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter uppercase italic leading-none">Narrow Fitness</span>
                <span className="text-[8px] font-bold text-orange-500 uppercase tracking-[0.3em] mt-1 leading-none">Intelligence Hub</span>
              </div>
            </button>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                link.id === 'dashboard' ? (
                  <button
                    key={link.id}
                    onClick={handleHomeClick}
                    className={`text-[10px] font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer ${
                      location.pathname === link.path ? 'text-orange-500 bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </button>
                ) : (
                  <Link
                    key={link.id}
                    to={link.path}
                    className={`text-[10px] font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl flex items-center gap-2 ${
                      location.pathname === link.path ? 'text-orange-500 bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.name}
                  </Link>
                )
              ))}
            </div>

            {/* TOP BAR ACTIONS */}
            <div className="flex items-center gap-4">
              {/* Notification Center */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative text-gray-400 hover:text-white p-2 bg-white/5 rounded-xl border border-white/10 transition-colors cursor-pointer group"
                >
                  <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-black animate-pulse"></span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden z-[100]"
                    >
                      <div className="p-6 bg-slate-50 flex items-center justify-between border-b border-gray-100">
                        <div>
                          <h3 className="text-xs font-black text-black uppercase tracking-widest">Training Alerts</h3>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">You have {unreadCount} unread sessions</p>
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:underline"
                          >
                            Mark All Clear
                          </button>
                        )}
                      </div>

                      <div className="max-h-[400px] overflow-y-auto p-3">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Bell className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No updates found</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {notifications.map((notif) => (
                              <div 
                                key={notif.id}
                                onClick={() => markAsRead(notif.id)}
                                className={`
                                  p-4 rounded-[1.5rem] transition-all cursor-pointer group relative
                                  ${notif.is_read ? 'bg-transparent hover:bg-slate-50' : 'bg-orange-50/50 hover:bg-orange-100/50 border border-orange-100/50 shadow-sm'}
                                `}
                              >
                                <div className="flex gap-4">
                                  <div className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                                    ${notif.is_read ? 'bg-slate-50 border-slate-100' : 'bg-white border-orange-100'}
                                  `}>
                                    {getNotificationIcon(notif.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-[10px] font-black text-black uppercase tracking-wide truncate pr-4">{notif.title}</h4>
                                      <span className="text-[8px] text-gray-400 font-bold uppercase shrink-0">
                                        {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">{notif.message}</p>
                                  </div>
                                </div>
                                {!notif.is_read && (
                                  <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-orange-600 rounded-full" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-gray-100 text-center">
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em]">End of Transmission</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)} 
                  className={`flex items-center gap-3 pl-2 pr-1.5 py-1.5 rounded-2xl transition-all border cursor-pointer ${
                    isProfileOpen ? 'bg-orange-600 border-orange-400 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="text-right hidden sm:block pr-1">
                    <div className="text-[10px] font-black uppercase tracking-tighter leading-none mb-0.5 text-white">
                      {user?.name?.split(' ')[0] || 'Athlete'}
                    </div>
                    <div className={`text-[8px] font-bold uppercase tracking-widest leading-none ${isProfileOpen ? 'text-white/80' : 'text-orange-500'}`}>
                      Verified
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border-2 border-white/20 overflow-hidden shadow-inner transform transition-transform group-hover:scale-105">
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isProfileOpen ? 'rotate-180 text-white' : 'text-gray-500'}`} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 15, scale: 0.95 }} 
                      className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden z-[100]"
                    >
                      <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="bg-orange-600 px-2 py-0.5 rounded-lg">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Active status</span>
                             </div>
                             <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                          </div>
                          <p className="text-lg font-black italic tracking-tight truncate uppercase">{user?.name}</p>
                          <p className="text-gray-400 text-[10px] font-bold truncate opacity-60 lowercase">{user?.email}</p>
                        </div>
                        <ShieldCheck className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
                      </div>

                      <div className="p-4 grid grid-cols-1 gap-1">
                        <Link 
                          to="/member/settings" 
                          onClick={() => setIsProfileOpen(false)} 
                          className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gray-50 transition-all group"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                            <Settings className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest">Account Settings</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Profile & Privacy</span>
                          </div>
                        </Link>

                        <div className="h-px bg-gray-100 my-2 mx-4" />

                        <button 
                          onClick={() => { setIsProfileOpen(false); setShowLogoutConfirm(true); }} 
                          className="flex items-center gap-3 w-full p-3.5 rounded-2xl hover:bg-red-50 transition-all group cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <LogOut className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[11px] font-black text-red-600 uppercase tracking-widest">Logout</span>
                            <span className="text-[8px] font-bold text-red-300 uppercase">Finish Session</span>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-black/90 backdrop-blur-lg border-t border-white/10 px-4 pb-safe pt-2">
        <div className="flex justify-between items-center max-w-lg mx-auto h-16">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.id}
                onClick={(e) => {
                  if (link.id === 'dashboard') handleHomeClick(e);
                  else navigate(link.path);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 ${
                  isActive ? 'text-orange-500' : 'text-gray-500'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-orange-500/10' : ''}`}>
                  <link.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest truncate w-full text-center">
                  {link.id === 'dashboard' ? 'Hub' : link.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className={`pt-28 pb-32 lg:pb-12 px-4 sm:px-6 lg:px-8 mx-auto ${fullWidth ? 'max-w-none' : 'max-w-7xl'}`}>
        {membership?.status === 'blocked' && location.pathname !== '/member/payments' ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-red-100 shadow-xl">
             <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                <X className="w-10 h-10 text-red-500" />
             </div>
             <h2 className="text-2xl font-black text-black uppercase tracking-tighter mb-2">Account Blocked</h2>
             <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs text-center">Your membership has been blocked due to non-payment. Please renew your plan to regain access to the AI Assistant and Dashboard.</p>
             <Link to="/member/payments" className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-xl shadow-gray-200">Go to Memberships</Link>
          </div>
        ) : children}
      </main>
    </div>
  );
}
