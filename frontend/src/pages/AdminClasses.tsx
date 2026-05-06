import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { 
  Calendar, Search, Plus, X, Edit2, Trash2, 
  AlertCircle, Clock, Ban, CheckCircle2, 
  History, PlayCircle, Loader2, Timer, Users, UserMinus, Check, Bell, RefreshCw, UserCheck, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../lib/toastUtils';

interface ClassData {
  id: number;
  name: string;
  trainer_id: string | number;
  trainer_name?: string;
  class_time: string;
  class_day: string;
  capacity: number;
  is_cancelled: boolean;
  pending_count: number; 
}

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Booking states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '', trainer_id: '', class_time: '', class_day: '', capacity: 20, is_cancelled: false
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, trainersRes] = await Promise.all([
        fetch('/api/admin/classes'),
        fetch('/api/admin/trainers')
      ]);
      
      if (classesRes.ok) setClasses(await classesRes.json());
      if (trainersRes.ok) setTrainers(await trainersRes.json());
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- HELPER: CALCULATE STATUS ---
  const calculateStatus = (day: string, time: string, isCancelled: boolean) => {
    if (isCancelled) return { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-100', icon: Ban };
    
    const now = new Date();
    // Create a date object for the class start time
    const start = new Date(`${day}T${time}`);
    // Assume class duration is 1 hour
    const end = new Date(start.getTime() + (60 * 60 * 1000));

    if (now > end) return { label: 'Expired', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: History };
    if (now >= start && now <= end) return { label: 'Ongoing', color: 'bg-green-50 text-green-600 border-green-100 animate-pulse', icon: PlayCircle };
    
    return { label: 'Active', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Timer };
  };

  // --- REFINED STATS LOGIC ---
  const totalPending = classes.reduce((acc, curr) => acc + (Number(curr.pending_count) || 0), 0);
  
  // Count only classes that are NOT cancelled AND NOT expired
  const activeClassesCount = classes.filter(c => {
    const status = calculateStatus(c.class_day, c.class_time, c.is_cancelled);
    return !c.is_cancelled && status.label !== 'Expired';
  }).length;

  const handleDeleteClass = async (id: number) => {
    if (!(await confirmAction("⚠️ DANGER: Delete this session permanently?"))) return;
    try {
      const res = await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { toast.error("Server error."); }
  };

  const handleOpenBookings = async (cls: ClassData) => {
    setSelectedClass(cls);
    setIsBookingModalOpen(true);
    setIsBookingLoading(true);
    try {
      const res = await fetch(`/api/admin/classes/${cls.id}/bookings`);
      if (res.ok) setBookings(await res.json());
    } finally { setIsBookingLoading(false); }
  };

  const confirmBooking = async (bookingId: number) => {
    if (!(await confirmAction("Approve member?"))) return;
    const res = await fetch(`/api/admin/classes/bookings/${bookingId}/confirm`, { method: 'PUT' });
    if (res.ok) { 
      const updatedBookings = await fetch(`/api/admin/classes/${selectedClass?.id}/bookings`).then(r => r.json());
      setBookings(updatedBookings);
      fetchData(); 
    }
  };

  const removeBooking = async (bookingId: number) => {
    if (!(await confirmAction("Remove member?"))) return;
    const res = await fetch(`/api/admin/classes/bookings/${bookingId}`, { method: 'DELETE' });
    if (res.ok) { 
       const updatedBookings = await fetch(`/api/admin/classes/${selectedClass?.id}/bookings`).then(r => r.json());
       setBookings(updatedBookings);
       fetchData(); 
    }
  };

  const handleCancelToggle = async (cls: ClassData) => {
    const action = cls.is_cancelled ? "restore" : "cancel";
    if (!(await confirmAction(`Are you sure you want to ${action} this class?`))) return;

    await fetch(`/api/admin/classes/${cls.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cls, is_cancelled: !cls.is_cancelled })
    });
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trainer_id) { toast.error("Select a coach."); return; }

    const url = editingClass ? `/api/admin/classes/${editingClass.id}` : '/api/admin/classes';
    const method = editingClass ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) { fetchData(); setIsModalOpen(false); setEditingClass(null); }
  };

  const filteredClasses = classes.filter(cls => cls.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AdminLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Schedule <span className="text-orange-600">Hub</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Real-time session & request control</p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={fetchData}
            title="Refresh Data"
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-orange-600 transition-all shadow-sm group"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Active</p>
                <p className="text-lg font-black text-slate-900 leading-none">{activeClassesCount}</p>
             </div>
             <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
             </div>
          </div>

          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
                <p className="text-lg font-black text-orange-600 leading-none">{totalPending}</p>
             </div>
             <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-orange-600" />
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {totalPending > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-8">
            <div className="bg-orange-600 rounded-[2.5rem] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-orange-200/50">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                    <Bell className="w-7 h-7 text-white animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase italic tracking-tight">Pending Member Acceptance</h4>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">You have {totalPending} requests waiting.</p>
                  </div>
               </div>
               <button onClick={() => { const first = classes.find(c => c.pending_count > 0); if (first) handleOpenBookings(first); }} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-white hover:text-black transition-all shadow-lg">Review Requests</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search sessions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" />
        </div>
        <button onClick={() => {setEditingClass(null); setFormData({name:'', trainer_id:'', class_time:'', class_day:'', capacity:20, is_cancelled:false}); setIsModalOpen(true);}} className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-orange-600 transition-all flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Launch Session</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Session / Coach</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Slots</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
              ) : filteredClasses.map((cls) => {
                const status = calculateStatus(cls.class_day, cls.class_time, cls.is_cancelled);
                return (
                  <tr key={cls.id} className={`hover:bg-slate-50/30 transition-colors group ${cls.is_cancelled || status.label === 'Expired' ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-8 py-6">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border w-fit ${status.color}`}>
                        <status.icon className="w-3 h-3" /> {status.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`text-sm font-black uppercase italic ${cls.is_cancelled || status.label === 'Expired' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{cls.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{cls.trainer_name}</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-slate-700 text-sm">{cls.capacity} Available</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenBookings(cls)} className="relative p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Users className="w-4.5 h-4.5" />{cls.pending_count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">{cls.pending_count}</span>}</button>
                        <button onClick={() => handleCancelToggle(cls)} className={`p-2.5 rounded-xl border transition-all ${cls.is_cancelled ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}>{cls.is_cancelled ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Ban className="w-4.5 h-4.5" />}</button>
                        <button onClick={() => {setEditingClass(cls); setFormData(cls); setIsModalOpen(true);}} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:text-black transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                        <button onClick={() => handleDeleteClass(cls.id)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="lg:hidden divide-y divide-slate-50">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></div>
          ) : filteredClasses.map((cls) => {
            const status = calculateStatus(cls.class_day, cls.class_time, cls.is_cancelled);
            return (
              <div key={cls.id} className={`p-6 hover:bg-slate-50/30 transition-colors ${cls.is_cancelled || status.label === 'Expired' ? 'bg-slate-50/50' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border w-fit mb-3 ${status.color}`}>
                      <status.icon className="w-3 h-3" /> {status.label}
                    </span>
                    <div className={`text-sm font-black uppercase italic ${cls.is_cancelled || status.label === 'Expired' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{cls.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{cls.trainer_name}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleOpenBookings(cls)} className="relative p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                      <Users className="w-4.5 h-4.5" />
                      {cls.pending_count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">{cls.pending_count}</span>}
                    </button>
                    <button onClick={() => handleCancelToggle(cls)} className={`p-2.5 rounded-xl border transition-all ${cls.is_cancelled ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}>
                      {cls.is_cancelled ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Ban className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div className="font-bold text-slate-700 text-xs">{cls.capacity} Available Slots</div>
                  <div className="flex gap-2">
                    <button onClick={() => {setEditingClass(cls); setFormData(cls); setIsModalOpen(true);}} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:text-black transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                    <button onClick={() => handleDeleteClass(cls.id)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {isBookingModalOpen && selectedClass && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
               <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                  <div><h2 className="text-2xl font-black text-slate-900 uppercase italic">Members: {selectedClass.name}</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedClass.capacity} Slots Left</p></div>
                  <button onClick={() => setIsBookingModalOpen(false)} className="p-2 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"><X /></button>
               </div>
               <div className="p-8 max-h-[60vh] overflow-y-auto">
                  {isBookingLoading ? <Loader2 className="animate-spin mx-auto text-orange-500" /> : bookings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs">No registrations found.</div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div key={booking.booking_id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-black text-orange-600">{booking.name[0]}</div>
                            <div><div className="font-bold text-slate-900 text-sm uppercase">{booking.name}</div><div className="text-[10px] text-slate-400 font-bold">{booking.email}</div></div>
                          </div>
                          <div className="flex items-center gap-2">
                             {booking.status === 'pending' ? <button onClick={() => confirmBooking(booking.booking_id)} className="px-4 py-2 bg-green-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-green-500/20">Approve</button> : <span className="px-3 py-1 bg-green-100 text-green-600 text-[9px] font-black uppercase rounded-lg">Confirmed</span>}
                             <button onClick={() => removeBooking(booking.booking_id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><UserMinus className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editingClass ? 'Update Session' : 'New Session'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"><X /></button>
               </div>
               <form onSubmit={handleSubmit} className="space-y-5">
                  <input required value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} placeholder="Class Name" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border border-slate-100 focus:border-orange-500 outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                    <select required value={formData.trainer_id} onChange={(e)=>setFormData({...formData, trainer_id: e.target.value})} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100">
                      <option value="">Select Coach</option>
                      {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input type="number" value={formData.capacity} onChange={(e)=>setFormData({...formData, capacity: parseInt(e.target.value)})} placeholder="Slots" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={formData.class_day} onChange={(e)=>setFormData({...formData, class_day: e.target.value})} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" />
                    <input type="time" value={formData.class_time} onChange={(e)=>setFormData({...formData, class_time: e.target.value})} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs hover:bg-orange-600 transition-all shadow-xl">Confirm & Publish</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
