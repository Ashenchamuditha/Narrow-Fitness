import React, { useState, useEffect } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, 
  Users, Ban, History, PlayCircle, Timer, ChevronRight,
  TrendingUp, Dumbbell, Loader2, Hourglass, ShieldCheck, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MemberClasses() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchClasses(parsedUser.id);
    } else {
      fetchClasses();
    }
  }, []);

  const fetchClasses = async (userId?: number) => {
    try {
      setLoading(true);
      const url = userId ? `/api/member/classes?userId=${userId}` : '/api/classes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (cls: any) => {
    if (!user) return;
    if (cls.is_cancelled) return;
    if (cls.capacity <= 0) {
        alert("This class is currently full.");
        return;
    }

    const confirmJoin = window.confirm(`Request to join "${cls.name}"?`);
    if (!confirmJoin) return;

    try {
      const res = await fetch('/api/member/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: cls.id, userId: user.id })
      });

      if (res.ok) {
        alert("✅ Request Sent! Your status will update once the coach approves.");
        fetchClasses(user.id); 
      } else {
        const err = await res.json();
        alert(err.message || "Failed to join.");
      }
    } catch (err) {
      alert("Network Error.");
    }
  };

  const calculateStatus = (day: string, time: string, isCancelled: boolean) => {
    if (isCancelled) return { label: 'Cancelled', color: 'bg-red-500 text-white border-red-600', icon: Ban, disabled: true, cardStyle: 'opacity-60 grayscale border-red-200' };

    const now = new Date();
    const start = new Date(`${day}T${time}`);
    const end = new Date(start.getTime() + (60 * 60 * 1000));

    if (now > end) return { label: 'Expired', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: History, disabled: true, cardStyle: 'opacity-60 grayscale bg-slate-50' };
    if (now >= start && now <= end) return { label: 'Ongoing', color: 'bg-green-100 text-green-600 border-green-200 animate-pulse', icon: PlayCircle, disabled: true, cardStyle: 'border-green-500 shadow-green-100' };

    const diff = start.getTime() - now.getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    let timeText = d > 0 ? `${d}d ${h}h to start` : `${h}h to start`;

    return { label: timeText, color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Timer, disabled: false, cardStyle: 'border-slate-200 hover:border-orange-400 hover:shadow-2xl shadow-slate-200/60' };
  };

  return (
    <MemberLayout>
      {/* Background set to very light slate to make white boxes pop */}
      <div className="min-h-screen bg-[#f8fafc] -mt-10 pt-10 px-2 sm:px-0 pb-20">
        
        <div className="max-w-7xl mx-auto mb-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Zap className="w-4 h-4 text-orange-600 fill-orange-600" />
                 <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em]">Elite Training</span>
              </div>
              <h1 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">
                Class <span className="text-orange-600">Arena</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm font-black uppercase text-[10px] text-slate-600">
               <TrendingUp className="w-4 h-4 text-green-500" /> System Secure & Live
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Schedule...</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {classes.length > 0 ? (
              classes.map((cls, i) => {
                const sessionStatus = calculateStatus(cls.class_day, cls.class_time, cls.is_cancelled);
                const isCancelled = cls.is_cancelled === true;
                const isPending = !isCancelled && cls.booking_status === 'pending';
                const isConfirmed = !isCancelled && cls.booking_status === 'confirmed';

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={cls.id} 
                    className={`bg-white rounded-[2.5rem] border transition-all duration-500 relative group overflow-hidden shadow-xl ${
                      isConfirmed ? 'border-green-500 ring-4 ring-green-50 shadow-green-200' : 
                      isPending ? 'border-orange-400 shadow-orange-100' : 
                      sessionStatus.cardStyle
                    }`}
                  >
                    {/* Visual Accent Line */}
                    <div className={`absolute top-0 left-0 w-full h-2 ${isCancelled ? 'bg-red-500' : isConfirmed ? 'bg-green-500' : 'bg-orange-500'}`} />

                    {/* Floating Status Badge */}
                    <div className={`absolute top-8 right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border z-10 ${
                      isCancelled ? 'bg-red-600 text-white border-red-700 shadow-lg' :
                      isConfirmed ? 'bg-green-500 text-white border-green-400 shadow-lg' : 
                      isPending ? 'bg-orange-500 text-white border-orange-400 shadow-lg' : 
                      sessionStatus.color
                    }`}>
                      {isCancelled ? <Ban className="w-3.5 h-3.5" /> : 
                       isConfirmed ? <ShieldCheck className="w-3.5 h-3.5" /> : 
                       isPending ? <Hourglass className="w-3.5 h-3.5 animate-spin" /> : 
                       <sessionStatus.icon className="w-3.5 h-3.5" />}
                      
                      {isCancelled ? 'Cancelled' : 
                       isConfirmed ? 'Reserved' : 
                       isPending ? 'Awaiting Approval' : 
                       sessionStatus.label}
                    </div>

                    <div className="p-8 pt-12 relative z-10">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 ${
                        isCancelled ? 'bg-slate-100 text-slate-300' :
                        isConfirmed ? 'bg-green-500 text-white shadow-green-200' : 
                        'bg-slate-900 text-orange-500 group-hover:bg-orange-600 group-hover:text-white'
                      }`}>
                        <Dumbbell className="w-8 h-8" />
                      </div>

                      <h3 className={`text-2xl font-black uppercase italic tracking-tighter mb-1 leading-tight ${isCancelled ? 'line-through text-slate-300' : 'text-slate-900'}`}>
                        {cls.name}
                      </h3>
                      <p className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Directed by Coach {cls.trainer_name || 'Expert'}</p>

                      <div className="space-y-3 mb-10">
                        <div className={`flex items-center gap-4 p-4 rounded-2xl border border-slate-100 transition-all ${isCancelled ? 'bg-slate-50 opacity-50' : 'bg-slate-50/50 group-hover:bg-white'}`}>
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                             <Clock className={`w-5 h-5 ${isConfirmed ? 'text-green-500' : isCancelled ? 'text-slate-300' : 'text-orange-500'}`} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Timing</p>
                            <p className="text-xs font-bold text-slate-700 uppercase">{cls.class_day} @ {cls.class_time}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-4 p-4 rounded-2xl border border-slate-100 transition-all ${isCancelled ? 'bg-slate-50 opacity-50' : 'bg-slate-50/50 group-hover:bg-white'}`}>
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                             <Users className={`w-5 h-5 ${isConfirmed ? 'text-green-500' : isCancelled ? 'text-slate-300' : 'text-orange-500'}`} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Availability</p>
                            <p className="text-xs font-bold text-slate-700 uppercase">{isCancelled ? 'N/A' : (cls.capacity > 0 ? `${cls.capacity} Slots Left` : 'Class Full')}</p>
                          </div>
                        </div>
                      </div>

                      {/* --- ACTION LOGIC --- */}
                      {isCancelled ? (
                        <div className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 border border-slate-200">
                           <Ban className="w-4 h-4" /> Unavailable
                        </div>
                      ) : isConfirmed ? (
                        <div className="w-full py-5 bg-green-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 border border-green-400">
                           <CheckCircle2 className="w-4 h-4" /> Participation Confirmed
                        </div>
                      ) : isPending ? (
                        <div className="w-full py-5 bg-white text-orange-500 border-2 border-orange-500 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-sm">
                           <Hourglass className="w-4 h-4 animate-spin" /> Verifying Request...
                        </div>
                      ) : (
                        <button 
                          disabled={sessionStatus.disabled || cls.capacity <= 0}
                          onClick={() => handleJoinSession(cls)}
                          className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xl transform active:scale-95 ${
                            (sessionStatus.disabled || cls.capacity <= 0)
                            ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed' 
                            : 'bg-slate-900 text-white hover:bg-orange-600 shadow-orange-100'
                          }`}
                        >
                          {cls.capacity <= 0 ? 'Fully Booked' : 'Reserve Spot'}
                          {cls.capacity > 0 && !sessionStatus.disabled && <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    
                    {/* Aesthetic Corner Gradient */}
                    <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full transition-colors duration-500 blur-3xl ${isCancelled ? 'bg-red-100/50' : isConfirmed ? 'bg-green-100/50' : 'bg-orange-100/30'}`} />
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 px-10 shadow-inner">
                <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">Arena Empty</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Check back later for new sessions.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-20 text-center">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Narrow Fitness Elite Hub • Premium Schedule Experience</p>
        </div>
      </div>
    </MemberLayout>
  );
}