import React, { useState } from 'react';
import { identifyWallQRUser, startPayment } from '../services/paymentService';
import { Bot, CreditCard, Mail, User, ShieldCheck, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function WallPayment() {
  const [email, setEmail] = useState('');
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await identifyWallQRUser(email);
      setIdentifiedUser(res.data);
      
      // Fetch plans
      const plansRes = await fetch('/api/admin/pricing');
      const plansData = await plansRes.json();
      setPlans(plansData);
    } catch (err: any) {
      toast.error('Email not found. Please register first or use the correct email.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = (pkg: any) => {
    startPayment(identifiedUser.id, pkg, identifiedUser);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center rotate-12">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Narrow Fitness</h1>
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Instant Wall Payment</p>
          </div>
        </div>

        {!identifiedUser ? (
          <form onSubmit={handleIdentify} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Identify Yourself</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  placeholder="ENTER REGISTERED EMAIL"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold tracking-widest uppercase focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-500 hover:text-white transition-all shadow-xl shadow-white/5 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Find My Profile'}
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Welcome Back</p>
                  <p className="text-xl font-black uppercase tracking-tighter">{identifiedUser.name}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Select Renewal Package</p>
              {plans.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePay(pkg)}
                  className="w-full group bg-black border border-white/10 p-6 rounded-[2rem] hover:border-orange-500 transition-all text-left flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter group-hover:text-orange-500 transition-colors">{pkg.name}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{pkg.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-white italic">LKR {pkg.price}</p>
                    <div className="flex items-center gap-1 justify-end text-[8px] font-bold text-orange-500 uppercase tracking-widest">
                      <CreditCard className="w-3 h-3" />
                      Pay Online
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIdentifiedUser(null)}
              className="w-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors py-2"
            >
              Not {identifiedUser.name.split(' ')[0]}? Click here
            </button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 opacity-20">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Secure Narrow Encryption</span>
        </div>
      </motion.div>
    </div>
  );
}
