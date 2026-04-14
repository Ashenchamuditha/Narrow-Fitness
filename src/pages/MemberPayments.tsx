import React, { useState, useEffect } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  ShieldCheck, Zap, Star, Key, 
  Loader2, AlertCircle, CheckCircle2, ChevronRight,
  Trash2, ArrowUpCircle, Info, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingPlan {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string[];
  is_popular: boolean;
}

export default function MemberPayments() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activationCode, setActivationCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user data from localStorage and fetch plans on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // CORRECTED LOG: Using the exact database names
      console.log("Current User Subscription Data:", {
        status: parsedUser.subscription_status, // Use the correct key
        package_id: parsedUser.package_id,
        package_name: parsedUser.package_name
      });
    }
    fetchPricingPlans();
  }, []);

  const fetchPricingPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pricing');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        
        // If a plan was already recommended/popular, set it as default selection
        const popular = data.find((p: PricingPlan) => p.is_popular);
        if (popular) setSelectedPlan(popular);
      }
    } catch (err) {
      console.error("Error fetching pricing:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async () => {
    if (!activationCode) {
      alert("Please enter the activation code.");
      return;
    }
    setIsActivating(true);
    try {
      const res = await fetch('/api/member/activate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          code: activationCode,
          planId: selectedPlan?.id
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(`🎉 Success! Your ${selectedPlan?.name} membership is now active.`);
        
        // --- CRITICAL FIX: Ensure all keys are updated in LocalStorage ---
        const updatedUserData = { 
          ...user, 
          subscription_status: 'active', 
          package_id: selectedPlan?.id,
          package_name: selectedPlan?.name 
        };
        localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUserData));
        
        // Use hard redirect to force all components to read fresh storage
        window.location.href = '/member/payments'; 
      } else {
        alert(data.message || "Invalid activation code.");
      }
    } catch (err) {
      alert("Connection failed. Please check if server is running.");
    } finally {
      setIsActivating(false);
    }
  };

 // Inside MemberPayments.tsx

const handleCancelSubscription = async () => {
  if (window.confirm("Are you sure you want to cancel your membership? Access to premium features will be revoked immediately.")) {
    
    try {
      const res = await fetch('/api/member/cancel-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        alert("✅ Subscription Cancelled. A confirmation email has been sent.");
        
        // Update local memory
        const updatedUser = { ...user, subscription_status: 'none', package_id: null, package_name: null };
        localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
        
        window.location.reload(); // Refresh UI
      }
    } catch (err) {
      alert("Error processing cancellation.");
    }
  }
};
  // --- REFINED LOGIC: Prevent "Vanishing" by using fallback values ---
  const isActive = user?.subscription_status === 'active';
  // Try to find plan in live list, fallback to name stored in user object
  const displayPackageName = plans.find(p => p.id === user?.package_id)?.name || user?.package_name || "None Selected";

  return (
    <MemberLayout>
      <div className="min-h-screen bg-slate-50/50 -mt-10 pt-10 px-2 sm:px-0 pb-20">
        
        {/* Header Section */}
        <div className="max-w-5xl mx-auto mb-12 px-2">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter"
          >
            Memberships <span className="text-orange-600">& Billing</span>
          </motion.h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            Securely manage your training access tiers
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-10">
          
          {/* --- 1. DYNAMIC CURRENT PLAN SECTION (Fixes the vanish issue) --- */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-2">
            <div className={`rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border ${isActive ? 'bg-slate-900 border-orange-500/30' : 'bg-white border-slate-200'}`}>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${isActive ? 'bg-orange-600 shadow-orange-600/40' : 'bg-slate-100'}`}>
                    {isActive ? <ShieldCheck className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-slate-300" />}
                  </div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                      {isActive ? 'Active Membership' : 'Subscription Status'}
                    </div>
                    {/* Display logic updated to prevent empty text while loading */}
                    <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {isActive ? displayPackageName : "None Selected"}
                    </h2>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2 ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isActive ? (
                        <><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Full Access Active</>
                      ) : (
                        "No premium features unlocked"
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all transform active:scale-95 shadow-xl ${isActive ? 'bg-white text-black hover:bg-orange-600 hover:text-white' : 'bg-black text-white hover:bg-orange-600'}`}
                  >
                    <ArrowUpCircle className="w-4 h-4" /> {isActive ? 'Upgrade Package' : 'Explore Plans'}
                  </button>
                  {isActive && (
                    <button 
                      onClick={handleCancelSubscription}
                      className="flex-1 flex items-center justify-center gap-2 bg-white/5 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all border border-white/10"
                    >
                      <Trash2 className="w-4 h-4" /> Cancel Plan
                    </button>
                  )}
                </div>
              </div>
              {isActive && <div className="absolute -top-24 -right-24 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]" />}
            </div>
          </motion.section>

          {/* --- 2. AVAILABLE PACKAGES SECTION --- */}
          <section id="available-plans">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
               </div>
               <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                 {isActive ? 'Switch Membership Level' : 'Available Packages'}
               </h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-24 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500" />
                <p className="text-xs font-black uppercase tracking-widest">Synchronizing Tiers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                {plans.map((plan) => (
                  <motion.div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    whileHover={{ y: -8 }}
                    className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${
                      selectedPlan?.id === plan.id 
                        ? 'border-orange-500 bg-white shadow-2xl scale-[1.02]' 
                        : 'border-slate-200 bg-white hover:border-orange-200 shadow-sm'
                    }`}
                  >
                    {plan.is_popular && (
                      <div className="absolute top-0 right-0 bg-orange-600 text-white px-5 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest z-10">Recommended</div>
                    )}
                    {user?.package_id === plan.id && (
                      <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1.5 rounded-br-2xl text-[8px] font-black uppercase z-10">Current</div>
                    )}
                    
                    <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mb-8">
                       <span className="text-xs font-bold text-orange-600 uppercase">LKR</span>
                       <span className="text-4xl font-black text-slate-900 tracking-tighter">{Number(plan.price).toLocaleString()}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ {plan.duration}</span>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600 leading-tight">
                          <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" /> {feature}
                        </li>
                      ))}
                    </ul>

                    <div className={`mt-auto w-full py-4 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center ${selectedPlan?.id === plan.id ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'border-slate-100 text-slate-400'}`}>
                      {selectedPlan?.id === plan.id ? 'Plan Selected' : 'Select Plan'}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* --- 3. ACTIVATION SECTION (Only shows if NOT activating your current plan) --- */}
          <AnimatePresence>
            {selectedPlan && user?.package_id !== selectedPlan.id && (
              <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative px-2">
                <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl overflow-hidden border border-white/5">
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-orange-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-orange-600/30"><Key className="w-10 h-10 text-white" /></div>
                        <div>
                          <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Unlock Full Access</h3>
                          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Verify payment for: <span className="text-orange-500 underline underline-offset-4">{selectedPlan.name}</span></p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 w-full md:w-[400px]">
                        <input type="text" placeholder="PASTE ACTIVATION CODE" value={activationCode} onChange={(e) => setActivationCode(e.target.value.toUpperCase())} className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-5 px-6 focus:border-orange-500 focus:ring-0 font-black tracking-[0.4em] text-white placeholder:text-slate-700 uppercase transition-all" />
                        <button onClick={handleActivation} disabled={isActivating} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
                          {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Activate Elite Tier</>}
                        </button>
                      </div>
                    </div>
                    <div className="mt-10 flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 w-fit">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Activation keys are generated at the counter after manual payment verification.</p>
                    </div>
                  </div>
                  <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px]" />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MemberLayout>
  );
}