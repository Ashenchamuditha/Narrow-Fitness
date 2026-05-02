import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, Search, Filter, Download, Plus, QrCode, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { recordCashPayment } from '../services/paymentService';
import QRCode from 'qrcode';

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [wallQR, setWallQR] = useState('');

  useEffect(() => {
    fetchData();
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
      const qrDataUrl = await QRCode.toDataURL(url);
      setWallQR(qrDataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Payments & Revenue</h1>
          <p className="text-gray-500 font-medium">Manage transactions and manual entries.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-gray-200"
          >
            <Plus className="w-4 h-4" />
            Complete with Cash
          </button>
          <button 
            onClick={generateWallQR}
            className="flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-orange-100"
          >
            <QrCode className="w-4 h-4" />
            Wall QR
          </button>
        </div>
      </div>

      {wallQR && (
        <div className="mb-10 bg-white p-8 rounded-[2.5rem] border-2 border-orange-100 flex flex-col items-center">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4">Narrow Wall QR</h3>
          <img src={wallQR} alt="Wall QR" className="w-48 h-48 mb-4 border-8 border-black rounded-3xl" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center max-w-xs">
            Print this QR and paste it on the gym wall. Members can scan it to identify themselves and pay via PayHere.
          </p>
          <button onClick={() => setWallQR('')} className="mt-4 text-xs font-black text-orange-500 uppercase tracking-widest">Close QR</button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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
                  <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-widest">#PAY-{pay.id}</td>
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
                    <a 
                      href={`/api/payments/receipt/${pay.id}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-700"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-black uppercase tracking-tighter italic mb-6">Manual Cash Entry</h2>
            <form onSubmit={handleManualPayment} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Member</label>
                <select 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500 transition-all"
                  required
                >
                  <option value="">Choose User</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Plan</label>
                <select 
                  value={selectedPlanId} 
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500 transition-all"
                  required
                >
                  <option value="">Choose Plan</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - LKR {p.price}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount Received (LKR)</label>
                <input 
                  type="number" 
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowManualModal(false)} className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-black text-white hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
