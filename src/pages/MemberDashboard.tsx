import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  TrendingUp, 
  Activity,
  Calendar,
  ChevronRight,
  Bot,
  Zap,
  Target,
  Scale,
  ArrowUpRight,
  ClipboardList,
  History,
  PlayCircle,
  Timer,
  Ban,
  MessageSquare,
  Calculator,
  X,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MemberLayout from '../components/MemberLayout';

export default function MemberDashboard() {
  const [user, setUser] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [lastAiMessage, setLastAiMessage] = useState<string>("Ready to crush your goals? Ask me anything!");
  const [lastAiTime, setLastAiTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quick BMI States
  const [isBmiModalOpen, setIsBmiModalOpen] = useState(false);
  const [bmiInputs, setBmiInputs] = useState({ weight: '', height: '' });
  const [bmiResult, setBmiResult] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handleBackButton = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    // 1. Fetch Profile
    fetch(`/api/member/profile/${parsedUser.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.userid) {
          const updatedUser = { 
            ...parsedUser, 
            subscription_status: data.subscription_status,
            package_name: data.package_name,
            profile_data: data 
          };
          setUser(updatedUser);
          localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
        }
      })
      .catch(err => console.error('Error fetching profile:', err));

    // 2. Fetch Classes
    fetch(`/api/member/classes?userId=${parsedUser.id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setClasses(data.slice(0, 3));
      });

    // 3. Fetch Active Workout
    fetch(`/api/member/workouts/${parsedUser.id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const active = data.find((w: any) => w.is_active);
          setActiveWorkout(active ? active.title : "No Active Plan");
        }
      });

    // 4. FETCH LAST AI MESSAGE (Fixed logic to match your router output)
    fetch(`/api/member/ai/history/${parsedUser.id}`)
      .then(res => res.json())
      .then(data => {
        // Data comes in as { messages: [...], usage: {...} }
        const msgs = data.messages;
        if (msgs && Array.isArray(msgs) && msgs.length > 0) {
          const modelMessages = msgs.filter((m: any) => m.role === 'model');
          if (modelMessages.length > 0) {
            const latest = modelMessages[modelMessages.length - 1];
            // Clean Markdown markers for the preview
            const cleanText = latest.message
              .replace(/[|#*-]/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 120);
            
            setLastAiMessage(cleanText + (latest.message.length > 120 ? '...' : ''));
            setLastAiTime(new Date(latest.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }));
          }
        }
      })
      .catch(err => console.error('Error fetching AI history:', err));

    setLoading(false);
  }, [navigate]);

  // BMI Calculation Logic
  const handleCalculateBmi = () => {
    const w = parseFloat(bmiInputs.weight);
    const h = parseFloat(bmiInputs.height) / 100;
    if (w > 0 && h > 0) {
      const result = (w / (h * h)).toFixed(1);
      setBmiResult(result);
    }
  };

  const getClassStatus = (day: string, time: string, isCancelled: boolean) => {
    if (isCancelled) return { label: 'Cancelled', color: 'text-red-500 bg-red-50', icon: Ban };
    return { label: 'Scheduled', color: 'text-orange-600 bg-orange-50', icon: Timer };
  };

  if (!user) return null;

  return (
    <MemberLayout>
      {/* --- QUICK BMI CALCULATOR MODAL --- */}
      <AnimatePresence>
        {isBmiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => {setIsBmiModalOpen(false); setBmiResult(null);}} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 transition-all"><X className="w-4 h-4" /></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">BMI Tool</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Instant biometric analysis</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Current Weight (kg)</label>
                  <input type="number" value={bmiInputs.weight} onChange={(e) => setBmiInputs({...bmiInputs, weight: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold focus:border-orange-500 transition-all" placeholder="70" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Height (cm)</label>
                  <input type="number" value={bmiInputs.height} onChange={(e) => setBmiInputs({...bmiInputs, height: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold focus:border-orange-500 transition-all" placeholder="175" />
                </div>
              </div>

              {bmiResult && (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-black p-6 rounded-3xl text-center mb-8">
                  <div className="text-3xl font-black text-white">{bmiResult}</div>
                  <div className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1">Your Calculated BMI</div>
                </motion.div>
              )}

              <button onClick={handleCalculateBmi} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2">
                <Calculator className="w-4 h-4" /> Run Analysis
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50/50 -mt-10 pt-10 px-2 sm:px-0">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
              Narrow <span className="text-orange-600">Hub</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Personal Performance Dashboard</p>
          </div>
          <Link to="/member/ai-assistant" className="group flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-orange-600 shadow-xl shadow-black/10">
            <Bot className="w-5 h-5 text-orange-500 group-hover:text-white" />
            AI Fitness Coach
          </Link>
        </div>

        {/* SUBSCRIPTION CARD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-600/40">
                <Zap className="w-10 h-10 text-white fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Member Status</div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${user?.subscription_status === 'active' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 'text-slate-400 border-slate-700 bg-slate-800'}`}>
                    {user?.subscription_status === 'active' ? 'Active' : 'None'}
                  </span>
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                  {user?.package_name || "Free Tier"} <span className="text-orange-500">Member</span>
                </h2>
              </div>
            </div>
            <Link to="/member/payments" className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 hover:text-white transition-all transform hover:scale-105 shadow-xl">
              {user?.subscription_status === 'active' ? 'Manage Plan' : 'Explore Plans'}
            </Link>
          </div>
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]" />
        </motion.div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm group">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors"><ClipboardList className="w-6 h-6" /></div>
            <div className="text-xl font-black text-slate-900 tracking-tighter mb-1 uppercase truncate">{activeWorkout || "Ready"}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Workout</div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Scale className="w-6 h-6" /></div>
                <button onClick={() => setIsBmiModalOpen(true)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-orange-100 hover:text-orange-600 transition-all"><Calculator className="w-4 h-4" /></button>
              </div>
              <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
                {user?.profile_data?.current_weight && user?.profile_data?.height ? 
                  (user.profile_data.current_weight / ((user.profile_data.height / 100) ** 2)).toFixed(1) : '--'}
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Body Mass Index</div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Target className="w-6 h-6" /></div>
              <span className="text-xs font-black text-orange-600">Goal Match</span>
            </div>
            <div className="text-xl font-black text-slate-900 tracking-tighter mb-1 uppercase truncate">
              {user?.profile_data?.primary_goal || "No Goal Set"}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Athlete Strategy</div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm group">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Dumbbell className="w-6 h-6" /></div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{user?.profile_data?.current_weight || '--'}<span className="text-lg text-slate-400 ml-1 font-bold">kg</span></div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Weight</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          {/* SCHEDULE */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Weekly Schedule</h3>
              <Link to="/member/classes" className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] hover:text-orange-700 flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {classes.length > 0 ? (
                classes.map((cls, i) => {
                  const status = getClassStatus(cls.class_day, cls.class_time, cls.is_cancelled);
                  const StatusIcon = status.icon;
                  return (
                    <motion.div key={i} whileHover={{ x: 10 }} className="flex items-center justify-between p-5 rounded-3xl bg-white border border-slate-100 hover:border-orange-300 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-orange-600 border border-slate-100 shadow-inner"><Calendar className="w-7 h-7" /></div>
                        <div>
                          <div className="font-black text-slate-900 uppercase tracking-tight text-lg">{cls.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2"><span className="text-orange-600">{cls.trainer_name}</span> • {cls.class_time}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.color}`}><StatusIcon className="w-3 h-3" /> {status.label}</div>
                        <Link to="/member/classes" className="p-3 rounded-xl bg-slate-900 text-white hover:bg-orange-600 transition-all"><ChevronRight className="w-5 h-5" /></Link>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No scheduled sessions found</p></div>
              )}
            </div>
          </div>

          {/* AI COACH CARD */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner"><Bot className="w-8 h-8" /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">AI Coach</h3>
                <div className="flex items-center gap-1.5 mt-1">
                   <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Intelligence Live</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="relative p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-6 h-36 overflow-hidden">
                <div className="flex items-center gap-2 mb-2 opacity-50">
                  <MessageSquare className="w-3 h-3 text-orange-600" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Latest Insight {lastAiTime && `• ${lastAiTime}`}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed font-bold italic">
                  "{lastAiMessage}"
                </p>
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-slate-50 to-transparent" />
              </div>
            </div>

            <Link to="/member/ai-assistant" className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs text-center hover:bg-orange-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
              Continue Coaching <ChevronRight className="w-4 h-4" />
            </Link>
            
            <TrendingUp className="absolute -top-10 -right-10 w-40 h-40 text-slate-50 -rotate-12" />
          </div>
        </div>

        <div className="py-10 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Narrow Fitness System v1.0 • Sri Lanka</p>
        </div>
      </div>
    </MemberLayout>
  );
}