import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { CreditCard, Search, Filter, Download } from 'lucide-react';

export default function AdminPayments() {
  const transactions = [
    { id: 'TXN-001', member: 'John Doe', amount: '$49.00', date: '2024-03-25', status: 'Completed' },
    { id: 'TXN-002', member: 'Sarah Jenkins', amount: '$89.00', date: '2024-03-24', status: 'Completed' },
    { id: 'TXN-003', member: 'Marcus Thorne', amount: '$29.00', date: '2024-03-22', status: 'Failed' },
    { id: 'TXN-004', member: 'Elena Vance', amount: '$49.00', date: '2024-03-20', status: 'Completed' },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Payments & Revenue</h1>
          <p className="text-gray-500 font-medium">Track your gym's financial transactions.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-black hover:bg-gray-50 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((txn, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-black uppercase tracking-widest">{txn.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-black uppercase tracking-tight">{txn.member}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-orange-600">{txn.amount}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-500">{txn.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      txn.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
