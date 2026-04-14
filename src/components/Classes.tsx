import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Users, 
  Zap, 
  X, 
  Lock, 
  Crown, 
  ShieldCheck 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface ClassData {
  id: number;
  name: string;
  trainer_name: string;
  class_time: string;
  class_day: string;
  capacity: number;
  image?: string;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/admin/classes'); 
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
    fetchClasses();
  }, []);

  const handleBookingAttempt = (e: React.MouseEvent, classId: number) => {
    e.preventDefault();
    const storedUser = localStorage.getItem('narrow_fitness_user');
    
    if (!storedUser) {
      setShowAuthModal(true);
    } else {
      navigate(`/member/classes`);
    }
  };

  return (
    <section id="classes" className="py-24 bg-white overflow-hidden relative">
      
      {/* --- AUTH MODAL --- */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-gray-100"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                 <Lock className="w-10 h-10 text-orange-600" />
              </div>

              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">
                Member <span className="text-orange-600">Access</span> Only
              </h3>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed mb-10">
                Create an account to reserve your seat in this session.
              </p>

              <div className="space-y-4 flex flex-col items-center">
                <Link 
                  to="/auth" 
                  className="flex items-center justify-center gap-3 w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-xl shadow-orange-100"
                >
                  <Crown className="w-4 h-4 text-orange-500" /> Join Narrow Fitness
                </Link>
                
                {/* FIXED: Increased contrast and padding for visibility */}
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-2 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-black transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-orange-600 font-black uppercase tracking-[0.4em] text-xs mb-4 block">Our Schedule</motion.span>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">Find Your <span className="text-orange-600">Perfect</span> Class</motion.h2>
          <div className="w-24 h-1.5 bg-orange-500 mx-auto mt-6 rounded-full shadow-[0_4px_10px_rgba(249,115,22,0.3)]"></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {classes.map((cls, index) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} className="group bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:shadow-orange-500/20 transition-all duration-500 border border-slate-100">
                <div className="relative h-52 overflow-hidden bg-gray-100">
                   <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center p-8 relative">
                      <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 -rotate-12" />
                      <div className="text-white font-black italic text-4xl uppercase tracking-tighter z-10 leading-none drop-shadow-lg">{cls.name}</div>
                   </div>
                   <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-xl">{cls.class_time}</div>
                </div>

                <div className="p-8">
                  <div className="flex flex-col mb-6">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">{cls.class_day}</span>
                    <h3 className="text-2xl font-black text-black uppercase italic tracking-tighter">{cls.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100"><User className="w-4 h-4 text-orange-600" /></div>
                      <div className="overflow-hidden"><p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Coach</p><p className="text-[10px] font-black text-black uppercase truncate">{cls.trainer_name || 'Expert'}</p></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100"><Users className="w-4 h-4 text-orange-600" /></div>
                      <div><p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Capacity</p><p className="text-[10px] font-black text-black uppercase">{cls.capacity} Max</p></div>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => handleBookingAttempt(e, cls.id)}
                    className="w-full group/btn flex items-center justify-center gap-3 bg-black text-white hover:bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 transform active:scale-95 shadow-xl shadow-black/10"
                  >
                    <span>Book Session</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}