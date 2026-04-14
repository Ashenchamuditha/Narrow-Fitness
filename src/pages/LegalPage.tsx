import React, { useEffect } from 'react';
import LandingLayout from '../components/LandingLayout';
import { ShieldCheck, FileText, Fingerprint, ArrowLeft, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface LegalPageProps {
  type: 'privacy' | 'terms' | 'cookies';
}

export default function LegalPage({ type }: LegalPageProps) {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, [type]);

  const content = {
    privacy: {
      title: "Privacy Policy",
      subtitle: "How we protect your athlete data",
      icon: <ShieldCheck className="w-12 h-12 text-orange-600" />,
      text: "At Narrow Fitness, your privacy is our priority. We collect health metrics such as weight, height, and fitness goals solely to power our AI Assistant and provide personalized coaching. Your chat history is stored securely to maintain context in your training journey."
    },
    terms: {
      title: "Terms of Service",
      subtitle: "Gym rules and digital agreement",
      icon: <FileText className="w-12 h-12 text-orange-600" />,
      text: "By accessing the Narrow Fitness facility and digital platform, you agree to comply with all safety protocols. AI coaching advice is intended for informational guidance only and does not replace medical consultation."
    },
    cookies: {
      title: "Cookie Policy",
      subtitle: "Understanding our digital footprint",
      icon: <Fingerprint className="w-12 h-12 text-orange-600" />,
      text: "We use essential cookies and local browser storage to manage your secure session tokens (JWT). These technical tools allow you to stay logged in while navigating between your Dashboard and the AI Trainer."
    }
  };

  const active = content[type];

  return (
    <LandingLayout>
      {/* 
          NAVBAR BACKGROUND FIX:
          This div creates a solid black bar at the top of the screen 
          specifically for this page, so the transparent navbar looks solid.
      */}
      <div className="fixed top-0 left-0 w-full h-20 bg-black z-40 border-b border-white/5" />

      <div className="pt-32 pb-24 bg-slate-50 min-h-screen relative overflow-hidden">
        
        {/* Decorative Branded Gradient */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          
          {/* Navigation Back */}
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors mb-12 group">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Arena
          </Link>

          {/* Header Section */}
          <div className="mb-12">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-5"
            >
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex items-center justify-center border border-slate-100">
                {active.icon}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900">
                  {active.title}
                </h1>
                <p className="text-orange-600 font-bold uppercase text-xs tracking-[0.2em] mt-1">
                  {active.subtitle}
                </p>
              </div>
            </motion.div>
          </div>
          
          {/* Main Content Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 md:p-16 border border-white"
          >
            <div className="prose prose-slate max-w-none font-sans">
              <p className="text-slate-600 leading-relaxed text-lg font-medium italic border-l-4 border-orange-500 pl-6 mb-12">
                "{active.text}"
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16 border-t border-slate-50 pt-12">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-orange-500" /> 1. Data Governance
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    All biometric data provided during onboarding is used solely for the optimization of your training intensity and nutritional requirements.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-orange-500" /> 2. Security Protocols
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    We implement high-level database security. Passwords are never stored in plain text; we use multi-round salt hashing (Bcrypt) to ensure your account integrity.
                  </p>
                </div>
              </div>

              <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Last Updated: April 2026</p>
                 <div className="flex gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <div className="w-2 h-2 bg-slate-200 rounded-full" />
                    <div className="w-2 h-2 bg-slate-200 rounded-full" />
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}