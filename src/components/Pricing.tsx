import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Zap, Lock, Crown, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface PricingPlan {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string[];
  is_popular: boolean;
}

export default function Pricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- NEW: POPUP STATES ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/admin/pricing');
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch (err) {
        console.error('Error fetching pricing:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // --- NEW: HANDLER FOR JOIN BUTTON ---
  const handleJoinClick = (planName: string) => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    
    if (!storedUser) {
      // User not logged in -> Show the Premium Popup
      setSelectedPlanName(planName);
      setShowAuthModal(true);
    } else {
      // User is logged in -> Go to the payment/membership page
      navigate('/member/payments');
    }
  };

  if (loading) {
    return (
      <section id="pricing" className="py-24 bg-white flex justify-center items-center">
        <div className="animate-pulse text-orange-600 font-black uppercase tracking-widest">
          Loading Membership Plans...
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 bg-white overflow-hidden relative">
      
      {/* --- AUTH MODAL (PREMIUM UI) --- */}
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
                Athlete <span className="text-orange-600">Account</span> Required
              </h3>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-tight leading-relaxed mb-10">
                To activate the <span className="text-black font-black">[{selectedPlanName}]</span> plan, please sign in to your dashboard.
              </p>

              <div className="space-y-4">
                <Link 
                  to="/auth" 
                  className="flex items-center justify-center gap-3 w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-xl shadow-orange-100"
                >
                  <Crown className="w-4 h-4 text-orange-500" /> Create Elite Account
                </Link>
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-black transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <motion.span initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="text-orange-600 font-black uppercase tracking-[0.3em] mb-4 block">Membership Plans</motion.span>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-black leading-tight uppercase italic tracking-tighter mb-6 text-black">Choose Your <span className="text-orange-500">Level</span></motion.h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">Professional fitness packages tailored to your goals. No hidden fees.</p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-10 rounded-[2.5rem] border-2 transition-all duration-500 ${
                plan.is_popular
                  ? 'bg-zinc-900 text-white border-orange-500 shadow-2xl lg:scale-105 z-10' 
                  : 'bg-white text-black border-slate-100 hover:border-orange-500/30 shadow-sm'
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-md">
                  <Star className="w-4 h-4 fill-white" /> Most Popular
                </div>
              )}

              <div className={`mb-8 w-14 h-14 rounded-2xl flex items-center justify-center ${plan.is_popular ? 'bg-orange-500/10' : 'bg-slate-50'}`}>
                <Zap className={`w-7 h-7 ${plan.is_popular ? 'text-orange-500' : 'text-slate-400'}`} />
              </div>

              <div className="mb-8">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 leading-none">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold uppercase text-orange-500">LKR</span>
                  <span className="text-5xl font-black tracking-tighter">{Number(plan.price).toLocaleString()}</span>
                  <span className="text-sm font-bold uppercase tracking-widest text-gray-500">/ {plan.duration}</span>
                </div>
              </div>

              <ul className="space-y-5 mb-10">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.is_popular ? 'bg-orange-500' : 'bg-slate-100'}`}>
                      <Check className={`w-3 h-3 ${plan.is_popular ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <span className={`text-sm font-bold ${plan.is_popular ? 'text-zinc-300' : 'text-slate-600'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* ACTION BUTTON */}
              <button
                onClick={() => handleJoinClick(plan.name)}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all transform active:scale-95 shadow-lg ${
                  plan.is_popular
                    ? 'bg-orange-600 text-white hover:bg-orange-500'
                    : 'bg-black text-white hover:bg-orange-600'
                }`}
              >
                Join {plan.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}