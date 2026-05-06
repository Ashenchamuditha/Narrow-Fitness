import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Save, User, Activity, HeartPulse, Phone, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminSettings() {
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
      toast.success('Admin profile updated successfully!');
    }, 1000);
  };

  if (!formData) return null;

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Admin Settings</h1>
          <p className="text-gray-500 font-medium tracking-tight">Manage your administrator profile and security.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-black text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-105 disabled:opacity-50 shadow-lg"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Profile */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
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

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8 flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              Security Settings
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Password management and two-factor authentication.</p>
              <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all shadow-lg">
                Update Security Credentials
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-orange-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-200">
             <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4">Admin Protocol</h3>
             <p className="text-xs font-medium leading-relaxed uppercase tracking-tight opacity-90 italic">
               As a Master Controller, your security credentials grant global access to the gym's database and financial records. Ensure your contact information is always up to date for emergency system notifications.
             </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

