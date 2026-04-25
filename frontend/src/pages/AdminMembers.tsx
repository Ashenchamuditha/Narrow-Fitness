import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { 
  Users, Search, Filter, MoreVertical, AlertCircle, 
  Edit2, Trash2, X, CheckCircle2, UserPlus // Added UserPlus icon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Notification State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false); // New
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // Form States
  const [addFormData, setAddFormData] = useState({ name: '', email: '', password: '', role: 'user' }); // New
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- FETCH MEMBERS ---
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/users');
      
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        setError(`Failed to fetch members: ${errorData.message || res.statusText}`);
      }
    } catch (err) {
      setError('Network error or server is unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // --- CLICK OUTSIDE TO CLOSE MENU ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-menu-button]') && !target.closest('[data-menu-content]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- ADD MEMBER LOGIC ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addFormData),
      });

      if (res.ok) {
        const newMember = await res.json();
        setMembers([...members, newMember]);
        setShowAddModal(false);
        setAddFormData({ name: '', email: '', password: '', role: 'user' });
        setSuccessMessage(`New member "${newMember.name}" created successfully.`);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Creation failed' }));
        alert(`Error: ${errorData.message}`);
      }
    } catch (err) {
      alert('Network error while adding member');
    } finally {
      setIsSaving(false);
    }
  };

  // --- EDIT LOGIC ---
  const handleEditClick = (member: any) => {
    setSelectedMember(member);
    setEditFormData({ name: member.name, email: member.email });
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setMembers(members.map(m => m.id === updatedUser.id ? updatedUser : m));
        setShowEditModal(false);
        setSelectedMember(null);
        setSuccessMessage(`Member "${updatedUser.name}" updated successfully.`);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Update failed' }));
        alert(`Error: ${errorData.message}`);
      }
    } catch (err) {
      alert('Network error while updating member');
    } finally {
      setIsSaving(false);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteClick = (member: any) => {
    setSelectedMember(member);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMember) return;
    const deletedName = selectedMember.name;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/users/${selectedMember.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMembers(members.filter(m => m.id !== selectedMember.id));
        setShowDeleteConfirm(false);
        setSelectedMember(null);
        setSuccessMessage(`Member "${deletedName}" has been permanently removed.`);
      } else {
        alert('Failed to delete member from database');
      }
    } catch (err) {
      alert('Network error while deleting member');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- SEARCH AND SORT LOGIC ---
  const filteredMembers = members.filter(member => 
    (member.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const orderedMembers = [...filteredMembers].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aDate - bDate;
  });

  return (
    <AdminLayout>
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-10 left-1/2 z-[100] bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-orange-500/30 flex items-center gap-3 min-w-[320px]"
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Operation Successful</p>
              <p className="text-sm font-bold text-zinc-300">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-zinc-600 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Manage Members</h1>
            <p className="text-gray-500 font-medium">System control for all gym athlete accounts.</p>
          </div>
          {/* --- ADD MEMBER BUTTON (TOP LEFT CORNER) --- */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white hover:bg-orange-600 px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all shadow-xl shadow-black/10 active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Athlete
          </button>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold" 
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-black hover:bg-gray-50 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs transition-all">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold uppercase text-xs">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined At</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Loading members...</td></tr>
              ) : orderedMembers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">No members found.</td></tr>
              ) : (
                orderedMembers.map((member, index) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xs font-black text-orange-600 uppercase">
                          {member.name ? member.name.charAt(0) : '?'}
                        </div>
                        <div className="text-sm font-bold text-black uppercase tracking-tight">{member.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-gray-400 font-medium">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        member.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button 
                          data-menu-button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenuId === member.id && (
                          <div data-menu-content className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden">
                            <button onClick={() => handleEditClick(member)} className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                              <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button onClick={() => handleDeleteClick(member)} className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD MEMBER MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-black text-black uppercase italic tracking-tighter">Add New Athlete</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-black"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddMember}>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                    <input required type="text" value={addFormData.name} onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                    <input required type="email" value={addFormData.email} onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Temporary Password</label>
                    <input required type="password" value={addFormData.password} onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Role</label>
                    <select value={addFormData.role} onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold outline-none">
                      <option value="user">User / Athlete</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <div className="px-8 py-6 bg-gray-50 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 font-black uppercase tracking-widest text-xs text-gray-500 hover:text-black">Cancel</button>
                  <button type="submit" disabled={isSaving} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 disabled:opacity-50 transition-all">
                    {isSaving ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-black text-black uppercase italic tracking-tighter">Edit Member</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-black"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
                </div>
              </div>
              <div className="px-8 py-6 bg-gray-50 flex gap-3 justify-end">
                <button onClick={() => setShowEditModal(false)} className="px-6 py-3 font-black uppercase tracking-widest text-xs text-gray-500 hover:text-black">Cancel</button>
                <button onClick={handleSaveEdit} disabled={isSaving} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 disabled:opacity-50 transition-all">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter mb-2">Are you sure?</h2>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">You are about to delete <span className="font-bold text-black uppercase">{selectedMember.name}</span>. This action cannot be undone.</p>
              </div>
              <div className="px-8 py-6 bg-gray-50 flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-6 py-4 font-black uppercase tracking-widest text-xs text-gray-500 hover:text-black bg-white rounded-xl border border-gray-200">Cancel</button>
                <button onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1 bg-red-600 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 disabled:opacity-50 transition-all">
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}