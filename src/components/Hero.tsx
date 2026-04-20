import { motion } from 'framer-motion';
import { ChevronRight, Dumbbell, Users, Trophy, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Hero() {
  const [stats, setStats] = useState({ members: 0, trainers: 0 });

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(res => res.json())
      .then(data => {
        setStats({
          members: data.totalMembers || 0,
          trainers: data.totalTrainers || 0
        });
      })
      .catch(err => console.error("Error fetching live stats:", err));
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black pt-20">
      {/* Background Image with High-Contrast Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920"
          alt="Gym Background"
          className="w-full h-full object-cover opacity-50 md:opacity-60"
        />
        {/* Gradients for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          
          {/* Elite Tag */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/20 border border-orange-600/30 rounded-full mb-8"
          >
            <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
            <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Narrow Fitness Elite
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl sm:text-6xl md:text-8xl font-black text-white leading-[0.95] uppercase italic tracking-tighter mb-8"
          >
            Forge Your <br />
            <span className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Legend</span>
          </motion.h1>
          
          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-gray-400 mb-10 max-w-lg font-medium leading-relaxed"
          >
            Sri Lanka's premier destination for strength and personal transformation. Join an elite community built on results.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-20 md:mb-0"
          >
            <Link to="/auth" className="w-full sm:w-auto">
              <button className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-orange-500 hover:text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all transform active:scale-95 shadow-2xl">
                Join The Elite <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            
            <a href="#pricing" className="w-full sm:w-auto">
              <button className="w-full flex items-center justify-center gap-3 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/10">
                View Memberships
              </button>
            </a>
          </motion.div>
        </div>
      </div>

      {/* --- ENHANCED LIVE STATS OVERLAY --- */}
      <div className="relative md:absolute bottom-0 md:bottom-10 left-0 w-full z-20 pb-12 md:pb-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 border-t border-white/10 pt-10">
            {[
              { label: 'Active Athletes', value: stats.members, icon: Users },
              { label: 'Pro Trainers', value: stats.trainers, icon: Star },
              { label: 'Elite Gear', value: 'Modern', icon: Dumbbell },
              { label: 'Status', value: 'Open', icon: Trophy },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-orange-500/50 transition-colors">
                   <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-black text-white leading-none">
                    {stat.value || '0'}
                  </div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}