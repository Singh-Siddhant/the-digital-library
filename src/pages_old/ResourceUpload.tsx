import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import axios from 'axios';
import { motion } from 'motion/react';
import { Upload, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ResourceUpload() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('GATE');
  const [branch, setBranch] = useState('Computer Science');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [resourceType, setResourceType] = useState('note');
  const [contentType, setContentType] = useState('pdf');
  const [textContent, setTextContent] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(0);

  const categories = ["GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"];
  const branches = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"];
  const contentTypes = [
    { value: 'link', label: 'Direct Link' },
    { value: 'pdf', label: 'PDF File' },
    { value: 'pdf-gdrive', label: 'PDF (Google Drive)' },
    { value: 'video', label: 'Video File' },
    { value: 'video-gdrive', label: 'Video (Google Drive)' },
    { value: 'text', label: 'Text Content' }
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertCircle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Login Required</h2>
        <p className="text-slate-400 mb-6">You must be logged in to contribute resources to the library.</p>
        <button 
          onClick={() => navigate('/login')}
          className="px-8 py-3 rounded-full bg-cyan-500 text-white font-bold"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (['pdf', 'video'].includes(contentType) && !file) return setError('Please select a file');
    if (['link', 'pdf-gdrive', 'video-gdrive'].includes(contentType) && !linkUrl) return setError('Please provide the external URL/Link');
    if (!title) return setError('Please provide a resource title');

    setLoading(true);
    setError('');

    try {
      let fileUrl = '';
      let fileName = '';

      // 1. Upload file if applicable
      if (['pdf', 'video'].includes(contentType) && file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await axios.post('/api/upload', formData);
        fileUrl = uploadRes.data.fileUrl;
        fileName = uploadRes.data.fileName;
      }

      // 2. Save metadata to Firestore
      await addDoc(collection(db, 'resources'), {
        title,
        description,
        fileUrl: ['link', 'pdf-gdrive', 'video-gdrive'].includes(contentType) ? linkUrl : fileUrl,
        fileName,
        textContent: contentType === 'text' ? textContent : '',
        category,
        branch,
        resourceType,
        contentType,
        isPaid,
        price: isPaid ? Number(price) : 0,
        uploadedBy: user.uid,
        uploaderName: userProfile?.name || 'Anonymous',
        isVerified: false, 
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => navigate('/explore'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-4">Submission Received</h2>
        <p className="text-slate-400 mb-8">
          Your resource has been submitted. Admin will verify it shortly. Paid resources require payment verification.
        </p>
        <p className="text-sm text-slate-500">Redirecting to Explore...</p>
      </div>
    );
  }

  return (
    <div className="immersive-bg min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Upload Resource</h1>
          <p className="text-slate-500">Share knowledge with the student community.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6 pb-20">
          <div className="glass-card p-10 space-y-8">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => setResourceType('note')}
                className={`py-3 rounded-xl font-bold text-sm transition-all border ${resourceType === 'note' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500'}`}
              >
                Study Note
              </button>
              <button 
                type="button" 
                onClick={() => setResourceType('pyq')}
                className={`py-3 rounded-xl font-bold text-sm transition-all border ${resourceType === 'pyq' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500'}`}
              >
                Previous Year Paper
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Content Format</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all"
              >
                {contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Dynamic Input based on Format */}
            {['pdf', 'video'].includes(contentType) && (
              <div className="relative">
                <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${file ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/5 hover:bg-white/[0.02] bg-[#0A0C16]'}`}>
                  <div className="flex flex-col items-center justify-center">
                    {file ? (
                      <>
                        <File className="w-12 h-12 text-cyan-400 mb-3" />
                        <p className="text-sm text-cyan-300 font-bold">{file.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-2">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-slate-700 mb-3" />
                        <p className="text-sm text-slate-500 font-bold">Select {contentType.toUpperCase()} file</p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold mt-2">Max 10MB</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept={contentType === 'pdf' ? '.pdf' : '.mp4,.mov,.avi'}
                  />
                </label>
              </div>
            )}

            {contentType === 'text' && (
              <textarea
                required
                rows={10}
                placeholder="Type your content directly here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full p-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all font-mono text-sm leading-relaxed"
              />
            )}

            {['link', 'pdf-gdrive', 'video-gdrive'].includes(contentType) && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource URL / Link</label>
                <input
                  required
                  type="url"
                  placeholder={contentType === 'link' ? "https://example.com/notes.pdf" : "https://drive.google.com/file/d/..."}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all font-mono text-sm"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Thermodynamics Formula Sheet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Main Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource Description</label>
              <textarea
                rows={3}
                placeholder="Briefly describe what topics this resource covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Branch / Specialty</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all"
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Paid Resource Section */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Resource Value</h3>
                  <p className="text-xs text-slate-500">Is this a paid premium resource?</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isPaid ? 'bg-cyan-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPaid ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              
              {isPaid && (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-600">Price (INR)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400"
                      placeholder="99"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-wide">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full h-14 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  INITIATING UPLOAD...
                </>
              ) : (
                'SUBMIT MODULE'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
