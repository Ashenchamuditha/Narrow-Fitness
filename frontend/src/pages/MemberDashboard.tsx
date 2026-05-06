import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
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
  RefreshCw,
  QrCode,
  Scan,
  Loader2,
  CheckCircle2,
  LogIn,
  LogOut,
  AlertCircle,
  User as UserIcon
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import MemberLayout from '../components/MemberLayout';

export default function MemberDashboard() {
  const [user, setUser] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [lastAiMessage, setLastAiMessage] = useState<string>("Ready to achieve your goals? Ask me anything!");
  const [lastAiTime, setLastAiTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [lastSession, setLastSession] = useState<any>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isIdQrOpen, setIsIdQrOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [isBmiModalOpen, setIsBmiModalOpen] = useState(false);
  const [bmiInputs, setBmiInputs] = useState({ weight: '', height: '' });
  const [bmiResult, setBmiResult] = useState<string | null>(null);
  const [notificationPopup, setNotificationPopup] = useState<any>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // --- NEW: SOCKET LISTENER FOR ATTENDANCE POPUP ---
  useEffect(() => {
    if (!user) return;
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    
    socket.on(`notification_${user.id}`, (notif: any) => {
      // Specifically look for check-in/out titles to show popup
      if (notif.title.includes('Check-in') || notif.title.includes('Check-out')) {
        setNotificationPopup(notif);
        // Auto-close after 10 seconds
        const timer = setTimeout(() => setNotificationPopup(null), 10000);
        return () => clearTimeout(timer);
      }
    });

    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (attendanceStatus) {
      interval = setInterval(() => {
        const start = new Date(attendanceStatus.check_in).getTime();
        const now = new Date().getTime();
        setSessionDuration(Math.floor((now - start) / 60000));
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [attendanceStatus]);

  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    fetchMembership(parsedUser.id);
    fetchAttendanceStatus(parsedUser.id);

    fetch(`/api/member/profile/${parsedUser.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.userid) {
          const updatedUser = { 
            ...parsedUser, 
            subscription_status: data.subscription_status,
            package_name: data.package_name,
            profile_image: data.profile_image,
            profile_data: data 
          };
          setUser(updatedUser);
          localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
        }
      })
      .catch(err => console.error('Error fetching profile:', err));

    fetch(`/api/member/classes?userId=${parsedUser.id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setClasses(data.slice(0, 3));
      });

    fetch(`/api/member/workouts/${parsedUser.id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const active = data.find((w: any) => w.is_active);
          setActiveWorkout(active ? active.title : "No Active Plan");
        }
      });

    // --- NEW: FETCH LATEST AI COACH MESSAGE ---
    const fetchLatestAiInsight = async () => {
      try {
        const sessionsRes = await fetch(`/api/member/ai/sessions/${parsedUser.id}`);
        const sessions = await sessionsRes.json();
        
        if (sessions && Array.isArray(sessions) && sessions.length > 0) {
          const latestSessionId = sessions[0].id; // sessions are ORDER BY created_at DESC
          const historyRes = await fetch(`/api/member/ai/history/${latestSessionId}`);
          const historyData = await historyRes.json();
          
          if (historyData.messages && Array.isArray(historyData.messages)) {
            const modelMessages = historyData.messages.filter((m: any) => m.role === 'model');
            if (modelMessages.length > 0) {
              const latest = modelMessages[modelMessages.length - 1];
              const cleanText = latest.message
                .replace(/[|#*-]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 120);
              
              setLastAiMessage(cleanText + (latest.message.length > 120 ? '...' : ''));
              setLastAiTime(new Date(latest.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching AI insight:', err);
      }
    };

    fetchLatestAiInsight();

    setLoading(false);
  }, [navigate]);

  const fetchMembership = async (userId: number) => {
    try {
      const res = await fetch(`/api/member/membership/${userId}`);
      const data = await res.json();
      setMembership(data);
    } catch (e) { console.error(e); }
  };

  const fetchAttendanceStatus = async (userId: number) => {
    try {
      const res = await fetch(`/api/attendance/status/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceStatus(data.active);
        setLastSession(data.last);
        
        if (data.active) {
          const start = new Date(data.active.check_in).getTime();
          const now = new Date().getTime();
          setSessionDuration(Math.floor((now - start) / 60000));
        }
      }
    } catch (err) {
      console.error('Error fetching attendance status:', err);
    }
  };

  const handleMarkAttendance = async (scannedResult: string) => {
    if (isScanning) return;
    setIsScanning(true);
    
    console.log("🔍 QR Scanned:", scannedResult);
    
    try {
      const endpoint = attendanceStatus ? '/api/attendance/check-out' : '/api/attendance/check-in';
      console.log(`📡 Sending request to ${endpoint} for User ID: ${user.id}`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, qrKey: scannedResult.trim() })
      });

      const data = await res.json();
      console.log("📥 Server Response:", data);

      if (res.ok) {
        await fetchAttendanceStatus(user.id);
        stopScanner();
        setIsScanModalOpen(false);
        setIsScanning(false);
        toast.success(attendanceStatus ? "Check-out confirmed. Great session!" : "Check-in successful. Welcome to the gym!");
      } else {
        console.error("❌ Attendance Logic Error:", data.message);
        toast.error(data.message || "Attendance failed");
        setIsScanning(false); // Allow retry
      }
    } catch (err) {
      console.error("❌ Network Error during attendance:", err);
      toast.error("Network error. Please try again.");
      setIsScanning(false); // Allow retry
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  useEffect(() => {
    if (isScanModalOpen) {
      setCameraError(null);
      const startCamera = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode;

          const config = { 
            fps: 15, 
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
          };

          await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
              if (!isScanning) {
                html5QrCode.stop(); // Stop scanner immediately to prevent double scans
                handleMarkAttendance(decodedText);
              }
            },
            () => {} 
          );
        } catch (err: any) {
          console.error("Camera Error:", err);
          setCameraError("Camera access denied or not found. Please enable permissions.");
        }
      };
      startCamera();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [isScanModalOpen]);

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

  // --- GRACE PERIOD CALCULATION ---
  const getGraceInfo = () => {
    if (membership?.status !== 'grace_period' || !membership?.expiry_date) return null;
    
    const expiry = new Date(membership.expiry_date);
    const GRACE_DAYS = 10;
    const totalGraceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;
    const blockDate = new Date(expiry.getTime() + totalGraceMs); // Expiry + 10 days
    const now = new Date();
    
    const diff = blockDate.getTime() - now.getTime();
    
    // If it's technically past the 10-day grace period but DB still says 'grace_period',
    // we still show the banner but with 0 time left, until the backend moves it to 'blocked'
    const isExpired = diff <= 0;

    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const mins = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

    const percentageLeft = Math.min(100, Math.max(0, (diff / totalGraceMs) * 100));
    
    return {
      timeLeft: isExpired ? "0d 0h 0m" : `${days}d ${hours}h ${mins}m`,
      isLastDay: days < 1 || isExpired,
      expired: isExpired,
      percentageLeft
    };
  };

  const graceInfo = getGraceInfo();

  return (
    <MemberLayout>
      {/* --- GRACE PERIOD BANNER --- */}
      {membership?.status === 'grace_period' && graceInfo && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mb-6 overflow-hidden rounded-3xl border-2 border-yellow-500/20 shadow-lg shadow-black/5 bg-yellow-50"
        >
          <div className={`px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10`}>
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 p-2 rounded-xl text-black">
                <AlertCircle className={`w-6 h-6 ${graceInfo.isLastDay ? 'animate-bounce' : 'animate-pulse'}`} />
              </div>
              <div>
                <p className="font-black uppercase italic tracking-tighter text-lg leading-none text-yellow-900">
                  {graceInfo.isLastDay ? 'FINAL WARNING: EXPIRED' : 'MEMBERSHIP EXPIRED'}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-widest text-yellow-700 opacity-80 mt-1`}>
                  {graceInfo.isLastDay 
                    ? 'Your session will be BLOCKED today. Pay immediately to keep access.' 
                    : `Your access expired on ${new Date(membership.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}. Grace period active.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className={`text-[9px] font-black uppercase tracking-widest text-yellow-700 opacity-80 leading-none mb-1`}>Time Shower</p>
                <p className="font-mono font-black text-xl tracking-tighter leading-none text-yellow-900">{graceInfo.timeLeft}</p>
              </div>
              <Link to="/member/payments" className="bg-yellow-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-md shadow-yellow-500/20">
                Renew Access
              </Link>
            </div>
          </div>
          {/* Progress Bar (Time Shower) */}
          <div className="h-1.5 bg-yellow-200 w-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${graceInfo.percentageLeft}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${graceInfo.isLastDay ? 'bg-red-500' : 'bg-yellow-500'}`}
            />
          </div>
        </motion.div>
      )}

      {/* --- BLOCKED OVERLAY (Actual Block) --- */}
      {membership?.status === 'blocked' && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="w-24 h-24 bg-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-600/40">
              <Ban className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4">Account Blocked</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs max-w-md mx-auto leading-relaxed mb-10">
              Your grace period has expired and your session is now locked. Please settle your outstanding payments to reactivate your elite access.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/member/payments" className="w-full sm:w-auto bg-red-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-red-600 transition-all shadow-xl shadow-red-600/20">
                Go to Payments
              </Link>
              <button onClick={() => window.location.reload()} className="w-full sm:w-auto bg-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all">
                Try Refresh
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {isBmiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative">
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

      <AnimatePresence>
        {isIdQrOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center relative overflow-hidden">
              <button onClick={() => setIsIdQrOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full hover:bg-red-50 transition-all text-slate-400"><X className="w-5 h-5" /></button>
              
              <div className="mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-600 shadow-inner">
                  <UserIcon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-black leading-none">Athlete Identity</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Personal Payment & Access QR</p>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2.5rem] border-4 border-black mb-8 flex items-center justify-center">
                <QRCodeSVG 
                  value={`NF_USER_${user.id}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="text-slate-900 font-black uppercase italic tracking-tighter text-lg mb-1">{user.name}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Show this code to your coach for manual payment recording or attendance verification.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[3rem] p-10 max-sm w-full shadow-2xl relative overflow-hidden text-center">
              <button onClick={() => setIsScanModalOpen(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full hover:bg-red-50 transition-all text-slate-400"><X className="w-5 h-5" /></button>
              
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-orange-600 shadow-inner">
                  {attendanceStatus ? <LogOut className="w-10 h-10" /> : <QrCode className="w-10 h-10" />}
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-black leading-none">
                  {attendanceStatus ? 'Check Out' : 'Scan Access'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Verified Gym Entrance</p>
              </div>

              <div className="relative aspect-square bg-slate-900 rounded-[2.5rem] mb-10 overflow-hidden group">
                <div id="qr-reader" className="w-full h-full overflow-hidden"></div>
                {(isScanning || cameraError) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 backdrop-blur-md z-20 p-8 text-center">
                    {cameraError ? (
                      <>
                        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-2">Access Blocked</span>
                        <p className="text-[9px] font-bold text-slate-300 leading-relaxed">{cameraError}</p>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Verifying Access...</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest text-center px-4 leading-relaxed">
                {cameraError ? 'System Error' : `Scan the official gym QR code to ${attendanceStatus ? 'exit' : 'enter'}`}
              </p>
              <style>{`
                #qr-reader { border: none !important; }
                #qr-reader__scan_region { background: #000; }
                #qr-reader__dashboard { display: none !important; }
                #qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 2rem; }
              `}</style>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notificationPopup && (
          <AttendancePopup 
            notif={notificationPopup} 
            onClose={() => setNotificationPopup(null)} 
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50/50 -mt-10 pt-10 px-2 sm:px-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
              Narrow <span className="text-orange-600">Hub</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Personal Performance Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsScanModalOpen(true)}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${
                attendanceStatus ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white' : 'bg-white text-black border border-slate-200 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {attendanceStatus ? <LogOut className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
              {attendanceStatus ? 'Check Out' : 'Scan QR'}
            </button>
            <Link to="/member/ai-assistant" className="group flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-orange-600 shadow-xl shadow-black/10">
              <Bot className="w-5 h-5 text-orange-500 group-hover:text-white" />
              AI Fitness Coach
            </Link>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-6 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-600/40 shrink-0">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white/20" />
              </div>
              <div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2">
                  <div className="text-[9px] sm:text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Member Status</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${
                      membership?.status === 'active' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                      membership?.status === 'grace_period' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                      membership?.status === 'blocked' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                      'text-slate-400 border-slate-700 bg-slate-800'
                    }`}>
                      {membership?.status || 'None'}
                    </span>
                    <button 
                      onClick={() => setIsIdQrOpen(true)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all border border-white/10"
                      title="Show my Identity QR"
                    >
                      <QrCode className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white leading-tight">
                  {user?.package_name || "Free Tier"} <span className="text-orange-500">Member</span>
                </h2>
                {membership && (
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Expires: <span className="text-white">{new Date(membership.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </p>
                    {membership.balance_due > 0 && (
                      <p className="text-[8px] sm:text-[9px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                        Due: LKR {membership.balance_due}
                      </p>
                    )}
                    {membership.balance_due < 0 && (
                      <p className="text-[8px] sm:text-[9px] font-bold text-green-400 uppercase tracking-widest">
                        Credit: LKR {Math.abs(membership.balance_due)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Link to="/member/payments" className="w-full md:w-auto bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-orange-600 hover:text-white transition-all transform hover:scale-105 shadow-xl text-center">
              {user?.subscription_status === 'active' ? 'Manage Plan' : 'Explore Plans'}
            </Link>
          </div>
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
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
                {user?.profile_data?.current_weight && user?.profile_data?.height ? (user.profile_data.current_weight / ((user.profile_data.height / 100) ** 2)).toFixed(1) : '--'}
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live BMI</div>
            </div>
          </div>
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Target className="w-6 h-6" /></div>
              <span className="text-xs font-black text-orange-600">Goal Match</span>
            </div>
            <div className="text-xl font-black text-slate-900 tracking-tighter mb-1 uppercase truncate">{user?.profile_data?.primary_goal || "No Goal Set"}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Athlete Strategy</div>
          </div>
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm group">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Dumbbell className="w-6 h-6" /></div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{user?.profile_data?.current_weight || '--'}<span className="text-lg text-slate-400 ml-1 font-bold">kg</span></div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Weight</div>
          </div>

          <div className={`p-7 rounded-[2rem] border shadow-sm group relative overflow-hidden transition-all duration-500 ${
            attendanceStatus 
              ? 'bg-orange-600 border-orange-500 text-white' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                attendanceStatus ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-900 group-hover:bg-orange-600 group-hover:text-white'
              }`}>
                {attendanceStatus ? <Activity className="w-6 h-6 animate-pulse" /> : <History className="w-6 h-6" />}
              </div>
              {attendanceStatus && (
                <div className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">Live</div>
              )}
            </div>

            {attendanceStatus ? (
              <>
                <div className="text-4xl font-black tracking-tighter mb-1">{sessionDuration}<span className="text-lg ml-1 opacity-60">m</span></div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Current Session</div>
                <div className="space-y-1 border-t border-white/10 pt-4 mt-2">
                   <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider opacity-80">
                      <span>Started At</span>
                      <span>{new Date(attendanceStatus.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                </div>
                <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((sessionDuration / 90) * 100, 100)}%` }} className="h-full bg-white" />
                </div>
              </>
            ) : lastSession && new Date(lastSession.attendance_date).toDateString() === new Date().toDateString() ? (
              <>
                <div className="text-3xl font-black tracking-tighter mb-1">{lastSession.duration_minutes}<span className="text-lg ml-1 text-orange-600">m</span></div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Today's Summary</div>
                <div className="space-y-2 border-t border-slate-50 pt-4 mt-2">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                      <span>In</span>
                      <span className="text-slate-900">{new Date(lastSession.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                      <span>Out</span>
                      <span className="text-slate-900">{new Date(lastSession.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                </div>
              </>
            ) : lastSession ? (
              <>
                <div className="text-3xl font-black tracking-tighter mb-1">{lastSession.duration_minutes}<span className="text-lg ml-1 text-slate-400 font-bold">m</span></div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Session</div>
                <div className="mt-4 text-[9px] font-bold text-slate-400 uppercase flex justify-between">
                  <span>{new Date(lastSession.attendance_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  <span className="text-slate-900">{lastSession.duration_minutes} mins</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-black tracking-tighter mb-1 uppercase">No Data</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Training</div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
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
                    <motion.div key={i} whileHover={{ x: 5 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 hover:border-orange-300 transition-all gap-4">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-orange-600 border border-slate-100 shadow-inner flex-shrink-0">
                          <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 uppercase tracking-tight text-base sm:text-lg truncate">{cls.name}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-orange-600">{cls.trainer_name}</span> 
                            <span className="hidden sm:inline">•</span> 
                            <span>{cls.class_time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </div>
                        <Link to="/member/classes" className="p-2 sm:p-3 rounded-xl bg-slate-900 text-white hover:bg-orange-600 transition-all">
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No scheduled sessions found</p></div>
              )}
            </div>
          </div>

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
                <p className="text-slate-600 text-[11px] leading-relaxed font-bold italic">"{lastAiMessage}"</p>
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

function AttendancePopup({ notif, onClose }: { notif: any, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-8 z-[200] sm:w-80"
    >
      <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-orange-100 relative overflow-hidden group">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <X className="w-3 h-3" />
        </button>
        
        <div className="flex items-center gap-4 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notif.title.includes('Check-in') ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
            {notif.title.includes('Check-in') ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-black leading-none">{notif.title}</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Update</p>
          </div>
        </div>
        
        <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic pr-4">
          "{notif.message}"
        </p>
        
        <div className="absolute bottom-0 left-0 h-1 bg-slate-50 w-full">
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: 10, ease: 'linear' }}
            className={`h-full ${notif.title.includes('Check-in') ? 'bg-green-500' : 'bg-orange-500'}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
