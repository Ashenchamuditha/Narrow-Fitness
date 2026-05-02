import React, { useState, useEffect, useMemo } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  Save, User, Camera, HeartPulse, 
  Target, ShieldCheck, Lock, 
  Scale, Eye, EyeOff, ClipboardList, MapPin, 
  X, Check, Loader2, Activity, Trash2, AlertCircle, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../lib/toastUtils';

export default function MemberSettings() {
  const [user, setUser] = useState<any>(null);
  const [originalProfileData, setOriginalProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'registered'>('account');
  
  // Password Visibility
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  // Verification Modal Logic
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyPurpose, setVerifyPurpose] = useState<'profile' | 'image' | 'delete_image' | 'account' | null>(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  const navigate = useNavigate();

  const [accountFormData, setAccountFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileData, setProfileData] = useState<any>({
    weight: '', height: '', targetWeight: '', medicalConditions: [] as string[],
    otherMedical: '', injuryDetails: '', allergyDetails: '', emergencyName: '', 
    emergencyPhone: '', dob: '', gender: '', primaryGoal: '', phone: '', 
    address: '', activityLevel: '', hasInjuries: 'no', hasAllergies: 'no'
  });

  // 1. FETCH ALL DATA ON LOAD
  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setAccountFormData(prev => ({ ...prev, name: parsedUser.name }));

      fetch(`/api/member/profile/${parsedUser.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const formatted = {
              weight: data.current_weight || '',
              height: data.height || '',
              targetWeight: data.target_weight || '',
              medicalConditions: Array.isArray(data.medical_conditions) ? data.medical_conditions : [],
              otherMedical: data.other_medical || '',
              injuryDetails: data.injury_details || '',
              allergyDetails: data.allergy_details || '',
              emergencyName: data.emergency_contact_name || '',
              emergencyPhone: data.emergency_contact_phone || '',
              dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
              gender: data.gender || '',
              primaryGoal: data.primary_goal || '',
              phone: data.phone || '',
              address: data.address || '',
              activityLevel: data.activity_level || '',
              hasInjuries: data.has_injuries ? 'yes' : 'no',
              hasAllergies: data.has_allergies ? 'yes' : 'no'
            };
            setProfileData(formatted);
            setOriginalProfileData(formatted);
          }
        });
    }
  }, []);

  // 2. PASSWORD STRENGTH VALIDATION (6-15 chars, 1 Uppercase, 1 Symbol)
  const validateStrongPassword = (pass: string) => {
    if (!pass) return true; // Optional field
    const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,15}$/;
    return regex.test(pass);
  };

  const calculateBMI = () => {
    const w = parseFloat(profileData.weight);
    const h = parseFloat(profileData.height);
    if (w > 0 && h > 0) return (w / ((h / 100) * (h / 100))).toFixed(1);
    return null;
  };

  const isProfileChanged = useMemo(() => {
    if (!originalProfileData) return false;
    return JSON.stringify(profileData) !== JSON.stringify(originalProfileData);
  }, [profileData, originalProfileData]);

  const isAccountChanged = useMemo(() => {
    if (!user) return false;
    return accountFormData.name !== user.name || accountFormData.newPassword.length > 0;
  }, [accountFormData, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImage(reader.result as string);
      setIsImageModalOpen(true);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Trigger Modal and Validate inputs first
  const triggerVerification = (purpose: 'profile' | 'image' | 'delete_image' | 'account') => {
    if (purpose === 'account') {
        if (accountFormData.newPassword) {
            if (!validateStrongPassword(accountFormData.newPassword)) {
                toast.error("New password must be 6-15 characters, contain 1 Uppercase letter, and 1 Special Character (@$!%*?&).");
                return;
            }
            if (accountFormData.newPassword !== accountFormData.confirmPassword) {
                toast.error("New passwords do not match!");
                return;
            }
        }
    }
    setVerifyPurpose(purpose);
    setIsVerifyModalOpen(true);
  };

  // FINAL SECURE UPDATE EXECUTION
  const executeSecureUpdate = async () => {
    if (!accountFormData.currentPassword) {
      toast.error("Verification Error: Current password is required.");
      return;
    }

    setIsSaving(true);
    try {
      let endpoint = '';
      let method = 'PUT';
      let payload: any = { userId: user.id, currentPassword: accountFormData.currentPassword };

      if (verifyPurpose === 'image') {
        endpoint = '/api/member/update-security';
        payload.profileImage = tempImage;
      } else if (verifyPurpose === 'delete_image') {
        endpoint = '/api/member/update-security';
        payload.profileImage = null; 
      } else if (verifyPurpose === 'profile') {
        endpoint = '/api/member/profile';
        method = 'POST';
        Object.assign(payload, profileData);
      } else {
        endpoint = '/api/member/update-security';
        payload.name = accountFormData.name;
        if (accountFormData.newPassword) payload.newPassword = accountFormData.newPassword;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        // Successful update: sync storage and refresh
        if (verifyPurpose === 'image' || verifyPurpose === 'delete_image') {
            const updatedUser = { ...user, profile_image: verifyPurpose === 'image' ? tempImage : null };
            localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
        } else if (verifyPurpose === 'account') {
            const updatedUser = { ...user, name: accountFormData.name };
            localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
        }
        
        toast.success("Success! Profiles synchronized with elite records.");
        window.location.reload(); // PAGE REFRESH ON SUCCESS ONLY
      } else {
        toast.error("Denied: " + (result.message || "Invalid credentials."));
        setIsSaving(false);
      }
    } catch (err) {
        toast.error("Error: Could not connect to the server.");
        setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <MemberLayout>
      {/* --- RE-VERIFICATION PASS MODAL --- */}
      <AnimatePresence>
        {isVerifyModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center">
              <div className={`w-16 h-16 ${verifyPurpose === 'delete_image' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                {verifyPurpose === 'delete_image' ? <Trash2 className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
                {verifyPurpose === 'delete_image' ? 'Confirm Deletion' : 'Secure Authorization'}
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Type current password to finish</p>
              
              <div className="relative mb-8">
                 <input 
                  type={showCurrentPass ? "text" : "password"} 
                  value={accountFormData.currentPassword} 
                  onChange={(e) => setAccountFormData({...accountFormData, currentPassword: e.target.value})} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-center tracking-[0.3em] focus:border-orange-500 transition-all" 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setIsVerifyModalOpen(false)} className="flex-1 py-4 font-black uppercase text-[10px] text-slate-400">Back</button>
                <button onClick={executeSecureUpdate} disabled={isSaving} className={`flex-1 py-4 ${verifyPurpose === 'delete_image' ? 'bg-red-600' : 'bg-black'} text-white rounded-2xl font-black uppercase text-[10px] hover:opacity-80 transition-all`}>
                  {isSaving ? "Syncing..." : "Finalize"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- IMAGE PREVIEW MODAL --- */}
      <AnimatePresence>
        {isImageModalOpen && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-2xl font-black uppercase italic mb-6">Preview Photo</h3>
              <div className="w-48 h-48 mx-auto rounded-[2.5rem] overflow-hidden border-4 border-slate-100 mb-8 shadow-xl">
                <img src={tempImage!} className="w-full h-full object-cover" alt="Preview" />
              </div>
              <button onClick={() => triggerVerification('image')} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-black transition-all">
                Update Athlete Avatar
              </button>
              <button onClick={() => setIsImageModalOpen(false)} className="mt-4 text-[10px] font-black uppercase text-slate-400">Discard Changes</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50/50 -mt-10 pt-10 px-2 sm:px-0 pb-20">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Account <span className="text-orange-600">Settings</span></h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><ShieldCheck className="w-3 h-3 text-orange-600"/> Military-Grade Data Security</p>
        </div>

        <div className="flex gap-2 mb-10 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm">
          <button onClick={() => setActiveTab('account')} className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'account' ? 'bg-black text-white' : 'text-slate-400 hover:text-slate-600'}`}>
            <Lock className="w-4 h-4" /> Account Security
          </button>
          <button onClick={() => setActiveTab('registered')} className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === 'registered' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
            <ClipboardList className="w-4 h-4" /> Registered Details
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {activeTab === 'account' ? (
                <motion.div key="account" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-2 text-slate-900"><User className="w-6 h-6 text-orange-600" /> Identity Management</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Full Display Name</label>
                          <input type="text" value={accountFormData.name} onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-orange-500 transition-all" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 italic">Email (Locked for Security)</label>
                          <input type="email" value={user.email} disabled className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 font-bold text-slate-400 cursor-not-allowed shadow-inner" />
                        </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                         <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-slate-900"><ShieldCheck className="w-4 h-4 text-orange-600"/> Reset Secret Access</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">New Password</label>
                                <input type={showNewPass ? "text" : "password"} value={accountFormData.newPassword} onChange={(e) => setAccountFormData({...accountFormData, newPassword: e.target.value})} className={`w-full bg-slate-50 border-2 ${accountFormData.newPassword && !validateStrongPassword(accountFormData.newPassword) ? 'border-red-200' : 'border-slate-100'} rounded-2xl px-5 py-4 font-bold`} placeholder="6-15 chars, 1 Up, 1 Sym" />
                                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-[50px] text-slate-300">
                                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                {accountFormData.newPassword && (
                                    <p className={`text-[9px] mt-2 font-black uppercase tracking-widest ${validateStrongPassword(accountFormData.newPassword) ? 'text-green-500' : 'text-red-500'}`}>
                                        {validateStrongPassword(accountFormData.newPassword) ? '✓ Strength Verified' : '⚠ Required: 6-15 chars, Uppercase, Symbol'}
                                    </p>
                                )}
                            </div>
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Confirm New Password</label>
                                <input type={showConfirmPass ? "text" : "password"} value={accountFormData.confirmPassword} onChange={(e) => setAccountFormData({...accountFormData, confirmPassword: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold" />
                                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-4 top-[50px] text-slate-300">
                                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                         </div>
                      </div>
                    </div>
                    <button onClick={() => triggerVerification('account')} disabled={!isAccountChanged} className="mt-10 w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-orange-600 transition-all disabled:opacity-20">
                      Update Security Sync
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="registered" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  {/* ONBOARDING DATA SYNCED */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-2"><Scale className="w-6 h-6 text-orange-600" /> Physical Biometrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Weight (kg)</label><input type="number" step="0.1" value={profileData.weight} onChange={(e) => setProfileData({...profileData, weight: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold" /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Height (cm)</label><input type="number" value={profileData.height} onChange={(e) => setProfileData({...profileData, height: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold" /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Weight</label><input type="number" value={profileData.targetWeight} onChange={(e) => setProfileData({...profileData, targetWeight: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Strategy</label><select value={profileData.primaryGoal} onChange={(e) => setProfileData({...profileData, primaryGoal: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold outline-none"><option value="Weight Loss">Weight Loss</option><option value="Muscle Gain">Muscle Gain</option><option value="Powerlifting">Powerlifting</option><option value="General Fitness">General Fitness</option></select></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activity</label><select value={profileData.activityLevel} onChange={(e) => setProfileData({...profileData, activityLevel: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold outline-none"><option value="Sedentary">Sedentary</option><option value="Lightly Active">Lightly Active</option><option value="Very Active">Very Active</option></select></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gender</label><select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold outline-none"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-2"><MapPin className="w-6 h-6 text-orange-600" /> Contact Hub</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Personal Phone</label><input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold" /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Birth Date</label><input type="date" value={profileData.dob} onChange={(e) => setProfileData({...profileData, dob: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold" /></div>
                      <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Residential Address</label><input type="text" value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-orange-50 rounded-[2rem] border border-orange-100">
                      <div className="md:col-span-2 flex items-center gap-2 mb-2"><AlertCircle className="w-3 h-3 text-orange-600"/><p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Emergency Contact</p></div>
                      <div><input type="text" value={profileData.emergencyName} onChange={(e) => setProfileData({...profileData, emergencyName: e.target.value})} className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold text-xs" placeholder="Full Name" /></div>
                      <div><input type="tel" value={profileData.emergencyPhone} onChange={(e) => setProfileData({...profileData, emergencyPhone: e.target.value})} className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold text-xs" placeholder="Contact Phone" /></div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black uppercase italic mb-8 flex items-center gap-2"><HeartPulse className="w-6 h-6 text-red-600" /> Medical Profile</h3>
                    <div className="mb-8">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Medical Conditions</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['High BP', 'Asthma', 'Diabetes', 'None'].map((cond) => (
                                <button key={cond} type="button" onClick={() => {
                                    const current: string[] = profileData.medicalConditions || [];
                                    let updated: string[];
                                    if (cond === 'None') updated = ['None'];
                                    else {
                                        updated = current.filter((item: string) => item !== 'None');
                                        updated = updated.includes(cond) ? updated.filter((item: string) => item !== cond) : [...updated, cond];
                                    }
                                    setProfileData({...profileData, medicalConditions: updated});
                                }} className={`p-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center justify-between ${profileData.medicalConditions?.includes(cond) ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white border-slate-100 text-slate-400 hover:border-orange-200'}`}>
                                    {cond} {profileData.medicalConditions?.includes(cond) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previous Injuries?</label>
                            <select value={profileData.hasInjuries} onChange={(e) => setProfileData({...profileData, hasInjuries: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold outline-none"><option value="no">No</option><option value="yes">Yes</option></select>
                            {profileData.hasInjuries === 'yes' && <textarea value={profileData.injuryDetails} onChange={(e) => setProfileData({...profileData, injuryDetails: e.target.value})} className="w-full mt-3 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-xs h-24" placeholder="Description..." />}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Known Allergies?</label>
                            <select value={profileData.hasAllergies} onChange={(e) => setProfileData({...profileData, hasAllergies: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold outline-none"><option value="no">No</option><option value="yes">Yes</option></select>
                            {profileData.hasAllergies === 'yes' && <textarea value={profileData.allergyDetails} onChange={(e) => setProfileData({...profileData, allergyDetails: e.target.value})} className="w-full mt-3 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-xs h-24" placeholder="Description..." />}
                        </div>
                    </div>
                    <button onClick={() => triggerVerification('profile')} disabled={!isProfileChanged} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[10px] hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-20">
                      <Save className="w-4 h-4" /> Synchronize Records
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-8">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-orange-100 mx-auto mb-6 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative group">
                  {user.profile_image ? <img src={user.profile_image} className="w-full h-full object-cover" alt="Profile" /> : <User className="w-10 h-10 text-orange-500" />}
                  
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all gap-4">
                    <label className="cursor-pointer p-2 hover:bg-orange-500 rounded-lg transition-all">
                      <Camera className="w-5 h-5 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </label>
                    {user.profile_image && (
                      <button onClick={() => triggerVerification('delete_image')} className="p-2 hover:bg-red-500 rounded-lg transition-all">
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{user.name}</h4>
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] mt-2">Verified Narrow Athlete</p>
                
                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                   <div className="text-center">
                     <div className="text-lg font-black text-slate-900">{profileData.weight || '--'}</div>
                     <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Weight (kg)</div>
                   </div>
                   <div className="text-center">
                     <div className="text-lg font-black text-slate-900">{calculateBMI() || 'N/A'}</div>
                     <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Body Mass</div>
                   </div>
                </div>
             </div>
             
             <div className="bg-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Goal Progress</h4>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter italic">Currently optimizing protocols for {profileData.primaryGoal || 'your training'}. Results require consistency and precision.</p>
                </div>
                <Activity className="absolute -bottom-8 -right-8 w-32 h-32 text-white/5 rotate-12" />
             </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
