import React, { useState, useEffect } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  ShieldCheck, Zap, Star, Key, 
  Loader2, AlertCircle, CheckCircle2, ChevronRight,
  Trash2, ArrowUpCircle, Info, XCircle, CreditCard, History, Download, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../lib/toastUtils';
import { startPayment } from '../services/paymentService';

interface PricingPlan {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string[];
  is_popular: boolean;
}

interface PaymentRecord {
  id: number;
  package_name: string;
  amount_paid: string;
  balance_due: string;
  payment_method: string;
  status: string;
  payhere_payment_id: string;
  created_at: string;
}

export default function MemberPayments() {
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activationCode, setActivationCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'completed' || params.get('status') === 'success') {
      setShowSuccessPopup(true);
      // Clean up URL to prevent popup on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchMembership(parsedUser.id);
      fetchHistory(parsedUser.id);
    }
    fetchPricingPlans();
  }, []);

  // Auto-select user's current plan once plans and user/membership are loaded
  useEffect(() => {
    if (plans.length > 0) {
      // Prioritize live membership data, fallback to user object
      const currentPackageId = membership?.package_id || user?.package_id;
      
      if (currentPackageId) {
        const currentPlan = plans.find(p => p.id === Number(currentPackageId));
        if (currentPlan) {
          setSelectedPlan(currentPlan);
        } else {
          // Default to popular if current not found in list
          const popular = plans.find((p: PricingPlan) => p.is_popular);
          if (popular) setSelectedPlan(popular);
        }
      } else {
        // Default to popular if no package registered
        const popular = plans.find((p: PricingPlan) => p.is_popular);
        if (popular) setSelectedPlan(popular);
      }
    }
  }, [plans, membership, user]);

  const fetchMembership = async (userId: number) => {
    try {
      const res = await fetch(`/api/member/membership/${userId}`);
      const data = await res.json();
      setMembership(data);
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async (userId: number) => {
    try {
      const res = await fetch(`/api/member/payments/${userId}`);
      const data = await res.json();
      setHistory(data);
      if (data.length > 0) setLastPaymentId(data[0].id);
    } catch (e) { console.error(e); }
  };

  const fetchPricingPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pricing');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        const popular = data.find((p: PricingPlan) => p.is_popular);
        if (popular) setSelectedPlan(popular);
      }
    } catch (err) {
      console.error("Error fetching pricing:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = () => {
    const planToPay = selectedPlan;
    if (!planToPay || !user) {
      toast.error("Please select a plan first.");
      return;
    }
    startPayment(user.id, planToPay, user);
  };

  const handleActivation = async () => {
    if (!activationCode) {
      toast.error("Please enter the activation code.");
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
        toast.success("Success! Your membership is now active.");
        window.location.reload();
      } else {
        toast.error(data.message || "Invalid activation code.");
      }
    } catch (err) {
      toast.error("Connection failed.");
    } finally {
      setIsActivating(false);
    }
  };

  const isActive = user?.subscription_status === 'active' || membership?.status === 'active';
  const displayPackageName = plans.find(p => p.id === (membership?.package_id || user?.package_id))?.name || user?.package_name || "None Selected";

  return (
    <MemberLayout>
      <AnimatePresence>
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl border-2 border-orange-500/10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-600" />
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-2">Payment Confirmed</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Elite Access Synchronized Successfully</p>
              
              <div className="space-y-3">
                {lastPaymentId && (
                  <button 
                    onClick={() => {
                      window.open(`/api/payments/receipt/${lastPaymentId}`, '_blank');
                      window.location.href = '/member/payments';
                    }}
                    className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4" /> Download Digital Receipt
                  </button>
                )}
                <button 
                  onClick={() => { setShowSuccessPopup(false); window.location.href = '/member/payments'; }}
                  className="w-full py-4 bg-slate-50 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[9px] border border-slate-100 hover:bg-slate-100 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50/50 -mt-10 pt-10 px-2 sm:px-0 pb-20">
        <div className="max-w-5xl mx-auto mb-12 px-2 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter"
            >
              Finance <span className="text-orange-600">& Access</span>
            </motion.h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
              Manage your premium tier and billing history
            </p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-black text-white' : 'text-slate-400 hover:text-black'}`}
            >
              Memberships
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-black text-white' : 'text-slate-400 hover:text-black'}`}
            >
              Payment History
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-10">
          {activeTab === 'plans' ? (
            <>
              {/* Current Plan Section */}
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
                        <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {displayPackageName}
                        </h2>
                        {membership && (
                          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                             <div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Package Price</div>
                               <div className="text-lg font-black text-white italic">LKR {Number(membership.package_price || 0).toLocaleString()}</div>
                             </div>
                             <div>
                               <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${Number(membership.balance_due) < 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                 {Number(membership.balance_due) < 0 ? 'Credit Balance' : 'Outstanding Balance'}
                               </div>
                               <div className={`text-lg font-black italic ${Number(membership.balance_due) < 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                 LKR {Math.abs(Number(membership.balance_due || 0)).toLocaleString()}
                               </div>
                             </div>
                             <div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Next Payment Est.</div>
                               <div className="text-lg font-black text-white italic">
                                 LKR {Math.max(0, (Number(membership.package_price || 0) + Number(membership.balance_due || 0))).toLocaleString()}
                               </div>
                             </div>
                             <div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Expiry Protocol</div>
                               <div className="text-lg font-black text-white italic">{new Date(membership.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-orange-600/20"
                    >
                      Renew or Upgrade
                    </button>
                  </div>
                </div>
              </motion.section>

              {/* Available Plans */}
              <section id="available-plans">
                <div className="flex items-center gap-3 mb-8 px-2">
                   <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Choose Your Tier</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                  {plans.map((plan) => (
                    <motion.div 
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      whileHover={{ y: -8 }}
                      className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${
                        selectedPlan?.id === plan.id ? 'border-orange-500 bg-white shadow-2xl' : 'border-slate-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      {plan.is_popular && <div className="absolute top-0 right-0 bg-orange-600 text-white px-5 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest">Popular</div>}
                      <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{plan.name}</h4>
                      <div className="text-3xl font-black text-slate-900 mb-8">LKR {Number(plan.price).toLocaleString()}<span className="text-[10px] text-slate-400"> / {plan.duration}</span></div>
                      
                      <ul className="space-y-4 mb-8 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600"><CheckCircle2 className="w-4 h-4 text-orange-500" /> {f}</li>
                        ))}
                      </ul>

                      <div className="space-y-3 mt-auto pt-6 border-t border-slate-50">
                        <button 
                          onClick={(e) => { e.stopPropagation(); startPayment(user.id, plan, user); }}
                          className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" /> Pay Online
                        </button>
                        <div className={`w-full py-3 rounded-xl border-2 font-black uppercase tracking-widest text-[8px] text-center ${selectedPlan?.id === plan.id ? 'bg-orange-50 border-orange-200 text-orange-600' : 'border-slate-50 text-slate-300'}`}>
                          {selectedPlan?.id === plan.id ? 'Plan Selected' : 'Select for Code Activation'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Action Section */}
              <AnimatePresence>
                {selectedPlan && (
                  <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative px-2">
                    <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10">
                       <div className="flex items-center gap-6 flex-1">
                          <div className="w-20 h-20 bg-orange-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-orange-600/30 shrink-0"><Key className="w-10 h-10 text-white" /></div>
                          <div>
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Manual Activation</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                              Selected: <span className="text-orange-500 underline">{selectedPlan.name}</span> <br/>
                              <span className="text-white/40 block mt-2 italic">Tip: If you paid cash to your coach, they will provide a unique 12-digit activation code. Enter it here to manually synchronize your elite status.</span>
                            </p>
                          </div>
                       </div>
                       
                       <div className="flex flex-col gap-4 w-full md:w-[400px]">
                          <div className="relative">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Unique Activation Key</label>
                            <input 
                              type="text" 
                              placeholder="NF-XXXX-XXXX" 
                              value={activationCode} 
                              onChange={(e) => setActivationCode(e.target.value.toUpperCase())} 
                              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-5 px-6 focus:border-orange-500 font-black tracking-widest text-white uppercase outline-none transition-all placeholder:text-white/10" 
                            />
                          </div>
                          <button 
                            onClick={handleActivation} 
                            disabled={isActivating} 
                            className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-white hover:text-black shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2"
                          >
                            {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & Sync Package <ChevronRight className="w-4 h-4"/></>}
                          </button>
                          <p className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            Need help? Contact your head coach directly.
                          </p>
                       </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* History Section */
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref ID</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Package</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.length > 0 ? history.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-6 text-[10px] font-black text-slate-900 uppercase">
                            #{pay.payhere_payment_id || `PAY-${pay.id}`}
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-[10px] font-black text-slate-900 uppercase">
                              {new Date(pay.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                              {new Date(pay.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase">{pay.package_name}</td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-black text-slate-900">LKR {pay.amount_paid}</div>
                            {parseFloat(pay.balance_due) > 0 && <div className="text-[9px] font-bold text-red-500 uppercase">Due: LKR {pay.balance_due}</div>}
                          </td>
                          <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">{pay.payment_method}</td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${pay.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <a href={`/api/payments/receipt/${pay.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-700">
                              <Download className="w-3 h-3" /> PDF
                            </a>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-xs">No transactions recorded yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
