import React, { useState, useEffect } from 'react';
import MemberLayout from '../components/MemberLayout';
import { Settings, Save, Shield, Bell, Globe, User, Camera, Activity, HeartPulse, Target, Phone, MapPin, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MemberSettings() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('narrow_fitness_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData(parsedUser.profile || {});
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      const updatedUser = { ...user, profile: formData };
      localStorage.setItem('narrow_fitness_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsSaving(false);
      toast.success('Profile updated successfully!');
    }, 1000);
  };

  if (!formData) return null;

  return (
    <MemberLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Profile & Stats</h1>
          <p className="text-gray-500 font-medium tracking-tight">Manage your physical profile, health data, and goals.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-black text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-105 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Profile */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8 flex items-center gap-2">
              <User className="w-6 h-6 text-orange-500" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={user?.name || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={user?.email || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.dob || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Address</label>
                <input 
                  type="text" 
                  name="address"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Biometrics */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8 flex items-center gap-2">
              <Activity className="w-6 h-6 text-orange-500" />
              Biometrics & Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Weight (kg)</label>
                <input 
                  type="number" 
                  name="weight"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.weight || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Height (cm)</label>
                <input 
                  type="number" 
                  name="height"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.height || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Weight (kg)</label>
                <input 
                  type="number" 
                  name="targetWeight"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.targetWeight || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Gender</label>
                <select 
                  name="gender"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold appearance-none"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Goal</label>
                <select 
                  name="primaryGoal"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold appearance-none"
                  value={formData.primaryGoal || ''}
                  onChange={handleInputChange}
                >
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Powerlifting">Powerlifting</option>
                  <option value="General Fitness">General Fitness</option>
                </select>
              </div>
            </div>
          </div>

          {/* Health & Medical */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8 flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-orange-500" />
              Health & Medical Details
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Medical Conditions</label>
                <input 
                  type="text" 
                  name="otherMedical"
                  placeholder="e.g. Asthma, High BP"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.otherMedical || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Past Injuries</label>
                  <textarea 
                    name="injuryDetails"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold h-24"
                    value={formData.injuryDetails || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Allergies</label>
                  <textarea 
                    name="allergyDetails"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold h-24"
                    value={formData.allergyDetails || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Emergency Contact */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8 flex items-center gap-2">
              <Phone className="w-6 h-6 text-orange-500" />
              Emergency Contact
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Name & Relation</label>
                <input 
                  type="text" 
                  name="emergencyName"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.emergencyName || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  name="emergencyPhone"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  value={formData.emergencyPhone || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8 flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              Security
            </h2>
            <button className="w-full py-3 bg-gray-50 text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
