import React, { useState, useEffect } from 'react';
import MemberLayout from '../components/MemberLayout';
import { 
  Dumbbell, Plus, ChevronRight, FileText, 
  UploadCloud, X, Clipboard, CheckCircle2, 
  Loader2, Trash2, Bot, Download, Zap, Edit2, Info, FileStack, Image as ImageIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function MemberWorkout() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const navigate = useNavigate();

  // Form State
  const [uploadType, setUploadType] = useState<'file' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => { fetchWorkouts(); }, []);

  const fetchWorkouts = async () => {
    const userStr = localStorage.getItem('narrow_fitness_user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const userId = user.id || user.userid; 

    try {
      setLoading(true);
      const res = await fetch(`/api/member/workouts/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data);
      }
    } finally { setLoading(false); }
  };

  const handleActivate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const userStr = localStorage.getItem('narrow_fitness_user');
    const user = JSON.parse(userStr!);
    const userId = user.id || user.userid;

    if (!window.confirm("Set this as your active workout plan? AI Assistant will use this for coaching.")) return;

    try {
      const res = await fetch(`/api/member/workouts/activate/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        alert("🔥 Workout activated! AI Assistant is now synced with this plan.");
        window.location.reload(); 
      }
    } catch (err) { alert("Failed to activate workout"); }
  };

  const handleEdit = async (e: React.MouseEvent, plan: any) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/member/workouts/detail/${plan.id}`);
      if (!res.ok) throw new Error("Fetch failed");
      const fullData = await res.json();

      setEditingId(fullData.id);
      setTitle(fullData.title);
      setUploadType(fullData.source_type);
      
      if (fullData.source_type === 'text') {
        setPastedText(fullData.content);
        setSelectedFile(null);
      } else {
        setSelectedFile({ name: fullData.file_name, data: fullData.content });
        setPastedText('');
      }
      setIsModalOpen(true);
    } catch (err) { alert("Error loading workout details for editing."); }
  };

  const handleReadPlan = async (id: number) => {
    try {
      const res = await fetch(`/api/member/workouts/detail/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingPlan(data);
      }
    } catch (err) { alert("Error opening workout"); }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete?")) return;
    try {
      const res = await fetch(`/api/member/workouts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("🗑️ Workout successfully removed from the vault.");
        window.location.reload(); 
      }
    } catch (err) { alert("Delete failed"); }
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    const userStr = localStorage.getItem('narrow_fitness_user');
    const user = JSON.parse(userStr!);
    const userId = user.id || user.userid;

    setIsScanning(true);
    try {
      const url = editingId ? `/api/member/workouts/${editingId}` : '/api/member/workouts';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          title,
          sourceType: uploadType,
          content: uploadType === 'file' ? selectedFile?.data : pastedText,
          fileName: uploadType === 'file' ? selectedFile?.name : null
        })
      });

      if (res.ok) {
        alert(editingId ? "🔄 Workout successfully updated!" : "✅ Workout added to your vault!");
        handleCloseModal();
        window.location.reload(); 
      } else {
          alert("❌ Error saving workout. Please try again.");
      }
    } catch (err) {
        alert("❌ Connection error.");
    } finally { setIsScanning(false); }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setTitle(''); setPastedText(''); setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedFile({ name: file.name, data: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const isPDF = (fileName: string) => fileName?.toLowerCase().endsWith('.pdf');
  const isDOC = (fileName: string) => fileName?.toLowerCase().endsWith('.doc') || fileName?.toLowerCase().endsWith('.docx');
  const isImage = (fileName: string) => fileName?.toLowerCase().endsWith('.png') || fileName?.toLowerCase().endsWith('.jpg') || fileName?.toLowerCase().endsWith('.jpeg');

  return (
    <MemberLayout>
      <div className="min-h-screen bg-[#f8fafc] -mt-10 pt-10 px-2 sm:px-0 pb-20">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 px-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">Training vault</h1>
            <p className="text-slate-500 font-bold text-[10px] tracking-[0.2em] mt-2">Archive and manage your workout routines</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 bg-black text-white hover:bg-orange-600 px-8 py-4 rounded-2xl font-black text-xs transition-all shadow-xl shadow-black/10">
            <Plus className="w-5 h-5" /> Add workout
          </button>
        </div>

        {/* --- AI TIP BOX --- */}
        <div className="max-w-7xl mx-auto px-4 mb-10">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-start gap-5 shadow-sm">
            <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
              <Zap className="w-6 h-6 fill-orange-600" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 mb-1 tracking-widest">Ai coaching tip</h4>
              <p className="text-sm font-bold text-slate-700 leading-relaxed tracking-tight">
                For 100% accurate AI coaching, prioritize pdfs or manual paste. JPG/PNG images are supported but may have limited scan precision.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-500" /></div>
            ) : workouts.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center text-slate-300">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <h3 className="text-xl font-black italic tracking-tighter">No workouts found</h3>
              </div>
            ) : (
              workouts.map((plan) => (
                <div key={plan.id} onClick={() => handleReadPlan(plan.id)} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group ${plan.is_active ? 'border-orange-500 ring-4 ring-orange-50' : 'border-slate-100 hover:border-orange-300 shadow-sm'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-colors ${plan.is_active ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-slate-50 text-slate-400'}`}>
                        {plan.source_type === 'text' ? <Clipboard className="w-8 h-8" /> : isImage(plan.file_name) ? <ImageIcon className="w-8 h-8" /> : <FileStack className="w-8 h-8" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-black text-slate-900 italic tracking-tighter">{plan.title}</h3>
                           {plan.is_active && <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-md tracking-widest border border-orange-200 animate-pulse">Active now</span>}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold tracking-widest">Type: {plan.source_type} • Linked on {new Date(plan.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {!plan.is_active && (
                         <button onClick={(e) => handleActivate(e, plan.id)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black tracking-widest hover:bg-orange-600 transition-all">Set active</button>
                       )}
                       <button onClick={(e) => handleEdit(e, plan)} className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                       <button onClick={(e) => handleDelete(e, plan.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                       <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-orange-500 ml-2" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* SIDEBAR */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl h-fit sticky top-28 overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                  <Bot className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter">Ai coach sync</h3>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-6 leading-relaxed italic">The AI coach uses your 'Active' workout to customize your training advice.</p>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center shadow-inner">
                 <p className="text-[9px] font-black text-slate-500 tracking-widest mb-2 uppercase">Selected routine</p>
                 <h4 className="text-sm font-black text-orange-500 italic truncate">{workouts.find(p => p.is_active)?.title || 'No active workout'}</h4>
              </div>
              <Link to="/member/ai-assistant" className="w-full mt-10 py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all shadow-xl">
                Consult coach <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <Dumbbell className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 rotate-12 group-hover:text-orange-500/10 transition-all duration-700" />
          </div>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter">
                    {editingId ? 'Update workout' : 'New workout'}
                  </h2>
                  <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSaveWorkout} className="space-y-6">
                  <input required placeholder="Workout title" value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold focus:border-orange-500 outline-none transition-all" />
                  
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button type="button" onClick={()=>setUploadType('file')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${uploadType === 'file' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400'}`}>Upload file</button>
                    <button type="button" onClick={()=>setUploadType('text')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${uploadType === 'text' ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400'}`}>Paste text</button>
                  </div>

                  {uploadType === 'file' ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center relative hover:border-orange-500 transition-colors bg-slate-50 shadow-inner">
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <UploadCloud className="mx-auto mb-3 text-orange-500 w-10 h-10" />
                      <p className="text-[10px] font-black text-slate-500 tracking-widest">
                        {selectedFile ? selectedFile.name : 'PDF, PNG, JPG, or DOC (2MB)'}
                      </p>
                    </div>
                  ) : (
                    <textarea required value={pastedText} onChange={(e)=>setPastedText(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-6 py-5 font-bold h-44 focus:border-orange-500 outline-none resize-none shadow-inner" placeholder="Paste workout routine details here..." />
                  )}

                  <button type="submit" disabled={isScanning} className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-orange-600">
                    {isScanning ? <Loader2 className="animate-spin w-5 h-5" /> : <><CheckCircle2 className="w-5 h-5" /> {editingId ? 'Save changes' : 'Add to vault'}</>}
                  </button>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- READER MODAL --- */}
      <AnimatePresence>
        {viewingPlan && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-orange-500 shadow-lg"><FileStack className="w-6 h-6" /></div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">{viewingPlan.title}</h2>
                      <span className="text-[9px] font-black text-slate-400 tracking-widest mt-1">Workout ID: #{viewingPlan.id}</span>
                   </div>
                </div>
                <button onClick={() => setViewingPlan(null)} className="p-3 bg-slate-50 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="flex-1 overflow-hidden bg-[#fafafa]">
                {viewingPlan.source_type === 'text' ? (
                  <div className="p-12 h-full overflow-y-auto">
                    <div className="whitespace-pre-wrap font-bold text-slate-700 leading-relaxed bg-white border border-slate-200 p-12 rounded-[2.5rem] shadow-inner min-h-full max-w-4xl mx-auto italic">
                       "{viewingPlan.content}"
                    </div>
                  </div>
                ) : isPDF(viewingPlan.file_name) ? (
                  <iframe src={`${viewingPlan.content}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                ) : isImage(viewingPlan.file_name) ? (
                  <div className="p-10 h-full overflow-y-auto flex justify-center items-start">
                    <img src={viewingPlan.content} className="max-w-full rounded-[2rem] shadow-2xl border-8 border-white" alt="Workout Details" />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12">
                     <FileText className="w-20 h-20 text-orange-500 mb-8" />
                     <h3 className="text-3xl font-black text-slate-900 italic mb-4 tracking-tighter">Document ready</h3>
                     <p className="text-slate-500 text-xs font-bold mb-10 max-w-sm">Word documents require a local reader. Download below to review your workout.</p>
                     <a href={viewingPlan.content} download={viewingPlan.file_name} className="px-12 py-5 bg-black text-white rounded-2xl font-black text-xs hover:bg-orange-600 transition-all shadow-2xl flex items-center gap-4">
                        <Download className="w-5 h-5" /> Download to view
                     </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MemberLayout>
  );
}