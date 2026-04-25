import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Info, Camera } from 'lucide-react';

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);
  const [selectedImg, setSelectedImg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch images from the public API endpoint
  useEffect(() => {
    fetch('/api/public/gallery')
      .then((res) => res.json())
      .then((data) => {
        setImages(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gallery Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <section id="gallery" className="py-24 bg-black overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            className="text-orange-500 font-black uppercase tracking-[0.3em] mb-4 block text-xs"
          >
            Elite Environment
          </motion.span>
          <h2 className="text-5xl md:text-7xl font-black leading-tight uppercase italic tracking-tighter mb-6 text-white">
            Inside The <span className="text-orange-500">Arena</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Explore our professional training grounds and high-performance equipment.
          </p>
        </div>

        {/* --- DYNAMIC GRID --- */}
        {loading ? (
          <div className="flex justify-center py-20">
             <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                onClick={() => setSelectedImg(img)}
                className="group relative aspect-square overflow-hidden rounded-[2rem] cursor-pointer border border-white/5 bg-zinc-900"
              >
                <img
                  src={img.image_url}
                  alt={img.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100"
                />
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end">
                   <h3 className="text-white font-black uppercase italic tracking-tighter text-2xl leading-none mb-2">{img.title}</h3>
                   <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     <Maximize2 className="w-3 h-3" /> View Details
                   </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Fallback if no images are uploaded */
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-[3rem]">
             <Camera className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Awaiting Elite Content Updates...</p>
          </div>
        )}
      </div>

      {/* --- MAXIMIZED POPUP MODAL --- */}
      <AnimatePresence>
        {selectedImg && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-12">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedImg(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />

            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="relative bg-zinc-900 rounded-[3rem] overflow-hidden max-w-6xl w-full flex flex-col lg:flex-row shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setSelectedImg(null)}
                className="absolute top-6 right-6 z-10 p-3 bg-black/50 text-white hover:bg-orange-600 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Left: Image Side */}
              <div className="lg:w-2/3 bg-black flex items-center justify-center">
                <img 
                  src={selectedImg.image_url} 
                  className="max-h-[70vh] lg:max-h-[85vh] w-full object-contain" 
                  alt={selectedImg.title} 
                />
              </div>

              {/* Right: Text Side */}
              <div className="lg:w-1/3 p-10 lg:p-14 flex flex-col justify-between">
                <div>
                  <span className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] block mb-4">Spotlight Details</span>
                  <h3 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter mb-6 leading-none">
                    {selectedImg.title}
                  </h3>
                  <div className="h-1.5 w-16 bg-orange-600 mb-8 rounded-full" />
                  
                  <div className="prose prose-invert">
                    <p className="text-zinc-400 text-lg leading-relaxed font-medium">
                      {selectedImg.description}
                    </p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-4">
                   <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center border border-orange-600/20">
                      <Info className="text-orange-500 w-6 h-6" />
                   </div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-relaxed">
                     Narrow Fitness <br/> Official Photography
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-orange-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
    </section>
  );
}