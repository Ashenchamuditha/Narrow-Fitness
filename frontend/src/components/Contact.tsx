import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Phone, MapPin, Send, Loader2, 
  ShieldCheck, CheckCircle2, X, ArrowLeft 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Contact() {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    subject: 'Membership Inquiry',
    message: '',
    otp: ''
  });

  // STEP 1: Request Verification Code
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/public/contact/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      const data = await res.json();
      if (res.ok) {
        setStep('otp');
        toast.success("Verification code sent to your email.");
      } else {
        toast.error(data.message || "Failed to send code.");
      }
    } catch (err) {
      toast.error("Failed to connect to server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP and Save Message to Database
  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/public/contact/verify-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success("Message Verified & Sent! Refreshing page...");
        
        // Wait 2 seconds so the user can see the success message, then refresh
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } else {
        toast.error(data.message || "Verification failed.");
        setLoading(false); // Only stop loading if it failed
      }
    } catch (err) {
      toast.error("Verification failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* --- LEFT SIDE: CONTACT INFO --- */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="text-orange-600 font-black uppercase tracking-widest mb-4 block">Get In Touch</span>
            <h2 className="text-4xl md:text-5xl font-black text-black leading-tight uppercase italic tracking-tighter mb-8">
              Start Your <span className="text-orange-500">Elite</span> Journey
            </h2>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl">
              Our experts are ready to help you optimize your training. Send us a verified message and we'll get back to you within 24 hours.
            </p>

            <div className="space-y-8">
              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 transition-all">
                  <Phone className="w-6 h-6 text-orange-600 group-hover:text-white transition-all" />
                </div>
                <div>
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Live Support</div>
                  <div className="text-xl font-bold text-black">+94 11 234 5678</div>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 transition-all">
                  <Mail className="w-6 h-6 text-orange-600 group-hover:text-white transition-all" />
                </div>
                <div>
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Official Email</div>
                  <div className="text-xl font-bold text-black">support@narrowfitness.lk</div>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 transition-all">
                  <MapPin className="w-6 h-6 text-orange-600 group-hover:text-white transition-all" />
                </div>
                <div>
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">We are Here</div>
                  <div className="text-xl font-bold text-black">182/1/D Ganemulla Rd ,
Sooriyagama,
Kadawatha. Sri Lanka</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- RIGHT SIDE: DYNAMIC SECURE FORM --- */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-gray-50 p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-2xl relative overflow-hidden"
          >
            {step === 'form' ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500 transition-all font-bold"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500 transition-all font-bold"
                      placeholder="name@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Inquiry Subject</label>
                  <select 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option>Membership Inquiry</option>
                    <option>Personal Training</option>
                    <option>Class Booking</option>
                    <option>Supplements/Diet</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 h-32 focus:outline-none focus:border-orange-500 transition-all resize-none font-medium"
                    placeholder="Tell us about your fitness goals..."
                  />
                </div>

                <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full flex items-center justify-center gap-3 bg-black text-white hover:bg-orange-600 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all transform active:scale-95 disabled:opacity-50 shadow-xl shadow-black/10"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><ShieldCheck className="w-5 h-5 text-orange-500" /> Verify Email & Send</>}
                </button>
              </form>
            ) : (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleVerifyAndSubmit} 
                className="space-y-8 text-center py-6"
              >
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Mail className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-black uppercase italic tracking-tighter">Check Your Inbox</h3>
                  <p className="text-gray-500 text-sm mt-2">
                    We sent a 6-digit code to <br/>
                    <span className="font-black text-slate-900 border-b-2 border-orange-500/30">{formData.email}</span>
                  </p>
                </div>
                
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  className="w-full bg-white border-2 border-orange-500 rounded-3xl px-4 py-5 text-center text-4xl font-black tracking-[0.5em] focus:outline-none shadow-inner"
                  placeholder="000000"
                />

                <div className="space-y-4">
                  <button 
                    disabled={loading}
                    type="submit" 
                    className="w-full flex items-center justify-center gap-3 bg-orange-600 text-white hover:bg-black px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-orange-200"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify & Submit Now"}
                  </button>

                  <button 
                    type="button" 
                    disabled={loading}
                    onClick={() => setStep('form')}
                    className="flex items-center justify-center gap-2 mx-auto text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change Details
                  </button>
                </div>
              </motion.form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
