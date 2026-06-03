'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon, 
  BookOpen 
} from 'lucide-react';
import Link from 'next/link';

export default function ResourceUpload() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('GATE');
  const [branch, setBranch] = useState('Computer Science');
  const [semester, setSemester] = useState('Semester 1');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [resourceType, setResourceType] = useState('note'); // note or pyq
  const [contentType, setContentType] = useState('pdf-gdrive'); // pdf-gdrive or video-gdrive
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(0);

  const categories = ["GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"];
  const branches = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"];
  const semesters = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!linkUrl) {
      return setError('Google Drive sharing URL / link is required.');
    }
    if (!linkUrl.includes('drive.google.com') && !linkUrl.includes('docs.google.com')) {
      return setError('Validation failed: A valid Google Drive or Google Docs sharing link is required.');
    }
    if (!title) {
      return setError('Please provide a descriptive resource title.');
    }

    setLoading(true);

    try {
      const docData: any = {
        title,
        description,
        fileUrl: linkUrl,
        fileName: 'Google Drive Asset',
        textContent: '',
        category,
        resourceType,
        contentType, // e.g. pdf-gdrive or video-gdrive
        isPaid,
        price: isPaid ? Number(price) : 0,
        uploadedBy: user?.uid,
        uploaderName: userProfile?.name || 'Anonymous',
        isVerified: false, // Mandatory unverified for admin queue approval
        createdAt: new Date().toISOString()
      };

      if (category === 'GATE') {
        docData.branch = branch;
        docData.semester = '';
      } else if (category === 'Semester Notes') {
        docData.branch = branch;
        docData.semester = semester;
      } else {
        docData.branch = '';
        docData.semester = '';
      }

      // Save metadata directly to Firestore resources collection
      await addDoc(collection(db, 'resources'), docData);

      setSuccess(true);
      setTimeout(() => router.push('/explore'), 3000);
    } catch (err: any) {
      setError(err.message || 'Firestore entry creation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center glass-card p-10">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20"
          >
            <CheckCircle2 size={32} className="text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4 text-white">Upload Complete</h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm">
            Your Google Drive resource link has been successfully submitted to the admin verification queue.
          </p>
          <p className="text-xs text-slate-600 font-mono">Redirecting to Explore Modules...</p>
        </div>
      </div>
    );
  }

  const isBranchVisible = category === 'GATE' || category === 'Semester Notes';
  const isSemesterVisible = category === 'Semester Notes';

  return (
    <div className="immersive-bg min-h-screen flex flex-col">
      <div className="ambient-glow-1" />

      {/* Global Navbar */}
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link href="/explore" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center neon-glow-cyan transition-transform group-hover:scale-105">
                  <span className="text-white font-bold text-lg">D</span>
                </div>
                <span className="text-xl font-display font-bold tracking-tight text-white">
                  Digital Library
                </span>
              </Link>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/explore" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Explore</Link>
              <Link href="/jobs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Job Updates</Link>
              <Link href="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Support</Link>
              {user && (
                <div className="flex items-center gap-3">
                  <Link href="/dashboard" className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono text-cyan-400 uppercase hover:border-cyan-400 transition-all">
                    {userProfile?.name?.substring(0, 2) || 'ST'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12 w-full flex-grow relative z-10 flex flex-col justify-center">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Upload Resource</h1>
          <p className="text-slate-500 text-sm">Add curated notes, books, or unlisted YouTube video lectures restricted to your college.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6 pb-20">
          <div className="glass-card p-8 md:p-10 space-y-6">
            
            {/* Type Switch Note vs PYQ */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => setResourceType('note')}
                className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${resourceType === 'note' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}
              >
                Study Note / Book
              </button>
              <button 
                type="button" 
                onClick={() => setResourceType('pyq')}
                className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${resourceType === 'pyq' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}
              >
                Previous Year Paper (PYQ)
              </button>
            </div>

            {/* Content Format Selection */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource Format</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
              >
                <option value="pdf-gdrive">PDF File (Google Drive Link)</option>
                <option value="video-gdrive">Video File (Google Drive / YouTube Link)</option>
              </select>
            </div>

            {/* Google Drive Link Input (Strict link enforcement) */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Google Drive Sharing Link</label>
              <div className="relative">
                <input
                  required
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all font-mono text-xs"
                />
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4.5 h-4.5" />
              </div>
              <p className="text-[10px] text-slate-600 leading-normal">
                ⚠️ Make sure your Google Drive link has sharing enabled: <strong>&quot;Anyone with the link can view&quot;</strong>. Our secure server will stream the PDF binary directly, so the raw Drive link will never be exposed.
              </p>
            </div>

            {/* Title & Category */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Compiler Design PYQ 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <AnimatePresence>
              {/* Semester (Semester Notes only) */}
              {isSemesterVisible && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                  >
                    {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </motion.div>
              )}

              {/* Specialty / Branch (GATE & Semester Notes only) */}
              {isBranchVisible && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Branch / Specialty</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                  >
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Description</label>
              <textarea
                rows={3}
                placeholder="Briefly detail what subjects, units, or topics are covered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs leading-relaxed"
              />
            </div>

            {/* Premium Paid Configuration */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Resource Value</h3>
                  <p className="text-xs text-slate-500">Is this a paid premium note/video?</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${isPaid ? 'bg-cyan-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPaid ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              
              {isPaid && (
                <div className="flex items-center gap-4 animate-in fade-in duration-200">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-600">Price (INR)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs"
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
              className="w-full h-14 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Initiating Safe Upload...
                </>
              ) : (
                'Submit Module for Verification'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
