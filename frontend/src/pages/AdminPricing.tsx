import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Tag, Star, Check, Edit2, X, 
  Key, Ticket, Copy, CheckCircle2, Loader2, Info, ChevronRight, AlertTriangle, Zap,
  Search // Added Search icon
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

interface PricingPlan {
  id?: number;
  name: string;
  price: number | string;
  duration: string;
  features: string[];
  is_popular: boolean;
}

export default function AdminPricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [unusedCodes, setUnusedCodes] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search

  const [formData, setFormData] = useState<PricingPlan>({
    name: '',
    price: '',
    duration: 'Month',
    features: [''],
    is_popular: false
  });

  const [customCapacity, setCustomCapacity] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchUnusedCodes();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/pricing');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredPlans = plans.filter(plan => 
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchUnusedCodes = async () => {
    try {
      const res = await fetch('/api/admin/codes');
      if (res.ok) {
        const data = await res.json();
        setUnusedCodes(data.filter((c: any) => !c.is_used));
      }
    } catch (err) {
      console.error('Error fetching codes:', err);
    }
  };

  const handleGenerateKey = async (planId: number) => {
    if (!planId) {
      alert("Invalid Plan ID");
      return;
    }

    if (!window.confirm("Generate a new one-time activation key for this package?")) return;
    
    setIsGenerating(planId);

    try {
      const res = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: planId })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Backend sent HTML instead of JSON. Check your API routes.");
        alert("Server Error: The backend route was not found (404). Check your server console.");
        return;
      }

      const data = await res.json();

      if (res.ok) {
        alert(`✅ KEY GENERATED: ${data.code}\nCopy it from the sidebar to give to the member.`);
        fetchUnusedCodes();
      } else {
        alert(`❌ Failed: ${data.message}`);
      }
    } catch (err) {
      alert("Network Error: Make sure your backend server (Port 5000) is running.");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeatureInput = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeatureInput = (index: number) => {
    if (formData.features.length <= 1) return;
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleEdit = (plan: PricingPlan) => {
    setFormData({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features.length > 0 ? plan.features : [''],
      is_popular: plan.is_popular
    });
    setIsEditing(true);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionType = isEditing ? "update this existing" : "create this new";
    const hasConfirmed = window.confirm(`Are you sure you want to ${actionType} pricing package?`);
    if (!hasConfirmed) return;

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/api/admin/pricing/${formData.id}` : '/api/admin/pricing';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price.toString()),
          features: formData.features.filter(f => f.trim() !== '') 
        })
      });

      if (res.ok) {
        alert("✅ Operation successful!");
        resetForm();
        fetchPlans();
      }
    } catch (err) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this pricing plan?')) return;
    try {
      const res = await fetch(`/api/admin/pricing/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPlans();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', duration: 'Month', features: [''], is_popular: false });
    setIsEditing(false);
    setIsFormOpen(false);
  };

  return (
    <AdminLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
        <div className="px-2">
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter">
            Pricing <span className="text-orange-600">& Keys</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1 italic">
            Financial Management & Activation Control
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto px-2">
          {/* --- SEARCH BAR --- */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search packages"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
            />
          </div>

          <button 
            onClick={() => { setIsEditing(false); setIsFormOpen(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-black text-white hover:bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Create New Package
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 px-2">
        
        {/* LEFT COLUMN: ACTIVE PLANS */}
        <div className="xl:col-span-2">
           <div className="flex items-center gap-2 mb-8">
              <Zap className="w-5 h-5 text-orange-600" />
              <h3 className="text-xl font-black uppercase italic text-slate-900">Active Membership Tiers</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {loading ? (
                <div className="col-span-full py-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-orange-500 w-10 h-10" />
                  <p className="mt-4 text-slate-400 font-black uppercase text-[10px]">Loading Vault...</p>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold uppercase text-xs">
                     {searchTerm ? `No plans matching "${searchTerm}"` : 'No pricing plans found.'}
                   </p>
                </div>
              ) : filteredPlans.map((plan) => (
                <motion.div 
                  layout key={plan.id}
                  className={`bg-white rounded-[2.5rem] border-2 transition-all p-10 relative overflow-hidden group ${plan.is_popular ? 'border-orange-500 shadow-2xl' : 'border-slate-100 shadow-sm'}`}
                >
                  {plan.is_popular && (
                    <div className="absolute top-0 right-0 bg-orange-600 text-white px-5 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg z-10">
                      <Star className="w-3.5 h-3.5 fill-white" /> Recommended
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">{plan.name}</h3>
                        <p className="text-3xl font-black text-orange-600 mt-2 tracking-tighter">LKR {Number(plan.price).toLocaleString()}</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => handleEdit(plan)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition-all shadow-sm"><Edit2 className="w-4.5 h-4.5" /></button>
                        <button onClick={() => handleDelete(plan.id!)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"><Trash2 className="w-4.5 h-4.5" /></button>
                     </div>
                  </div>

                  <button 
                    disabled={isGenerating === plan.id}
                    onClick={() => handleGenerateKey(plan.id!)}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-orange-600 transition-all mb-8 shadow-xl"
                  >
                    {isGenerating === plan.id ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Key className="w-4 h-4" />}
                    Generate Activation Key
                  </button>

                  <ul className="space-y-4 border-t border-slate-50 pt-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-[11px] font-bold text-slate-500 uppercase leading-tight">
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0" /> {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
           </div>
        </div>

        {/* RIGHT COLUMN: RECENT KEYS SIDEBAR */}
        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-28 h-fit">
              <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50">
                 <Ticket className="w-6 h-6 text-orange-600" />
                 <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">Pending Keys</h3>
              </div>
              
              <div className="space-y-4">
                 {unusedCodes.length === 0 ? (
                   <div className="text-center py-10 opacity-30">
                      <Key className="mx-auto mb-4 w-10 h-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No pending keys in the secure vault.</p>
                   </div>
                 ) : unusedCodes.map(code => (
                   <motion.div 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    key={code.id} 
                    className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex justify-between items-center group relative overflow-hidden"
                   >
                      <div className="relative z-10">
                         <div className="text-sm font-black text-slate-900 tracking-[0.3em] font-mono">{code.code}</div>
                         <div className="text-[9px] font-black text-orange-600 uppercase mt-1.5 bg-orange-50 px-2 py-0.5 rounded w-fit">{code.plan_name}</div>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(code.code); alert("Key Copied to Clipboard!"); }}
                        className="p-3 bg-white text-slate-400 hover:text-orange-600 rounded-xl shadow-sm transition-all relative z-10"
                      >
                         <Copy className="w-4.5 h-4.5" />
                      </button>
                      <div className="absolute top-0 right-0 p-2 opacity-[0.03] rotate-45"><Ticket className="w-20 h-20" /></div>
                   </motion.div>
                 ))}
              </div>
              
              <div className="mt-10 p-5 bg-orange-50 rounded-[1.5rem] border border-orange-100">
                 <div className="flex items-center gap-2 mb-2 text-orange-700">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Staff Protocol</span>
                 </div>
                 <p className="text-[10px] text-orange-600/80 font-bold leading-relaxed uppercase tracking-wider">Give these codes to members ONLY after receiving cash payment. Each key is one-time use only.</p>
              </div>
           </div>
        </div>
      </div>

      {/* --- ADD/EDIT PLAN MODAL --- */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{isEditing ? 'Edit Package' : 'Create Package'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Tier Configuration</p>
                  </div>
                  <button onClick={resetForm} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all shadow-sm"><X className="w-6 h-6" /></button>
               </div>
               
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Plan Designation</label>
                    <input required value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} placeholder="e.g. Pro Athlete" className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-orange-500 outline-none transition-all text-lg" />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Currency (LKR)</label>
                      <input type="number" required value={formData.price} onChange={(e)=>setFormData({...formData, price:e.target.value})} placeholder="0.00" className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">Billing Cycle</label>
                      <select value={formData.duration} onChange={(e)=>setFormData({...formData, duration:e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                        <option value="Month">Per Month</option>
                        <option value="Year">Per Year</option>
                        <option value="One-time">One-time payment</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest flex justify-between">
                       Features Included 
                       <button type="button" onClick={addFeatureInput} className="text-orange-600 hover:underline">+ Add Row</button>
                    </label>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                       {formData.features.map((feat, i) => (
                         <div key={i} className="flex gap-3 items-center group">
                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                            <input required value={feat} onChange={(e)=>handleFeatureChange(i, e.target.value)} className="flex-1 px-5 py-3.5 bg-slate-50 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-orange-500" placeholder="Feature description..." />
                            <button type="button" onClick={() => removeFeatureInput(i)} className="text-slate-300 hover:text-red-500 p-2"><X className="w-5 h-5" /></button>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-4 bg-slate-50 px-6 rounded-2xl border border-slate-100">
                    <input type="checkbox" checked={formData.is_popular} onChange={(e)=>setFormData({...formData, is_popular:e.target.checked})} className="w-6 h-6 accent-orange-600 cursor-pointer" id="popular-check" />
                    <label htmlFor="popular-check" className="text-xs font-black uppercase text-slate-600 cursor-pointer tracking-widest">Mark as "Most Popular" for highlighting</label>
                  </div>

                  <button type="submit" className="w-full py-5 bg-black text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-orange-600 transition-all mt-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] active:scale-95">
                    {isEditing ? 'Verify & Update Tier' : 'Authorize & Publish Tier'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}