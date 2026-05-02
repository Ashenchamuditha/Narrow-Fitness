import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Activity, 
  HeartPulse, 
  Target, 
  Phone, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  AlertCircle,
  Dumbbell,
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function MemberOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // A. Basic Physical Data
    gender: '',
    dob: '',
    phone: '',
    address: '',
    // B. Biometrics
    weight: '',
    height: '',
    targetWeight: '',
    // C. Health & Medical
    medicalConditions: [] as string[],
    otherMedical: '',
    hasInjuries: 'no',
    injuryDetails: '',
    hasAllergies: 'no',
    allergyDetails: '',
    // D. Fitness Goals
    primaryGoal: '',
    activityLevel: '',
    // E. Emergency Contact
    emergencyName: '',
    emergencyPhone: '',
    profileImage: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

 const navigate = useNavigate();

  // SINGLE GUARD: Handles Auth, Admin check, and Completion check
  useEffect(() => {
    const userStr = localStorage.getItem('narrow_fitness_user');
    
    // 1. If not logged in, go to Auth
    if (!userStr) {
      navigate('/auth', { replace: true });
      return;
    }

    const user = JSON.parse(userStr);

    // 2. If Admin, they don't belong here
    if (user.role?.toLowerCase() === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    // 3. If Profile is already complete, go to Dashboard
    // Changed 'onboardingCompleted' to 'is_profile_complete' to match your DB
    if (user.is_profile_complete === true) {
      navigate('/member', { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };
useEffect(() => {
  const userStr = localStorage.getItem('narrow_fitness_user');
  
  if (!userStr) {
    // If user somehow gets here without logging in, send to Auth
    navigate('/auth', { replace: true });
    return;
  }

  const user = JSON.parse(userStr);
  
  // If they are an admin or have already finished, send them away
  if (user.role === 'admin') {
    navigate('/admin', { replace: true });
  } else if (user.is_profile_complete === true) {
    navigate('/member', { replace: true });
  }
}, [navigate]);

  const handleCheckboxChange = (condition: string) => {
    setFormData(prev => {
      const current = prev.medicalConditions;
      let updated;
      if (condition === 'None') {
        updated = ['None'];
      } else {
        updated = current.filter(c => c !== 'None');
        if (updated.includes(condition)) {
          updated = updated.filter(c => c !== condition);
        } else {
          updated = [...updated, condition];
        }
      }
      return { ...prev, medicalConditions: updated };
    });
    setError('');
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.gender || !formData.dob || !formData.phone || !formData.address) {
          setError('Please complete all fields in this step.');
          return false;
        }
        break;
      case 2:
        if (!formData.weight || !formData.height) {
          setError('Please enter your current weight and height.');
          return false;
        }
        break;
      case 3:
        if (formData.medicalConditions.length === 0) {
          setError('Please select at least one medical condition (or "None").');
          return false;
        }
        if (formData.hasInjuries === 'yes' && !formData.injuryDetails) {
          setError('Please provide details about your injuries.');
          return false;
        }
        if (formData.hasAllergies === 'yes' && !formData.allergyDetails) {
          setError('Please provide details about your allergies.');
          return false;
        }
        break;
      case 4:
        if (!formData.primaryGoal) {
          setError('Please select your primary fitness goal.');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
      setError('');
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setError('');
  };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError('');

    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      try {
        const response = await fetch('/api/member/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            ...formData,
            hasInjuries: formData.hasInjuries === 'yes',
            hasAllergies: formData.hasAllergies === 'yes',
          }),
        });

        if (response.ok) {
          // --- CRITICAL FIX START ---
          // 1. Update the object with the EXACT key used in your Guards
          const updatedUser = { 
            ...user, 
            is_profile_complete: true 
          };

          // 2. Save to LocalStorage
          localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
          
          console.log("Profile Saved. Breaking redirect loops...");

          // 3. USE window.location.href instead of navigate
          // This forces the whole app to refresh and see the NEW "true" flag.
          window.location.href = '/member'; 
          // --- CRITICAL FIX END ---
        } else {
          const data = await response.json();
          throw new Error(data.message || 'Failed to save profile');
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-3xl bg-orange-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-orange-500" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-all shadow-lg">
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData((prev: any) => ({ ...prev, profileImage: reader.result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Basic Information</h2>
                <p className="text-gray-500 text-xs font-medium">Let's start with the basics for your gym record.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Gender</label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 pl-12 pr-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="tel"
                    name="phone"
                    placeholder="+94 77 123 4567"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 pl-12 pr-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    name="address"
                    placeholder="Residential Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 pl-12 pr-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Biometrics</h2>
                <p className="text-gray-500 text-xs font-medium">Your physical stats help our AI personalize your plan.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Weight (kg)</label>
                <input 
                  type="number"
                  name="weight"
                  placeholder="e.g. 75"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Height (cm)</label>
                <input 
                  type="number"
                  name="height"
                  placeholder="e.g. 175"
                  value={formData.height}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Weight (kg) <span className="text-gray-300 font-medium lowercase italic">(Optional)</span></label>
                <input 
                  type="number"
                  name="targetWeight"
                  placeholder="What's your goal weight?"
                  value={formData.targetWeight}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Health & Medical</h2>
                <p className="text-gray-500 text-xs font-medium">Safety first! Tell us about your medical history.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Medical Conditions</label>
                <div className="grid grid-cols-2 gap-3">
                  {['High BP', 'Asthma', 'Diabetes', 'None'].map(condition => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => handleCheckboxChange(condition)}
                      className={`p-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-between ${
                        formData.medicalConditions.includes(condition)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-100 text-gray-500 hover:border-orange-200'
                      }`}
                    >
                      {condition}
                      {formData.medicalConditions.includes(condition) && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  name="otherMedical"
                  placeholder="Other conditions (please specify)"
                  value={formData.otherMedical}
                  onChange={handleInputChange}
                  className="w-full mt-3 bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Past Injuries?</label>
                  <select 
                    name="hasInjuries"
                    value={formData.hasInjuries}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {formData.hasInjuries === 'yes' && (
                    <textarea 
                      name="injuryDetails"
                      placeholder="Please provide details..."
                      value={formData.injuryDetails}
                      onChange={handleInputChange}
                      className="w-full mt-3 bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm h-24"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Allergies?</label>
                  <select 
                    name="hasAllergies"
                    value={formData.hasAllergies}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {formData.hasAllergies === 'yes' && (
                    <textarea 
                      name="allergyDetails"
                      placeholder="Please provide details..."
                      value={formData.allergyDetails}
                      onChange={handleInputChange}
                      className="w-full mt-3 bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm h-24"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Fitness Goals</h2>
                <p className="text-gray-500 text-xs font-medium">What do you want to achieve at Narrow Fitness?</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Goal</label>
                <select 
                  name="primaryGoal"
                  value={formData.primaryGoal}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                >
                  <option value="">Select Primary Goal</option>
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Powerlifting">Powerlifting</option>
                  <option value="General Fitness">General Fitness</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Activity Level <span className="text-gray-300 font-medium lowercase italic">(Optional)</span></label>
                <select 
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                >
                  <option value="">Select Activity Level</option>
                  <option value="Sedentary">Sedentary</option>
                  <option value="Lightly Active">Lightly Active</option>
                  <option value="Very Active">Very Active</option>
                </select>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-black uppercase tracking-tighter mb-4">Emergency Contact <span className="text-gray-300 font-medium lowercase italic">(Optional)</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text"
                    name="emergencyName"
                    placeholder="Contact Name & Relationship"
                    value={formData.emergencyName}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  />
                  <input 
                    type="tel"
                    name="emergencyPhone"
                    placeholder="Contact Phone Number"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-0 transition-all font-bold text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-60 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=1920"
          alt="Gym"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 w-full flex">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className={`h-full flex-1 transition-all duration-500 ${
                i <= step ? 'bg-orange-500' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic">Narrow Fitness</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Step {step} of 4
              </div>
              <button 
                onClick={() => navigate('/')}
                className="text-[8px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors"
              >
                Exit to Home
              </button>
            </div>
          </div>

          <form onSubmit={step === 4 ? handleSubmit : (e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
              </motion.div>
            )}

            <div className="mt-12 flex justify-between items-center">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 text-gray-400 hover:text-black font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                type={step === 4 ? 'submit' : 'button'}
                onClick={step === 4 ? undefined : nextStep}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-black text-white hover:bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-105 shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {step === 4 ? 'Complete Registration' : 'Next Step'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
