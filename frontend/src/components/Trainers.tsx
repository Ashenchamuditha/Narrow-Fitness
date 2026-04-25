import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Twitter, Linkedin, Phone, X, Award, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Trainer {
  id: number;
  name: string;
  description: string; 
  contact: string;     
  image_url: string;   
}

export default function Trainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/trainers');
        const data = await res.json();
        if (Array.isArray(data)) setTrainers(data);
      } catch (err) {
        console.error('Failed to fetch trainers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainers();
  }, []);

  return (
    <section id="trainers" className="py-24 bg-black text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] mb-3 block"
          >
            Elite Guide
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter"
          >
            The <span className="text-orange-500">Coaches</span>
          </motion.h2>
          <div className="mt-6 w-24 h-1.5 bg-orange-500 mx-auto rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Loading Experts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {trainers.map((trainer, i) => (
              <motion.div
                key={trainer.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                onClick={() => setSelectedTrainer(trainer)}
                className="group relative h-[550px] overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/5 cursor-pointer shadow-2xl transition-all hover:border-orange-500/50"
              >
                {/* Image Component */}
                <img
                  src={trainer.image_url}
                  alt={trainer.name}
                  className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 group-hover:scale-105"
                />

                {/* Dark Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

                {/* Visible Info Area */}
                <div className="absolute bottom-0 left-0 w-full p-8 transition-transform duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Master Instructor</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-orange-500 transition-colors">
                    {trainer.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                    View Full Profile <ChevronRight className="w-3 h-3" />
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* --- TRAINER DETAIL MODAL --- */}
      <AnimatePresence>
        {selectedTrainer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrainer(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-zinc-950 border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] no-scrollbar"
            >
              <button 
                onClick={() => setSelectedTrainer(null)}
                className="absolute top-8 right-8 z-50 p-3 bg-white/5 hover:bg-red-500 text-white rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Side: Large Image */}
                <div className="h-[400px] md:h-full relative">
                  <img src={selectedTrainer.image_url} className="w-full h-full object-cover" alt={selectedTrainer.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                </div>

                {/* Right Side: Content */}
                <div className="p-10 md:p-16 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle2 className="w-6 h-6 text-orange-500" />
                    <span className="text-sm font-black text-orange-500 uppercase tracking-[0.3em]">Elite Verified</span>
                  </div>

                  <h2 className="text-5xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none mb-8">
                    {selectedTrainer.name}
                  </h2>

                  <div className="space-y-6 mb-12">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Athlete Biography</h4>
                    <p className="text-lg text-gray-300 leading-relaxed font-medium italic">
                      "{selectedTrainer.description}"
                    </p>
                  </div>

                  {/* Contact & Social Section */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-5 p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="p-4 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Direct Line</p>
                        <p className="text-xl font-black text-white tracking-widest">{selectedTrainer.contact || 'Inquire at Front Desk'}</p>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <Instagram className="w-6 h-6 text-gray-400 hover:text-orange-500 cursor-pointer transition-all" />
                      <Twitter className="w-6 h-6 text-gray-400 hover:text-orange-500 cursor-pointer transition-all" />
                      <Linkedin className="w-6 h-6 text-gray-400 hover:text-orange-500 cursor-pointer transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Small helper for the Chevron icon used in the card
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={3} 
      stroke="currentColor" 
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}