import React, { useState, useEffect, useRef } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  ShieldCheck, Zap, Star, Key, 
  Loader2, AlertCircle, CheckCircle2, ChevronRight,
  Trash2, ArrowUpCircle, Info, XCircle, CreditCard, History, Download, Clock,
  Scan, QrCode, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../lib/toastUtils';
import { startPayment } from '../services/paymentService';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

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

  // QR Scan State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

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

  // QR Scanning Logic
  const handleQrPayment = async (scannedResult: string) => {
    if (isScanning) return;
    setIsScanning(true);
    
    try {
      // Expected QR format: NF_PLAN_ID or just ID
      const planIdStr = scannedResult.replace('NF_PLAN_', '');
      const planId = parseInt(planIdStr);
      
      if (isNaN(planId)) {
        toast.error("Invalid Payment QR Code");
        setIsScanning(false);
        return;
      }

      const planToPay = plans.find(p => p.id === planId);
      if (!planToPay) {
        toast.error("Package not found in system.");
        setIsScanning(false);
        return;
      }

      toast.success(`Package Found: ${planToPay.name}`);
      stopScanner();
      setIsScanModalOpen(false);
      setIsScanning(false);
      
      // Small delay for better UX before redirecting
      setTimeout(() => {
        startPayment(user.id, planToPay, user);
      }, 500);

    } catch (err) {
      console.error("QR Payment Error:", err);
      toast.error("Failed to process QR code.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  useEffect(() => {
    if (isScanModalOpen) {
      setCameraError(null);
      const startCamera = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const html5QrCode = new Html5Qrcode("payment-qr-reader");
          scannerRef.current = html5QrCode;

          const config = { 
            fps: 15, 
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
          };

          await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
              if (!isScanning) {
                html5QrCode.stop();
                handleQrPayment(decodedText);
              }
            },
            () => {} 
          );
        } catch (err: any) {
          console.error("Camera Error:", err);
          setCameraError("Camera access denied or not found.");
        }
      };
      startCamera();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [isScanModalOpen]);

  const isActive = user?.subscription_status === 'active' || membership?.status === 'active';
  const displayPackageName = plans.find(p => p.id === (membership?.package_id || user?.package_id))?.name || user?.package_name || "None Selected";

  return (
    <MemberLayout>
      <AnimatePresence>
        {isScanModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center">
              <button onClick={() => setIsScanModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-red-50 transition-all text-slate-400"><X className="w-4 h-4" /></button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-600 shadow-inner">
                  <Scan className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-black">Scan to Pay</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Point at the official gym package QR</p>
              </div>

              <div className="relative aspect-square bg-slate-900 rounded-[2rem] mb-8 overflow-hidden">
                <div id="payment-qr-reader" className="w-full h-full overflow-hidden"></div>
                {(isScanning || cameraError) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 backdrop-blur-md z-20 p-6 text-center">
                    {cameraError ? (
                      <>
                        <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{cameraError}</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-2" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Processing...</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <style>{`
                #payment-qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 1.5rem; }
              `}</style>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <div className="min-h-screen bg-slate-50/50 -mt-10 pt-10 px-4 sm:px-0 pb-20">
        <div className="max-w-5xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 text-center md:text-left">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="text-3xl sm:text-4xl font-black text-slate-900 uppercase italic tracking-tighter"
            >
              Finance <span className="text-orange-600">& Access</span>
            </motion.h1>
            <p className="text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] mt-1">
              Manage your premium tier and billing history
            </p>
          </div>
          
          <div className="flex w-full md:w-auto bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab('plans')}
              className={`flex-1 md:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}
            >
              Memberships
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 md:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}
            >
              History
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-10">
          {activeTab === 'plans' ? (
            <>
              {/* Current Plan Section */}
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={`rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border ${isActive ? 'bg-slate-900 border-orange-500/30' : 'bg-white border-slate-200'}`}>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full text-center sm:text-left">
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl shrink-0 ${isActive ? 'bg-orange-600 shadow-orange-600/40' : 'bg-slate-100'}`}>
                        {isActive ? <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> : <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />}
                      </div>
                      <div className="w-full">
                        <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                          {isActive ? 'Active Membership' : 'Subscription Status'}
                        </div>
                        <h2 className={`text-2xl sm:text-3xl font-black uppercase italic tracking-tighter ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {displayPackageName}
                        </h2>
                        {membership && (
                          <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
                             <div className="p-2">
                               <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Price</div>
                               <div className="text-sm sm:text-lg font-black text-white italic truncate">LKR {Number(membership.package_price || 0).toLocaleString()}</div>
                             </div>
                             <div className="p-2 border-l border-white/5 sm:border-l-0">
                               <div className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 ${Number(membership.balance_due) < 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                 {Number(membership.balance_due) < 0 ? 'Credit' : 'Balance'}
                               </div>
                               <div className={`text-sm sm:text-lg font-black italic truncate ${Number(membership.balance_due) < 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                 LKR {Math.abs(Number(membership.balance_due || 0)).toLocaleString()}
                               </div>
                             </div>
                             <div className="p-2 border-t sm:border-t-0 border-white/5">
                               <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Next Pay</div>
                               <div className="text-sm sm:text-lg font-black text-white italic truncate">
                                 LKR {Math.max(0, (Number(membership.package_price || 0) + Number(membership.balance_due || 0))).toLocaleString()}
                               </div>
                             </div>
                             <div className="p-2 border-t sm:border-t-0 border-l border-white/5 lg:border-l-0">
                               <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Expiry</div>
                               <div className="text-sm sm:text-lg font-black text-white italic truncate">{new Date(membership.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full md:w-auto px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-orange-600/20 active:scale-95"
                    >
                      Renew or Upgrade
                    </button>
                  </div>
                </div>
              </motion.section>

              {/* Available Plans */}
              <section id="available-plans">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 px-2">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                         <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Choose Your Tier</h3>
                   </div>
                   
                   <button 
                    onClick={() => setIsScanModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm"
                   >
                     <QrCode className="w-4 h-4" /> Scan QR to Pay
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {plans.map((plan) => (
                    <motion.div 
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      whileHover={{ y: -8 }}
                      className={`relative p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${
                        selectedPlan?.id === plan.id ? 'border-orange-500 bg-white shadow-2xl' : 'border-slate-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      {plan.is_popular && <div className="absolute top-0 right-0 bg-orange-600 text-white px-5 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest">Popular</div>}
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{plan.name}</h4>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 sm:mb-8">LKR {Number(plan.price).toLocaleString()}<span className="text-[10px] text-slate-400"> / {plan.duration}</span></div>
                      
                      <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600 leading-tight"><CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" /> {f}</li>
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
                  <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative">
                    <div className="bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-14 text-white shadow-2xl border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10">
                       <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 text-center sm:text-left">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-600 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-orange-600/30 shrink-0"><Key className="w-8 h-8 sm:w-10 sm:h-10 text-white" /></div>
                          <div>
                            <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter mb-2">Manual Activation</h3>
                            <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-relaxed">
                              Selected: <span className="text-orange-500 underline">{selectedPlan.name}</span> <br/>
                              <span className="text-white/40 block mt-2 italic normal-case">If you paid cash to your coach, they will provide a unique activation code. Enter it here to sync your status.</span>
                            </p>
                          </div>
                       </div>
                       
                       <div className="flex flex-col gap-4 w-full md:w-[400px]">
                          <div className="relative">
                            <label className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Unique Activation Key</label>
                            <input 
                              type="text" 
                              placeholder="NF-XXXX-XXXX" 
                              value={activationCode} 
                              onChange={(e) => setActivationCode(e.target.value.toUpperCase())} 
                              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-4 sm:py-5 px-6 focus:border-orange-500 font-black tracking-widest text-white uppercase outline-none transition-all placeholder:text-white/10 text-sm" 
                            />
                          </div>
                          <button 
                            onClick={handleActivation} 
                            disabled={isActivating} 
                            className="w-full bg-orange-600 text-white py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all hover:bg-white hover:text-black shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2"
                          >
                            {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & Sync Package <ChevronRight className="w-4 h-4"/></>}
                          </button>
                       </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* History Section */
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-4">
                {/* Desktop View Table */}
                <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
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
                              {parseFloat(pay.balance_due) < 0 && <div className="text-[9px] font-bold text-green-500 uppercase">Credit: LKR {Math.abs(parseFloat(pay.balance_due))}</div>}
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
                          <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-xs">No transactions recorded yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-4">
                  {history.length > 0 ? history.map((pay) => (
                    <div key={pay.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ref ID</div>
                          <div className="text-[10px] font-black text-slate-900 uppercase">#{pay.payhere_payment_id || `PAY-${pay.id}`}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${pay.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {pay.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Package</div>
                          <div className="text-[10px] font-black text-slate-900 uppercase truncate">{pay.package_name}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</div>
                          <div className="text-[10px] font-black text-slate-900 uppercase">
                            {new Date(pay.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</div>
                          <div className="text-xs font-black text-slate-900">LKR {pay.amount_paid}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Method</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase">{pay.payment_method}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        {parseFloat(pay.balance_due) !== 0 ? (
                           <div className={`text-[8px] font-black uppercase tracking-widest ${parseFloat(pay.balance_due) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                             {parseFloat(pay.balance_due) > 0 ? `Due: LKR ${pay.balance_due}` : `Credit: LKR ${Math.abs(parseFloat(pay.balance_due))}`}
                           </div>
                        ) : <div />}
                        
                        <a href={`/api/payments/receipt/${pay.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-4 py-2 rounded-xl">
                          <Download className="w-3 h-3" /> Receipt PDF
                        </a>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No transactions recorded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
