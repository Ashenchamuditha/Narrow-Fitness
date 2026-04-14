import { motion } from 'framer-motion';
import { Instagram, Twitter, Linkedin, Phone } from 'lucide-react';
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
    /* Changed bg-black to bg-white */
    <section id="trainers" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section - Now on White Background */}
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-orange-600 font-black uppercase tracking-[0.3em] text-xs mb-3 block"
          >
            Expert Coaching
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            /* Changed text to slate-900 for readability on white */
            className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900"
          >
            Meet The <span className="text-orange-600">Elite</span>
          </motion.h2>
          <div className="mt-4 w-20 h-1.5 bg-orange-600 mx-auto rounded-full" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            {/* Adjusted loader colors for white background */}
            <div className="w-10 h-10 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {trainers.map((trainer, i) => (
              <motion.div
                key={trainer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative h-[500px] overflow-hidden rounded-[2rem] bg-zinc-900 shadow-2xl border border-slate-100"
              >
                {/* Background Image */}
                <img
                  src={trainer.image_url}
                  alt={trainer.name}
                  className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0"
                />

                {/* Subtle Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* HOVER PANEL */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 translate-y-[calc(100%-85px)] group-hover:translate-y-0 transition-transform duration-500 ease-out bg-black/70 backdrop-blur-xl border-t border-white/10 p-6 flex flex-col">
                  
                  <div className="mb-4">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white group-hover:text-orange-500 transition-colors">
                      {trainer.name}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/80">Certified Instructor</p>
                  </div>

                  <div className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-4 mb-6 font-medium">
                      {trainer.description}
                    </p>

                    <div className="flex items-center gap-3 text-white mb-6">
                      <div className="p-2 bg-orange-600 rounded-lg">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold tracking-widest">{trainer.contact || 'PRIVATE'}</span>
                    </div>

                    <div className="flex gap-4 border-t border-white/10 pt-4">
                      <Instagram className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                      <Twitter className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                      <Linkedin className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}