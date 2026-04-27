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
  Star
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface MemberLayoutProps {
  children: React.ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('narrow_fitness_user');
    if (!userStr) {
      navigate('/auth', { replace: true });
      return;
    }

    const parsedUser = JSON.parse(userStr);
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

    setUser(parsedUser);

    // Fetch Membership Status
    const fetchMembership = async () => {
      try {
        const res = await fetch(`/api/member/membership/${parsedUser.id}`);
        const data = await res.json();
        setMembership(data);
        
        // Block Dashboard access if blocked
        if (data?.status === 'blocked' && location.pathname !== '/member/payments') {
           // Redirect to payments but don't allow anything else
           // For now, let's just let them see the blocked message
        }
      } catch (e) { console.error("Membership fetch error", e); }
    };
    fetchMembership();

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('narrow_fitness_token');
    localStorage.removeItem('narrow_fitness_user');
    window.location.href = '/'; 
  };

  // --- IMPROVED REFRESH LOGIC ---
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/member') {
      // If already on home, force a full browser refresh and scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Visual feedback
      window.location.reload(); 
    } else {
      // If on another page, navigate to home
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

            <div className="flex items-center gap-4">
              <button className="relative text-gray-400 hover:text-white p-2 bg-white/5 rounded-xl border border-white/10 transition-colors cursor-pointer">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-black animate-pulse"></span>
              </button>

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

              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl cursor-pointer">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden bg-black border-t border-white/5 overflow-hidden">
              <div className="px-4 py-6 space-y-2">
                {navLinks.map((link) => (
                  <button 
                    key={link.id} 
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      if(link.id === 'dashboard') handleHomeClick(e);
                      else navigate(link.path);
                    }} 
                    className={`flex items-center w-full gap-4 px-4 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                      location.pathname === link.path ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <link.icon className="w-4 h-4" /> {link.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {membership?.status === 'grace_period' && (
          <div className="mb-6 bg-red-600 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg shadow-red-200 animate-pulse">
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-6 h-6" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Membership Grace Period</p>
                <p className="text-[8px] font-bold opacity-80 uppercase">Your membership has expired. Please renew within 10 days to avoid account blocking.</p>
              </div>
            </div>
            <Link to="/member/payments" className="bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors">Renew Now</Link>
          </div>
        )}

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