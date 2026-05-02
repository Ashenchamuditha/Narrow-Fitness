import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react'; // Added AnimatePresence for smoother list transitions
import { Plus, Trash2, UserPlus, Image as ImageIcon, Briefcase, FileText, Edit2, X, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { confirmAction } from '../lib/toastUtils';
import AdminLayout from '../components/AdminLayout';

interface Trainer {
  id: number;
  name: string;
  description: string;
  image_url: string;
  contact?: string;
}

export default function AdminTrainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    contact: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Compress image before converting to base64
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > 800) {
              height = Math.round((height * 800) / width);
              width = 800;
            }
          } else {
            if (height > 800) {
              width = Math.round((width * 800) / height);
              height = 800;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedData);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/admin/trainers');
      const data = await res.json();
      setTrainers(data);
    } catch (err) {
      console.error('Failed to fetch trainers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Logic to filter trainers based on search term
  const filteredTrainers = trainers.filter(trainer => 
    trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = formData.image_url;
      
      if (imageFile) {
        const compressedImage = await compressImage(imageFile);
        imageUrl = compressedImage;
      } else if (editingId && formData.image_url && formData.image_url.startsWith('data:')) {
        imageUrl = null as any; 
      }
      
      const url = editingId ? `/api/admin/trainers/${editingId}` : '/api/admin/trainers';
      const method = editingId ? 'PUT' : 'POST';
      
      const payload: any = { 
        name: formData.name,
        description: formData.description,
        contact: formData.contact
      };
      
      if (imageUrl) {
        payload.image_url = imageUrl;
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setFormData({ name: '', description: '', image_url: '', contact: '' });
        setImageFile(null);
        setIsAdding(false);
        setEditingId(null);
        fetchTrainers();
        toast.success('Trainer saved successfully!');
      }
    } catch (err) {
      toast.error(`Error: ${err}`);
    }
  };

  const handleEdit = (trainer: Trainer) => {
    setFormData({
      name: trainer.name,
      description: trainer.description,
      image_url: trainer.image_url,
      contact: trainer.contact || ''
    });
    setImageFile(null);
    setEditingId(trainer.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to form
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', image_url: '', contact: '' });
    setImageFile(null);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmAction('Are you sure you want to delete this trainer?'))) return;
    try {
      const res = await fetch(`/api/admin/trainers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTrainers();
      }
    } catch (err) {
      console.error('Failed to delete trainer:', err);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Manage Trainers</h1>
          <p className="text-gray-500 font-medium">Add, edit, or remove trainers from your team.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search trainers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-bold text-sm shadow-sm transition-all"
            />
          </div>

          <button 
            onClick={() => isAdding ? handleCancel() : setIsAdding(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-105 shadow-lg shadow-black/10"
          >
            {isAdding ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Trainer</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mb-10"
        >
          <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mb-6 flex items-center gap-2">
            {editingId ? <Edit2 className="w-6 h-6 text-orange-500" /> : <UserPlus className="w-6 h-6 text-orange-500" />}
            {editingId ? 'Edit Trainer' : 'New Trainer'} Details
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                <div className="relative">
                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 font-bold"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Trainer Image</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setImageFile(file);
                    }}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Contact</label>
                <div className="relative">
                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 font-bold"
                    placeholder="e.g. +1-800-123-4567"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                  <textarea
                    required
                    rows={7}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 font-bold resize-none"
                    placeholder="Experience and background..."
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-orange-600 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
              >
                {editingId ? 'Update Trainer' : 'Save Trainer'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest">Loading trainers...</div>
        ) : filteredTrainers.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest bg-white rounded-3xl border border-dashed border-gray-200">
            {searchTerm ? `No trainers found matching "${searchTerm}"` : "No trainers added yet."}
          </div>
        ) : (
          filteredTrainers.map((trainer) => (
            <motion.div 
              layout
              key={trainer.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm group"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={trainer.image_url} 
                  alt={trainer.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => handleEdit(trainer)}
                    className="p-3 bg-white/90 backdrop-blur-sm text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(trainer.id)}
                    className="p-3 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-black uppercase italic tracking-tighter mb-3">{trainer.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-3">{trainer.description}</p>
                {trainer.contact && (
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Contact: {trainer.contact}</p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
