import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  Download, 
  QrCode, 
  User, 
  Calendar as CalendarIcon,
  ArrowRight,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCcw,
  CheckCircle2,
  LogIn,
  LogOut,
  Scan,
  Loader2,
  Check,
  TrendingUp,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../components/AdminLayout';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from 'react-hot-toast';
import { confirmAction, promptAction } from '../lib/toastUtils';

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrConfigs, setQrConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [filters, setFilters] = useState({ date: '', user: '' });
  const [stats, setStats] = useState({ 
    totalToday: 0, 
    currentInGym: 0,
    avgDuration: 0,
    peakHour: '--:--'
  });

  // Scanner State for Admin Validation/Activation
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    console.log("AdminAttendance: Mounting & Fetching Data...");
    fetchAttendance();
    fetchStats();
    fetchQrConfigs();
    const interval = setInterval(() => {
      fetchAttendance();
      fetchStats();
    }, 30000); 
    return () => clearInterval(interval);
  }, [filters]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/attendance/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchQrConfigs = async () => {
    try {
      console.log("Admin: Fetching QR Configs...");
      const res = await fetch('/api/attendance/configs');
      const data = await res.json();
      console.log("Admin: Received Configs:", data);
      setQrConfigs(data);
      
      // Keep selection or default to active
      if (selectedConfig) {
        const current = data.find((c: any) => c.id === selectedConfig.id);
        if (current) setSelectedConfig(current);
      } else {
        const active = data.find((c: any) => c.is_active);
        if (active) {
          console.log("Admin: Defaulting selection to ACTIVE config:", active.location_name);
          setSelectedConfig(active);
        } else if (data.length > 0) {
          setSelectedConfig(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching QR configs:', err);
    }
  };

  const handleAddConfig = async () => {
    const name = await promptAction("Enter Location Name (e.g. Main Entrance, VIP Gate):");
    if (!name) return;
    
    const newKey = `NF-ATTEND-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${new Date().getFullYear()}`;
    try {
      const res = await fetch('/api/attendance/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_name: name, qr_key: newKey })
      });
      if (res.ok) {
        await fetchQrConfigs();
        toast.success('New QR Configuration added and activated!');
      }
    } catch (err) {
      console.error('Error adding config:', err);
    }
  };

  const handleEditConfig = async (id: number, currentName: string) => {
    const newName = await promptAction("Update Location Name:", currentName);
    if (!newName || newName === currentName) return;

    try {
      const res = await fetch(`/api/attendance/configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_name: newName })
      });
      if (res.ok) {
        await fetchQrConfigs();
      }
    } catch (err) {
      console.error('Error updating config:', err);
    }
  };

  const handleDeleteConfig = async (id: number, name: string) => {
    if (!(await confirmAction(`Are you sure you want to delete the QR config for "${name}"?`))) return;

    try {
      const res = await fetch(`/api/attendance/configs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchQrConfigs();
        toast.success('Config deleted successfully.');
      }
    } catch (err) {
      console.error('Error deleting config:', err);
    }
  };

  const handleRotateKey = async () => {
    if (!selectedConfig) return;
    
    const newKey = `NF-ATTEND-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${new Date().getFullYear()}`;
    
    try {
      const res = await fetch('/api/attendance/configs/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedConfig.id, newKey })
      });
      
      if (res.ok) {
        await fetchQrConfigs();
        toast.success('New QR Key generated and activated!');
      }
    } catch (err) {
      console.error('Error rotating key:', err);
    }
  };

  const handleActivateConfig = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/attendance/configs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      if (res.ok) {
        await fetchQrConfigs();
      }
    } catch (err) {
      console.error('Error toggling config:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const query = new URLSearchParams();
      if (filters.date) query.append('date', filters.date);
      if (filters.user) query.append('userId', filters.user);

      const res = await fetch(`/api/attendance?${query.toString()}`);
      const data = await res.json();
      setAttendance(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setLoading(false);
    }
  };

  // QR Validation Scanner Logic
  const startScanner = async () => {
    console.log("Admin: Starting Scanner...");
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("admin-qr-reader");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            console.log("Admin: Scanned text:", decodedText);
            const config = qrConfigs.find(c => c.qr_key === decodedText.trim());
            if (config) {
              console.log("Admin: Recognized Config Found:", config.location_name);
              handleActivateConfig(config.id, config.is_active);
              html5QrCode.stop();
              setIsScannerOpen(false);
            } else {
              console.warn("Admin: Unknown QR Scanned:", decodedText);
              toast.error("Unknown QR Code: " + decodedText);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("Admin: Scanner launch error", err);
        toast.error("Camera error: " + err);
      }
    }, 500);
  };

  const stopScanner = async () => {
    console.log("Admin: Stopping Scanner...");
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScannerOpen(false);
  };

  const handlePrint = () => {
    console.log("Admin: Triggering Print...");
    window.print();
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Date', 'Check In', 'Check Out', 'Duration (min)', 'Status'];
    const csvData = attendance.map(r => [
      r.name,
      r.email,
      new Date(r.attendance_date).toLocaleDateString(),
      new Date(r.check_in).toLocaleTimeString(),
      r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-',
      r.duration_minutes || '-',
      r.status
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 no-print">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-6 text-center lg:text-left">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-black uppercase italic tracking-tighter">
              Attendance <span className="text-orange-600">Track</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Live Gym Traffic & Member Logs</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={startScanner}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-slate-50 transition-all shadow-sm"
            >
              <Scan className="w-4 h-4" /> Validate QR
            </button>
            <button 
              onClick={handleExport}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button 
              onClick={() => setIsQrModalOpen(true)}
              className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-black/10"
            >
              <QrCode className="w-4 h-4" /> Manage Access QR
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600 mb-3 sm:mb-4"><LogIn className="w-5 h-5 sm:w-6 sm:h-6" /></div>
            <div className="text-2xl sm:text-3xl font-black text-black">{stats.totalToday}</div>
            <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Check-ins Today</div>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-green-600 mb-3 sm:mb-4"><CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /></div>
            <div className="text-2xl sm:text-3xl font-black text-black">{stats.currentInGym}</div>
            <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Currently in Gym</div>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 mb-3 sm:mb-4"><Clock className="w-5 h-5 sm:w-6 sm:h-6" /></div>
            <div className="text-2xl sm:text-3xl font-black text-black">{stats.avgDuration}m</div>
            <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Duration</div>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center text-white mb-3 sm:mb-4"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /></div>
            <div className="text-2xl sm:text-3xl font-black text-black">{stats.peakHour}</div>
            <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak Hour</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Name/ID..." 
              value={filters.user}
              onChange={(e) => setFilters({...filters, user: e.target.value})}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-xs sm:text-sm focus:ring-2 focus:ring-orange-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 sm:flex-none relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={filters.date}
                onChange={(e) => setFilters({...filters, date: e.target.value})}
                className="w-full sm:w-auto pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-xs sm:text-sm focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <button 
              onClick={() => setFilters({ date: '', user: '' })}
              className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-orange-600 transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ATTENDANCE TABLE & CARDS */}
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Member</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Check In</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Check Out</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading logs...</td></tr>
                  ) : attendance.length > 0 ? (
                    attendance.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                              {row.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-black uppercase tracking-tight text-sm">{row.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold">{row.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-600 text-sm">{new Date(row.attendance_date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-green-600 font-black text-sm">
                            <LogIn className="w-3.5 h-3.5" />
                            {new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className={`flex items-center gap-2 font-black text-sm ${row.check_out ? 'text-orange-600' : 'text-slate-300'}`}>
                            <LogOut className="w-3.5 h-3.5" />
                            {row.check_out ? new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-black text-slate-600 text-sm">{row.duration_minutes ? `${row.duration_minutes}m` : '-'}</div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            row.status === 'in-gym' 
                              ? 'text-green-600 bg-green-50 border-green-100' 
                              : 'text-slate-400 bg-slate-50 border-slate-100'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No logs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="lg:hidden space-y-4">
            {loading ? (
              <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading logs...</div>
            ) : attendance.length > 0 ? (
              attendance.map((row) => (
                <div key={row.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                        {row.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-black uppercase tracking-tight text-xs truncate max-w-[120px]">{row.name}</div>
                        <div className="text-[8px] text-slate-400 font-bold">{new Date(row.attendance_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                      row.status === 'in-gym' 
                        ? 'text-green-600 bg-green-50 border-green-100' 
                        : 'text-slate-400 bg-slate-50 border-slate-100'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Check In</div>
                      <div className="flex items-center gap-1.5 text-green-600 font-black text-[10px]">
                        <LogIn className="w-3 h-3" />
                        {new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Check Out</div>
                      <div className={`flex items-center gap-1.5 font-black text-[10px] ${row.check_out ? 'text-orange-600' : 'text-slate-300'}`}>
                        <LogOut className="w-3 h-3" />
                        {row.check_out ? new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</div>
                      <div className="font-black text-slate-600 text-[10px]">{row.duration_minutes ? `${row.duration_minutes}m` : '-'}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No logs recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* QR SCAN VALIDATOR MODAL */}
        <AnimatePresence>
          {isScannerOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={stopScanner} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm shadow-2xl border border-gray-100 flex flex-col items-center">
                <button onClick={stopScanner} className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                <h3 className="text-xl sm:text-2xl font-black text-black uppercase italic tracking-tighter mb-8 text-center">Validate <span className="text-orange-600">QR Code</span></h3>
                <div className="w-full aspect-square bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden">
                  <div id="admin-qr-reader" className="w-full h-full"></div>
                </div>
                <p className="mt-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center leading-relaxed">
                  Scan a gym QR to automatically identify and activate its configuration
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* QR MANAGEMENT MODAL */}
        <AnimatePresence>
          {isQrModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQrModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm shadow-2xl border border-gray-100 flex flex-col items-center max-h-[90vh] overflow-y-auto no-scrollbar">
                <button onClick={() => setIsQrModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-black text-black uppercase italic tracking-tighter">Attendance QR</h3>
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Official Gym Entry Access</p>
                </div>

                <div className="p-4 sm:p-8 bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] border-4 border-black mb-6 sm:mb-8">
                  {selectedConfig ? (
                    <div className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px]">
                      <QRCodeSVG 
                        value={selectedConfig.qr_key} 
                        size={200}
                        style={{ width: '100%', height: '100%' }}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  ) : (
                    <div className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">Generating...</div>
                  )}
                </div>

                <div className="text-center space-y-3 sm:space-y-4 w-full">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest truncate">Config: {selectedConfig?.location_name}</p>
                    <p className="text-xs sm:text-sm font-black text-black uppercase tracking-tight truncate">{selectedConfig?.qr_key || 'Loading...'}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <div className={`w-2 h-2 rounded-full ${selectedConfig?.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                       <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedConfig?.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleRotateKey}
                      className="py-3 sm:py-4 bg-white border border-slate-200 text-black rounded-2xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCcw className="w-3 h-3" /> Rotate
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="py-3 sm:py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Download className="w-3 h-3" /> Print
                    </button>
                  </div>

                  <button 
                    onClick={handleAddConfig}
                    className="w-full py-3 sm:py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Location
                  </button>
                  
                  <div className="w-full pt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 text-left">Locations</p>
                    {qrConfigs.map(c => (
                      <div key={c.id} className="flex items-center gap-2 group/item">
                        <button 
                          onClick={() => {
                            console.log("Admin: Manual location switch to:", c.location_name);
                            setSelectedConfig(c);
                          }}
                          className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] transition-all flex items-center justify-between border ${
                            c.id === selectedConfig?.id 
                              ? 'bg-orange-50 border-orange-200 text-orange-600' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                             <span className="truncate max-w-[80px] sm:max-w-[100px]">{c.location_name}</span>
                             {c.is_active && <span className="text-[6px] sm:text-[7px] bg-green-500 text-white px-1 rounded">LIVE</span>}
                          </div>
                          <span 
                            onClick={(e) => { e.stopPropagation(); handleActivateConfig(c.id, c.is_active); }}
                            className={`text-[6px] sm:text-[7px] ${c.is_active ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-slate-400 border-slate-200'} hover:text-orange-600 border px-1.5 py-0.5 rounded-lg transition-all`}
                          >
                             {c.is_active ? 'OFF' : 'ON'}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button onClick={() => handleEditConfig(c.id, c.location_name)} className="p-1 sm:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><RefreshCcw className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteConfig(c.id, c.location_name)} className="p-1 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* PRINT-ONLY AREA */}
      <div className="only-print">
        <div className="print-page-container">
          <div className="print-content">
            <div className="print-header">
               <h1 className="print-title">NARROW <span className="text-orange-600">FITNESS</span></h1>
               <p className="print-subtitle">Official Gym Entrance QR</p>
            </div>
            
            <div className="print-qr-wrapper">
               {selectedConfig && (
                 <QRCodeSVG 
                   value={selectedConfig.qr_key} 
                   size={400}
                   level="H"
                   includeMargin={false}
                 />
               )}
            </div>

            <div className="print-footer">
              <p className="print-instructions">Scan using the Narrow Hub Mobile App</p>
              <div className="print-info-box">
                 <p className="print-key-text">{selectedConfig?.qr_key}</p>
                 <p className="print-location-text">Location: {selectedConfig?.location_name}</p>
              </div>
              <p className="print-system-tag">Narrow Fitness System v1.0 • Sri Lanka</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media screen {
          .only-print { display: none; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; background: white !important; }
          .print-page-container { width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; padding: 10mm; box-sizing: border-box; }
          .print-content { width: 100%; height: 95%; border: 10px solid black; border-radius: 30px; display: flex; flex-direction: column; align-items: center; justify-content: space-around; padding: 20px; box-sizing: border-box; }
          .print-header { text-align: center; }
          .print-title { font-size: 50px; font-weight: 900; font-style: italic; letter-spacing: -2px; margin: 0; line-height: 1; }
          .print-subtitle { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; color: #64748b; margin-top: 8px; }
          .print-qr-wrapper { padding: 30px; border: 6px solid black; border-radius: 40px; background: white; display: flex; align-items: center; justify-content: center; }
          .print-footer { text-align: center; width: 100%; }
          .print-instructions { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
          .print-info-box { background: #f8fafc; padding: 15px; border-radius: 25px; border: 2px solid #e2e8f0; display: inline-block; min-width: 280px; }
          .print-key-text { font-size: 20px; font-weight: 900; letter-spacing: 3px; margin: 0; }
          .print-location-text { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin-top: 4px; }
          .print-system-tag { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #cbd5e1; margin-top: 30px; }
          .text-orange-600 { color: #ea580c !important; }
        }
      `}</style>
    </AdminLayout>
  );
}
