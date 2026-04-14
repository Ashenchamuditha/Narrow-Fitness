import { motion } from 'framer-motion';
import { ChevronRight, Dumbbell, Users, Trophy, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Hero() {
  const [stats, setStats] = useState({ members: 0, trainers: 0 });

  // --- 1. SCROLL TO TOP ON REFRESH LOGIC ---
  useEffect(() => {
    // This stops the browser from automatically jumping to the last scroll position
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Force the page to scroll to the very top (0,0) on load/refresh
    window.scrollTo(0, 0);

    // Optional: Clear the #hash from the URL so it doesn't stay there after refresh
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // --- 2. FETCH LIVE STATS FROM DB ---
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
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920"
          alt="Gym Background"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left w-full">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <span className="inline-block px-4 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6 rounded-sm">
            Narrow Fitness Elite
          </span>
          <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] uppercase italic tracking-tighter mb-8">
            Forge Your <span className="text-orange-500">Legend</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl font-medium leading-relaxed">
            The ultimate destination for strength, discipline, and personal transformation. 
            Join a professional community built on performance and elite results.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <button className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-orange-500 hover:text-white px-10 py-5 rounded-full font-black uppercase tracking-widest transition-all transform hover:scale-105 shadow-xl shadow-white/5">
                Join Now <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
            
            {/* Scroll Link to Pricing */}
            <a href="#pricing" className="w-full sm:w-auto">
              <button className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 px-10 py-5 rounded-full font-black uppercase tracking-widest transition-all border border-white/10">
                Explore Plans
              </button>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Live Stats Overlay */}
      <div className="absolute bottom-10 left-0 w-full z-10 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-8 border-t border-white/20 pt-10">
            {[
              { label: 'Active Athletes', value: stats.members, icon: Users },
              { label: 'Pro Trainers', value: stats.trainers, icon: Star },
              { label: 'Elite Gear', value: 'Modern', icon: Dumbbell },
              { label: 'Status', value: 'Open', icon: Trophy },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                   <stat.icon className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white leading-none">{stat.value}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}