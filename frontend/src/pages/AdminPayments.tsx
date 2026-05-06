import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, Search, Filter, Download, Plus, QrCode, CheckCircle, XCircle, Scan, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { recordCashPayment } from '../services/paymentService';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [wallQR, setWallQR] = useState('');

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Duration Stats
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitStats, setVisitStats] = useState({ 
    totalVisitors: 0, 
    paidCount: 0, 
    unpaidCount: 0, 
    details: { visitors: [], paid: [], unpaid: [] } 
  });
  const [drillDown, setDrillDown] = useState<{ title: string, members: any[] } | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const [showWallQRModal, setShowWallQRModal] = useState(false);

  useEffect(() => {
    fetchData();
    fetchVisitStats();
  }, []);

  const fetchData = async () => {
    try {
      const payRes = await axios.get('/api/admin/payments');
      setPayments(payRes.data);
      
      const memRes = await axios.get('/api/admin/members');
      setMembers(memRes.data);
      
      const planRes = await axios.get('/api/admin/pricing');
      setPlans(planRes.data);
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordCashPayment(parseInt(selectedUserId), parseInt(selectedPlanId), parseFloat(amountPaid));
      toast.success("Cash payment recorded successfully!");
      setShowManualModal(false);
      fetchData();
    } catch (err) {
      toast.error("Error recording payment");
    }
  };

  const generateWallQR = async () => {
    try {
      const url = `${window.location.origin}/wall-pay`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setWallQR(qrDataUrl);
      setShowWallQRModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVisitStats = async () => {
    setIsStatsLoading(true);
    try {
      const res = await axios.get(`/api/admin/stats/visits-payments?startDate=${startDate}&endDate=${endDate}`);
      setVisitStats(res.data);
    } catch (err) {
      toast.error("Failed to fetch visit stats");
    } finally {
      setIsStatsLoading(false);
    }
  };

  // QR Scanning Logic
  const handleScanResult = async (decodedText: string) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const userIdStr = decodedText.replace('NF_USER_', '');
      const userId = parseInt(userIdStr);

      if (isNaN(userId)) {
        toast.error("Invalid Member QR");
        setIsScanning(false);
        return;
      }

      // Fetch User & Membership info
      const res = await axios.get(`/api/member/membership/${userId}`);
      const membership = res.data;

      if (!membership) {
        toast.error("Member details not found.");
        setIsScanning(false);
        return;
      }

      toast.success(`Identified: ${membership.name || 'Member'}`);
      
      // Pre-fill manual modal
      setSelectedUserId(userId.toString());
      setSelectedPlanId(membership.package_id?.toString() || '');
      
      // Calculate amount: Package Price + Balance Due (if positive)
      const due = parseFloat(membership.balance_due || '0');
      const price = parseFloat(membership.package_price || '0');
      setAmountPaid(Math.max(0, price + due).toString());

      stopScanner();
      setIsScannerOpen(false);
      setIsScanning(false);
      setShowManualModal(true);

    } catch (err) {
      console.error("Scan processing error", err);
      toast.error("Failed to fetch member details.");
      setIsScanning(false);
    }
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("member-scanner");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          handleScanResult,
          () => {}
        );
      } catch (err) {
        toast.error("Camera error: " + err);
        setIsScannerOpen(false);
      }
    }, 500);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScannerOpen(false);
  };

  return (
    <AdminLayout>
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-6 mb-10 text-center lg:text-left">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-black uppercase italic tracking-tighter">
            Payments <span className="text-orange-600">& Revenue</span>
          </h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Manage transactions and manual entries.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 w-full lg:w-auto">
          <button 
            onClick={startScanner}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-sm"
          >
            <Scan className="w-4 h-4" />
            Scan Member
          </button>
          <button 
            onClick={() => setShowManualModal(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-lg shadow-gray-200"
          >
            <Plus className="w-4 h-4" />
            Cash Entry
          </button>
          <button 
            onClick={generateWallQR}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-orange-500 text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-lg shadow-orange-100"
          >
            <QrCode className="w-4 h-4" />
            Wall QR
          </button>
        </div>
      </div>

      {/* QR SCANNER MODAL */}
      <AnimatePresence>
        {isScannerOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm shadow-2xl border border-gray-100 flex flex-col items-center">
              <button onClick={stopScanner} className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              <h3 className="text-xl sm:text-2xl font-black text-black uppercase italic tracking-tighter mb-8 text-center">Scan <span className="text-orange-600">Member QR</span></h3>
              <div className="w-full aspect-square bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden relative">
                <div id="member-scanner" className="w-full h-full"></div>
                {isScanning && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-6 text-center">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-orange-500 mb-2" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Processing...</span>
                  </div>
                )}
              </div>
              <p className="mt-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center leading-relaxed">
                Scan the member's Identity QR to fetch payment details.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- VISIT & PAYMENT ANALYTICS --- */}
      <div className="mb-10 bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
               <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">Visit Intelligence</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Attendance vs Payment status</p>
               </div>
               <button 
                  onClick={fetchVisitStats} 
                  disabled={isStatsLoading} 
                  className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-orange-500 hover:bg-orange-600 hover:text-white transition-all shadow-sm group active:scale-95"
                  title="Refresh Intelligence"
               >
                  <RefreshCw className={`w-5 h-5 ${isStatsLoading ? 'animate-spin' : ''}`} />
               </button>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-8">
               <div className="flex-1">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm">
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Range From</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] sm:text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Range To</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] sm:text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full lg:w-auto">
                  <button onClick={() => setDrillDown({ title: 'Total Visitors', members: visitStats.details?.visitors || [] })} className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-3xl backdrop-blur-md text-left hover:bg-white/10 transition-all active:scale-95 group/card">
                     <div className="text-2xl sm:text-3xl font-black text-white mb-1">{visitStats.totalVisitors}</div>
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover/card:text-orange-500 transition-colors">Visitors</div>
                  </button>
                  <button onClick={() => setDrillDown({ title: 'Fully Paid Visitors', members: visitStats.details?.paid || [] })} className="bg-emerald-500/10 border border-emerald-500/20 p-4 sm:p-5 rounded-3xl backdrop-blur-md text-left hover:bg-emerald-500/20 transition-all active:scale-95 group/card">
                     <div className="text-2xl sm:text-3xl font-black text-emerald-500 mb-1">{visitStats.paidCount}</div>
                     <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest group-hover/card:text-white transition-colors">Fully Paid</div>
                  </button>
                  <button onClick={() => setDrillDown({ title: 'Unpaid Visitors', members: visitStats.details?.unpaid || [] })} className="bg-red-500/10 border border-red-500/20 p-4 sm:p-5 rounded-3xl backdrop-blur-md text-left hover:bg-red-500/20 transition-all active:scale-95 group/card">
                     <div className="text-2xl sm:text-3xl font-black text-red-500 mb-1">{visitStats.unpaidCount}</div>
                     <div className="text-[8px] font-black text-red-400 uppercase tracking-widest group-hover/card:text-white transition-colors">Unpaid</div>
                  </button>
               </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-orange-600/5 rounded-full blur-3xl" />
      </div>

      {/* --- DRILL DOWN MODAL --- */}
      <AnimatePresence>
        {drillDown && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 sm:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-black">{drillDown.title}</h3>
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Directory</p>
                </div>
                <button onClick={() => setDrillDown(null)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 hover:text-red-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 no-scrollbar">
                {drillDown.members.length > 0 ? drillDown.members.map((member, i) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} className="flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-orange-500 transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-orange-500 uppercase shadow-sm group-hover:scale-110 transition-transform">{member.name[0]}</div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1 truncate">{member.name}</div>
                      <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 lowercase truncate">{member.email}</div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No members detected.</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 text-center">
                <button onClick={() => setDrillDown(null)} className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-lg">Close View</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WALL QR MODAL */}
      <AnimatePresence>
        {showWallQRModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:bg-white print:p-0">
            <motion.div 
              id="printable-qr"
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 w-full max-w-md shadow-2xl border border-gray-100 flex flex-col items-center text-center max-h-[95vh] overflow-y-auto no-scrollbar print:max-h-none print:overflow-visible print:shadow-none print:border-none print:rounded-none print:w-full print:p-20"
            >
              <button onClick={() => setShowWallQRModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-all no-print"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              
              <div className="mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-orange-600 shadow-inner print:bg-transparent print:shadow-none">
                  <QrCode className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-black uppercase italic tracking-tighter">Wall <span className="text-orange-600">Payment QR</span></h3>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Display at Gym Entrance</p>
              </div>

              <div className="p-4 sm:p-8 bg-slate-50 rounded-[1.5rem] sm:rounded-[2.5rem] border-4 border-black mb-6 sm:mb-8 flex items-center justify-center group relative overflow-hidden print:bg-white print:border-8">
                <img src={wallQR} alt="Wall QR" className="w-48 h-48 sm:w-64 sm:h-64 rounded-xl relative z-10" />
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-left w-full px-2">
                <div className="flex gap-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-black text-white flex items-center justify-center text-[8px] sm:text-[10px] font-black shrink-0">1</div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-wide">Web: Opens Wall-Pay portal.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center text-[8px] sm:text-[10px] font-black shrink-0">2</div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-wide">App: Auto-identifies & pays.</p>
                </div>
              </div>

              <button 
                onClick={() => window.print()} 
                className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-orange-600 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 no-print"
              >
                <Download className="w-4 h-4" /> Print Station QR
              </button>
              
              <p className="hidden print:block mt-20 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Narrow Fitness Management System</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAYMENTS LIST */}
      <div className="space-y-4">
        {/* Desktop View Table */}
        <div className="hidden lg:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trans ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Package</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((pay, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-[9px] font-black text-black uppercase tracking-widest">#{pay.payhere_payment_id || `PAY-${pay.id}`}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-black uppercase tracking-tight">{pay.member_name}</div>
                      <div className="text-[9px] font-medium text-gray-400 lowercase">{pay.member_email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black uppercase text-gray-500">{pay.package_name}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-orange-600">LKR {pay.amount_paid}</div>
                      {parseFloat(pay.balance_due) > 0 && <div className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Due: LKR {pay.balance_due}</div>}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{pay.payment_method}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        pay.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a href={`/api/payments/receipt/${pay.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-700">
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View Cards */}
        <div className="lg:hidden space-y-4">
          {payments.map((pay, i) => (
            <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">#{pay.payhere_payment_id || `PAY-${pay.id}`}</div>
                  <div className="font-black text-black uppercase tracking-tight text-xs truncate">{pay.member_name}</div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                  pay.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {pay.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
                <div>
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Package</div>
                  <div className="text-[10px] font-black text-gray-600 uppercase truncate">{pay.package_name}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount</div>
                  <div className="text-[10px] font-black text-orange-600">LKR {pay.amount_paid}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Method</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase">{pay.payment_method}</div>
                </div>
                <div className="flex items-end">
                   <a href={`/api/payments/receipt/${pay.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-lg">
                      <Download className="w-3 h-3" /> Receipt
                   </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <h2 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tighter italic mb-6">Manual Cash Entry</h2>
            <form onSubmit={handleManualPayment} className="space-y-5 sm:space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Member</label>
                <select 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500 transition-all appearance-none"
                  required
                >
                  <option value="">Choose User</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Plan</label>
                <select 
                  value={selectedPlanId} 
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500 transition-all appearance-none"
                  required
                >
                  <option value="">Choose Plan</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (LKR)</label>
                <input 
                  type="number" 
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setShowManualModal(false)} className="order-2 sm:order-1 flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-black text-white hover:bg-orange-600 transition-all shadow-xl">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr, #printable-qr * {
            visibility: visible;
          }
          #printable-qr {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
