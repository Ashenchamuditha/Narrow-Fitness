import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, User, Dumbbell, 
  AlertCircle, ArrowLeft, Eye, EyeOff, 
  ShieldCheck, RefreshCcw, X, KeyRound, Info
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { confirmAction, showWelcomeToast } from '../lib/toastUtils';

export default function Auth() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [showOTP, setShowOTP] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [otp, setOtp] = useState('');

  const navigate = useNavigate();
  //keep login
  useEffect(() => {
  const token = localStorage.getItem('narrow_fitness_token');
  const user = localStorage.getItem('narrow_fitness_user');
  
  if (token && user) {
    const parsedUser = JSON.parse(user);
    // If they try to visit Auth while logged in, send them to their dashboard
    if (parsedUser.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/member');
    }
  }
}, [navigate]);

useEffect(() => {
  // Push a dummy state into the history so there is something to go "back" from
  window.history.pushState(null, "", window.location.href);

  const handleBackButton = async (event: PopStateEvent) => {
    const confirmExit = await confirmAction("Do you want to stay on the dashboard? (Cancel to stay, OK to leave)");
    
    if (confirmExit) {
      // If they click OK, we allow them to go back
      navigate('/'); 
    } else {
      // If they click Cancel, we push the state back so they stay here
      window.history.pushState(null, "", window.location.href);
    }
  };

  window.addEventListener('popstate', handleBackButton);

  return () => {
    window.removeEventListener('popstate', handleBackButton);
  };
}, [navigate]);
// Reset form and errors when switching modes

  useEffect(() => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowOTP(false);
    setShowResetForm(false);
    setOtp('');
  }, [authMode]);

  const validatePassword = (password: string) => {
    const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{6,15})/;
    return regex.test(password);
  };

  const handleAuthSuccess = (data: any) => {
    localStorage.setItem('narrow_fitness_token', data.token);
    localStorage.setItem('narrow_fitness_user', JSON.stringify(data.user));
    const role = data.user.role?.toLowerCase();

    if (role !== 'admin') {
      showWelcomeToast(data.user.name);
    }

    if (role === 'admin') navigate('/admin');
    else if (!data.user.is_profile_complete) navigate('/member/onboarding', { replace: true });
    else navigate('/member');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (authMode === 'signup') {
      if (!validatePassword(formData.password)) {
        setError('Password needs 6-15 chars, 1 uppercase and 1 symbol.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      let endpoint = '';
      if (authMode === 'login') endpoint = '/api/auth/login';
      else if (authMode === 'signup') endpoint = '/api/auth/request-otp';
      else endpoint = '/api/auth/forgot-password';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Action failed');

      if (authMode === 'login') {
        handleAuthSuccess(data);
      } else {
        setShowOTP(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return setError("Enter 6-digit code");
    
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      if (authMode === 'forgot') {
        const response = await fetch('/api/auth/verify-reset-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, otp })
        });
        const data = await response.json();
        
        // If code is wrong, the server returns !ok (400)
        if (!response.ok) throw new Error(data.message || 'Invalid or expired code');
        
        setShowOTP(false);
        setShowResetForm(true);
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, otp })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Invalid or expired code');
        handleAuthSuccess(data);
      }
    } catch (err: any) { 
      setError(err.message); // This will show "Invalid code" to the user
    } finally { 
      setLoading(false); 
    }
  };

  const handleFinalReset = async () => {
    if (!validatePassword(formData.password)) return setError('Use 6-15 chars, 1 uppercase & 1 symbol');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp, newPassword: formData.password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Reset failed');
      
      toast.success("Password updated successfully!");
      handleAuthSuccess(data); 
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 font-sans selection:bg-orange-500 selection:text-white">
      <div className="absolute inset-0 z-0 opacity-40 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1920" alt="Gym" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <AnimatePresence>
        {showOTP && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl text-center border border-white/20">
              <ShieldCheck className="w-16 h-16 text-orange-600 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter mb-2">Security Code</h2>
              <p className="text-gray-500 text-[10px] font-bold mb-8 uppercase tracking-widest text-center">Sent to {formData.email}</p>
              {error && <div className="mb-4 p-2 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-lg border border-red-100 flex items-center justify-center gap-2 animate-shake"><AlertCircle size={12}/>{error}</div>}
              <div className="text-left mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Enter 6-Digit OTP</label>
                <input type="text" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 text-center text-4xl font-black tracking-[0.4em] focus:border-orange-500 outline-none" placeholder="000000" />
              </div>
              <button onClick={handleVerifyOTP} disabled={loading} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">
                {loading ? <RefreshCcw className="animate-spin w-4 h-4 mx-auto" /> : 'Verify Code'}
              </button>
              <button onClick={() => setShowOTP(false)} className="mt-4 text-[10px] font-black uppercase text-gray-400 hover:text-red-500">Cancel</button>
            </motion.div>
          </div>
        )}

        {showResetForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl border border-white/20">
              <KeyRound className="w-16 h-16 text-orange-600 mx-auto mb-6 shadow-lg shadow-orange-500/20" />
              <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter mb-6 text-center">New Password</h2>
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Enter New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e)=>{setFormData({...formData, password: e.target.value}); setError('');}} className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-10 py-3 font-bold text-sm outline-none focus:border-orange-500" placeholder="e.g. pass@123" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Repeat Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e)=>{setFormData({...formData, confirmPassword: e.target.value}); setError('');}} className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-10 py-3 font-bold text-sm outline-none focus:border-orange-500" placeholder="repeat password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
                {error && <p className="text-[10px] font-black text-red-500 uppercase text-center">{error}</p>}
                <button onClick={handleFinalReset} disabled={loading} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-xl">
                  {loading ? <RefreshCcw className="animate-spin w-4 h-4 mx-auto" /> : 'Update & Sign In'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 font-bold uppercase tracking-widest text-xs transition-colors group"><ArrowLeft className="w-4 h-4" />Back to Home</Link>
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden border-2 border-orange-500/10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-50 rounded-3xl mb-6 overflow-hidden p-2 border-2 border-orange-500 shadow-lg">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-black text-black uppercase italic tracking-tighter leading-none">{authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join Narrow Fitness' : 'Recover Account'}</h2>
            <p className="text-gray-500 mt-3 font-medium uppercase text-[10px] tracking-widest">{authMode === 'login' ? 'Sign in to hub' : authMode === 'signup' ? 'Start your journey' : 'Enter email for code'}</p>
          </div>

          {error && !showOTP && !showResetForm && <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase leading-tight"><AlertCircle size={16}/>{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Member Name</label>
                <div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500" /><input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 font-bold text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. john doe" /></div>
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500" /><input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 font-bold text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. narrowfitness@gmail.com" /></div>
            </div>

            {authMode !== 'forgot' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">User Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500" />
                  <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-12 pr-12 py-3 font-bold text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. pass@123" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                </div>
                {authMode === 'signup' && <p className="mt-2 text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Info size={10} className="text-orange-500" /> 6-15 chars, 1 uppercase, 1 symbol</p>}
              </div>
            )}
            
            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500" />
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-12 pr-12 py-3 font-bold text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="repeat password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors">{showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                </div>
              </div>
            )}

            {authMode === 'login' && <div className="text-right px-1"><button type="button" onClick={() => setAuthMode('forgot')} className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-widest">Forgot Password?</button></div>}
            
            <button type="submit" disabled={loading} className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all transform hover:scale-105 disabled:opacity-50">
              {loading ? <RefreshCcw className="w-5 h-5 animate-spin mx-auto" /> : <>{authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Join Narrow Fitness' : 'Send Reset Code'}</>}
            </button>
          </form>

          <div className="mt-10 text-center border-t border-gray-50 pt-8">
            <p className="text-sm font-bold uppercase tracking-tight text-gray-500">
              {authMode === 'login' ? "New here?" : "Already a member?"}{' '}
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-orange-600 font-black hover:text-orange-700 ml-1 transition-colors underline underline-offset-4">
                {authMode === 'login' ? 'Sign Up Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
