'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon, 
  BookOpen,
  Upload as UploadIcon,
  FileText,
  Video,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function ResourceUpload() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadType, setUploadType] = useState<'local' | 'drive'>('drive');
  // const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('GATE');
  const [branch, setBranch] = useState('Computer Science');
  const [semester, setSemester] = useState('Semester 1');
  const [resourceType, setResourceType] = useState('note'); // note or pyq
  const [contentType, setContentType] = useState('pdf-gdrive'); // pdf-local, pdf-gdrive, video-gdrive etc
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const categories = ["GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"];
  const branches = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"];
  const semesters = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  /*
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size exceeds the 50MB security upload limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError('');
    
    // Automatically match content type
    if (file.type.includes('pdf')) {
      setContentType('pdf-local');
    } else if (file.type.includes('video') || file.type.includes('mp4')) {
      setContentType('video-local');
    } else if (file.type.includes('image') || file.type.match(/\.(png|jpe?g|gif|webp)$/i)) {
      setContentType('image-local');
    } else {
      setContentType('document-local');
    }

    if (!title) {
      // Auto fill title with file name without extension
      const nameParts = file.name.split('.');
      nameParts.pop();
      setTitle(nameParts.join('.'));
    }
  };
  */

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProgress(0);

    if (!title.trim()) {
      return setError('Please provide a descriptive resource title.');
    }

    if (uploadType === 'drive') {
      if (!linkUrl) {
        return setError('Google Drive sharing URL / link is required.');
      }
      if (!linkUrl.includes('drive.google.com') && !linkUrl.includes('docs.google.com') && !linkUrl.includes('youtube.com') && !linkUrl.includes('youtu.be')) {
        return setError('Validation failed: A valid Google Drive, Google Docs, or YouTube link is required.');
      }
    } /* else {
      if (!selectedFile) {
        return setError('Please select a local file to upload.');
      }
    } */

    setLoading(true);

    try {
      let finalFileUrl = linkUrl;
      let storagePath = '';
      let finalContentType = uploadType === 'drive' ? contentType : contentType;

      // 1. Upload File if local upload is selected
      /*
      if (uploadType === 'local' && selectedFile) {
        const timestamp = Date.now();
        const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        storagePath = `resources/${timestamp}_${safeFileName}`;
        const fileRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(fileRef, selectedFile);

        // Await the upload using a Promise to track progress
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setProgress(pct);
            }, 
            (err) => {
              reject(err);
            }, 
            async () => {
              finalFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }
      */

      // 2. Save metadata to Firestore
      const docData: any = {
        title: title.trim(),
        description: description.trim(),
        fileUrl: finalFileUrl,
        fileName: /* uploadType === 'local' && selectedFile ? selectedFile.name : */ 'Google Drive Asset',
        storagePath: storagePath,
        category,
        resourceType,
        contentType: uploadType === 'drive' ? (contentType === 'pdf-local' ? 'pdf-gdrive' : contentType) : finalContentType,
        isPaid: false, // Standard student uploads are always free by default
        price: 0,
        uploadedBy: user?.uid,
        uploaderName: userProfile?.name || 'Student Scholar',
        isVerified: false, // Must be approved by admin in verification queue
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

      await addDoc(collection(db, 'resources'), docData);

      setSuccess(true);
      setTimeout(() => router.push('/explore'), 3000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || 'File upload or Firestore registration failed.');
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
          <h2 className="text-3xl font-bold mb-4 text-white">Submission Complete</h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm">
            Your study resource has been uploaded successfully and queued for admin verification.
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
              <Link href="/premium" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Premium</Link>
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
          <p className="text-slate-500 text-sm">Add curated notes, question banks, or reference material for review and activation.</p>
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

            {/* Toggle Local Upload vs Link */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Submission Mode</label>
              <div className="grid grid-cols-1">
                <button
                  type="button"
                  onClick={() => { setUploadType('drive'); setContentType('pdf-gdrive'); }}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border cursor-pointer accent-cyan text-white border-cyan-400/50`}
                >
                  Link Google Drive / YouTube (Only Available Mode)
                </button>
                {/* 
                <button
                  type="button"
                  onClick={() => { setUploadType('local'); setContentType('pdf-local'); }}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border cursor-pointer ${uploadType === 'local' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                >
                  Upload File (PDF/Video)
                </button>
                */}
              </div>
            </div>

            {/* Local File Selector */}
            {/* uploadType === 'local' ? (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Select Document / Video</label>
                <div className="relative border-2 border-dashed border-white/10 hover:border-cyan-400/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors bg-[#0A0C16]/50">
                  <input
                    type="file"
                    accept=".pdf,.mp4,.docx,.pptx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2 text-center relative z-20">
                      <div className="w-12 h-12 bg-cyan-400/10 rounded-xl flex items-center justify-center text-cyan-400">
                        {selectedFile.type.includes('video') ? <Video size={24} /> : <FileText size={24} />}
                      </div>
                      <span className="text-xs font-bold text-white max-w-xs truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-2 text-[10px] uppercase font-bold tracking-widest text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <X size={12} /> Clear File
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadIcon size={32} className="text-slate-600 animate-bounce" />
                      <span className="text-xs text-slate-400 font-semibold text-center">Drag & Drop or Click to Select File</span>
                      <span className="text-[9px] text-slate-600 font-mono text-center">Supports PDF, MP4, PPTX, DOCX up to 50MB</span>
                    </>
                  )}
                </div>
              </div>
            ) : ( */}
              {/* Google Drive Link Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Google Drive / YouTube Link</label>
                  <div className="relative">
                    <input
                      required
                      type="url"
                      placeholder="https://drive.google.com/file/d/... or https://youtube.com/..."
                      value={linkUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinkUrl(val);
                        if (val.includes('youtube.com') || val.includes('youtu.be')) {
                          setContentType('video-gdrive');
                        } else if (val.includes('drive.google.com') || val.includes('docs.google.com')) {
                          if (val.includes('/file/d/')) {
                            setContentType('pdf-gdrive');
                          }
                        }
                      }}
                      className="w-full h-12 pl-12 pr-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all font-mono text-xs"
                    />
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4.5 h-4.5" />
                  </div>
                  <p className="text-[10px] text-slate-600 leading-normal">
                    ⚠️ Make sure sharing is set to: <strong>&quot;Anyone with the link can view&quot;</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Link Format / Type</label>
                  <select
                    value={contentType === 'pdf-local' ? 'pdf-gdrive' : contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                  >
                    <option value="pdf-gdrive">PDF (Google Drive)</option>
                    <option value="video-gdrive">Video (Google Drive / YouTube)</option>
                    <option value="image-gdrive">Image (Google Drive)</option>
                    <option value="document-gdrive">Other Document (Google Drive)</option>
                  </select>
                </div>
              </div>
            {/* ) */}

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

            {/* Error displays */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-wide">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Upload Progress Bar */}
            {/* loading && uploadType === 'local' && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  <span>Uploading File Binaries...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_#22d3ee]" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) */}

            <button
              disabled={loading}
              className="w-full h-14 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Registering metadata...
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
