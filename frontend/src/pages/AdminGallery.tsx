import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { 
  Plus, Trash2, Loader2, X, Image as ImageIcon, 
  Edit2, Search, Camera 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { confirmAction } from '../lib/toastUtils';

export default function AdminGallery() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track if we are editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', image: '' });

  useEffect(() => { fetchGallery(); }, []);

  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/admin/gallery');
      const data = await res.json();
      setImages(data);
    } finally { setLoading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const openEditModal = (img: any) => {
    setEditingId(img.id);
    setFormData({
      title: img.title,
      description: img.description,
      image: img.image_url // Keep existing image preview
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ title: '', description: '', image: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/admin/gallery/${editingId}` : '/api/admin/gallery';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          image_url: formData.image
        })
      });

      if (res.ok) {
        closeModal();
        fetchGallery();
      }
    } finally { 
      setIsUploading(false); 
    }
  };

  // Filter images based on search term
  const filteredImages = images.filter(img => 
    img.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    img.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Gym <span className="text-orange-600">Gallery</span></h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Website Visual Content</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* --- SEARCH BAR --- */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-black text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl">
            <Plus className="w-4 h-4" /> Add New Visual
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600 w-8 h-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2">
          {filteredImages.map((img) => (
            <motion.div layout key={img.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm group relative">
              <div className="aspect-square overflow-hidden bg-slate-100 relative">
                <img src={img.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                
                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                  <button onClick={() => openEditModal(img)} className="p-2.5 bg-white text-slate-900 rounded-xl hover:bg-orange-500 hover:text-white transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={async () => { if(await confirmAction("Delete permanently?")) { await fetch(`/api/admin/gallery/${img.id}`, {method: 'DELETE'}); fetchGallery(); } }} 
                    className="p-2.5 bg-white text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-slate-900 uppercase text-xs truncate">{img.title}</h3>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-bold uppercase">{img.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              onSubmit={handleSubmit} 
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">
                  {editingId ? 'Edit Visual' : 'Add Gallery Item'}
                </h2>
                <button type="button" onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
              </div>

              <div className="space-y-5">
                {/* Image Upload/Preview - Always visible and editable */}
                <div className="relative border-2 border-dashed border-slate-200 rounded-3xl h-48 flex flex-col items-center justify-center overflow-hidden bg-slate-50 group">
                  {formData.image ? (
                    <>
                      <img src={formData.image} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-black uppercase">Change Photo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                      <Camera className="w-8 h-8 text-slate-300 mb-2" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">Select Gym Photo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Visual Title</label>
                  <input required placeholder="e.g. Morning Yoga Session" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Description</label>
                  <textarea required placeholder="Describe what's happening in this photo..." className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <button disabled={isUploading} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-xl">
                  {isUploading ? <Loader2 className="animate-spin" /> : editingId ? "Update Content" : "Publish to Website"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}