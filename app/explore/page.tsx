'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  BookOpen, 
  ChevronRight, 
  Upload, 
  LogOut, 
  Download, 
  Lock,
  ChevronLeft,
  Crown,
  AlertCircle,
  QrCode,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const categories = [
  "GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"
];

const branches = [
  "Computer Science", "Electrical Engineering", "Mechanical Engineering", 
  "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"
];

const semesters = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4", 
  "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, logout } = useAuth();
  
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedResourceType, setSelectedResourceType] = useState('All'); // note or pyq
  
  const [viewingResource, setViewingResource] = useState<any>(null);
  const [purchasedResourceIds, setPurchasedResourceIds] = useState<string[]>([]);
  
  // Custom Payment Modal for Single Paid Resource
  const [payModalResource, setPayModalResource] = useState<any>(null);
  const [payName, setPayName] = useState('');
  const [payTxnId, setPayTxnId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState('');

  // Security Flags
  const isCyber = userProfile?.role === 'cyber';
  const isAdmin = userProfile?.role === 'admin';
  const isPremiumActive = userProfile?.planStatus === 'Paid' && (
    !userProfile.expiryDate || 
    userProfile.expiryDate === 'N/A' || 
    new Date(userProfile.expiryDate).getTime() > Date.now()
  );

  // Guest redirect check removed to allow compulsory public catalog display

  useEffect(() => {
    const categoryFromQuery = searchParams?.get('category');
    if (categoryFromQuery) {
      setSelectedCategory(categoryFromQuery);
      setSelectedBranch('All');
      setSelectedSemester('All');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    } else {
      setPurchasedResourceIds([]);
    }
  }, [user]);

  // Handle URL redirect query param to auto-open resource
  useEffect(() => {
    const targetId = searchParams?.get('id');
    if (targetId && resources.length > 0) {
      const targetRes = resources.find(r => r.id === targetId);
      if (targetRes) {
        const isUnlocked = isCyber || isAdmin || !targetRes.isPaid || isPremiumActive || purchasedResourceIds.includes(targetRes.id);
        if (isUnlocked) {
          setViewingResource(targetRes);
        } else {
          setPayModalResource(targetRes);
        }
      }
    }
  }, [searchParams, resources, purchasedResourceIds, isPremiumActive, isCyber, isAdmin]);

  useEffect(() => {
    const handleModalKeys = (e: KeyboardEvent) => {
      if (viewingResource) {
        if ((e.ctrlKey && e.key === 'p') || (e.ctrlKey && e.key === 's')) {
          e.preventDefault();
          alert('Security Lockout: Saving or printing this secure academic file is strictly disabled.');
        }
      }
    };
    window.addEventListener('keydown', handleModalKeys);
    return () => window.removeEventListener('keydown', handleModalKeys);
  }, [viewingResource]);

  const fetchPurchases = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'purchases'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map(doc => doc.data().resourceId);
      setPurchasedResourceIds(ids);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'resources'),
        where('isVerified', '==', true)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by createdAt desc to bypass index limits
      data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setResources(data);
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedBranch('All');
    setSelectedSemester('All');
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    
    // Branch applies to GATE & Semester Notes
    const isBranchApplicable = selectedCategory === 'GATE' || selectedCategory === 'Semester Notes';
    const matchesBranch = !isBranchApplicable || selectedBranch === 'All' || res.branch === selectedBranch;

    // Semester applies to Semester Notes only
    const isSemesterApplicable = selectedCategory === 'Semester Notes';
    const matchesSemester = !isSemesterApplicable || selectedSemester === 'All' || res.semester === selectedSemester;

    const matchesType = selectedResourceType === 'All' || res.resourceType === selectedResourceType;
    
    return matchesSearch && matchesCategory && matchesBranch && matchesSemester && matchesType;
  });

  const handleManualResourceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to request access.');
    if (!payName.trim()) return setPayError('Name is required.');
    if (!payTxnId.trim()) return setPayError('Transaction ID is required.');

    setPayLoading(true);
    setPayError('');

    try {
      await addDoc(collection(db, 'paymentRequests'), {
        userId: user.uid,
        email: user.email,
        fullName: payName.trim(),
        resourceId: payModalResource.id,
        resourceTitle: payModalResource.title,
        amount: payModalResource.price,
        transactionId: payTxnId.trim(),
        status: 'pending',
        type: 'resource',
        createdAt: new Date().toISOString()
      });

      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setPayModalResource(null);
        setPayName('');
        setPayTxnId('');
      }, 3000);
    } catch (err: any) {
      setPayError(err.message || 'Failed to submit payment request.');
    } finally {
      setPayLoading(false);
    }
  };

  const generateSimulatedTxn = () => {
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const simulated = `TXN-RES-${randomHex}`;
    setPayTxnId(simulated);
  };

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
              <Link href="/explore" className="text-sm font-medium text-white transition-colors relative">
                Explore
                <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400" />
              </Link>
              <Link href="/jobs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Job Updates
              </Link>
              <Link href="/premium" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-cyan-400">
                <Crown size={14} className="animate-pulse" /> Premium
              </Link>
              <Link href="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Support
              </Link>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <Link href="/upload" className="flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                    <Upload size={18} />
                    <span>Upload</span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono text-cyan-400 uppercase hover:border-cyan-400 transition-all">
                      {userProfile?.name?.substring(0, 2) || 'ST'}
                    </Link>
                    <button 
                      onClick={() => logout().then(() => router.push('/'))}
                      className="p-2 text-slate-500 hover:text-white transition-all"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <Link 
                  href="/" 
                  className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-cyan-400 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Layout Sidebar + Content */}
      <div className="flex-grow flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="w-80 glass-sidebar hidden lg:flex flex-col gap-8 p-8 relative z-10 shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">Archive Category</p>
            <div className="space-y-1">
              {['All', ...categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === cat ? 'accent-cyan text-white shadow-lg shadow-cyan-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {/* Semester Filters (Semester Notes only) */}
            {selectedCategory === 'Semester Notes' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-4">Academic Semester</p>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {['All', ...semesters].map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSelectedSemester(s)}
                      className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg ${selectedSemester === s ? 'text-cyan-400' : 'text-slate-600 hover:text-white'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Branch Filters (GATE and Semester Notes only) */}
            {(selectedCategory === 'GATE' || selectedCategory === 'Semester Notes') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-4">
                  {selectedCategory === 'GATE' ? 'GATE Branches' : 'Academic Branches'}
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {['All', ...branches].map(b => (
                    <button 
                      key={b} 
                      onClick={() => setSelectedBranch(b)}
                      className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg ${selectedBranch === b ? 'text-cyan-400' : 'text-slate-600 hover:text-white'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">Resource Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSelectedResourceType('pyq')} className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedResourceType === 'pyq' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>PYQ</button>
              <button onClick={() => setSelectedResourceType('note')} className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedResourceType === 'note' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>Note</button>
              <button onClick={() => setSelectedResourceType('All')} className="col-span-2 py-2 text-[10px] font-bold text-slate-600 uppercase">Clear Filter</button>
            </div>
          </div>
        </aside>

        {/* Dynamic content */}
        <main className="flex-1 p-8 lg:p-12 relative z-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-display font-bold text-white mb-2">
                  {selectedCategory} 
                  {selectedSemester !== 'All' ? ` - ${selectedSemester}` : ''}
                  {selectedBranch !== 'All' ? ` - ${selectedBranch}` : ''}
                </h2>
                <p className="text-slate-500">{filteredResources.length} secure study modules available.</p>
              </div>
              <div className="relative w-full md:w-96 group">
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-full pl-12 pr-6 text-sm focus:border-cyan-400 outline-none transition-all text-slate-200"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
              <AnimatePresence mode="popLayout">
                {filteredResources.map((res) => {
                  const isPaid = res.isPaid;
                  const isUnlocked = isCyber || isAdmin || !isPaid || isPremiumActive || purchasedResourceIds.includes(res.id);

                  return (
                    <motion.div
                      layout
                      key={res.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-8 flex flex-col group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                          <BookOpen size={20} />
                        </div>
                        {isPaid && !isUnlocked && (
                          <span className="px-2 py-1 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Lock size={10} /> Paid Reference
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">{res.title}</h3>
                      <p className="text-slate-500 text-xs mb-8 line-clamp-3 leading-relaxed">
                        {res.description || 'Verified academic study reference module.'}
                      </p>

                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[9px] font-mono text-slate-600 uppercase">
                          BY {res.uploaderName || 'ANONYMOUS'}
                        </div>
                        {isPaid && !isUnlocked ? (
                          <button 
                            onClick={() => setPayModalResource(res)} 
                            className="px-5 py-2 rounded-lg bg-orange-505 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 transition-all cursor-pointer shadow-lg shadow-orange-600/20"
                          >
                            UNLOCK ₹{res.price}
                          </button>
                        ) : (
                          <button 
                            onClick={() => setViewingResource(res)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 text-xs font-bold hover:bg-cyan-400 hover:text-black transition-all cursor-pointer"
                          >
                            VIEW SECURE COPY →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Unlock Resource Modal / UPI Request form */}
      <AnimatePresence>
        {payModalResource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }}
              className="max-w-md w-full glass-card p-8 border border-white/10 bg-[#0A0C16] relative overflow-hidden"
            >
              <button 
                onClick={() => setPayModalResource(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2 text-orange-400 mb-4">
                <Lock size={20} />
                <h3 className="text-xl font-bold">Unlock Study Resource</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                You are requesting access to **{payModalResource.title}**. You can pay manually to activate access, or join **Premium** to unlock all resources.
              </p>

              {paySuccess ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-black">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Request Logged</h4>
                  <p className="text-xs text-slate-400 font-mono">Reference pending admin verification. Tracking updates on your Dashboard.</p>
                </div>
              ) : (
                <form onSubmit={handleManualResourceRequest} className="space-y-4">
                  
                  {/* UPI QR display */}
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex items-center gap-4">
                    <QrCode size={70} className="bg-white p-1 rounded text-slate-900 shrink-0" />
                    <div className="text-xs space-y-1 font-mono text-slate-400">
                      <div>UPI ID: <strong className="text-white">majorguru09@okaxis</strong></div>
                      <div>AMOUNT: <strong className="text-cyan-400">₹{payModalResource.price}.00</strong></div>
                      <button 
                        type="button" 
                        onClick={generateSimulatedTxn}
                        className="text-[9px] uppercase font-bold text-cyan-400 underline hover:text-cyan-300 block pt-1"
                      >
                        Simulate Payment Code
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Your Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Siddhant Singh"
                      value={payName}
                      onChange={(e) => setPayName(e.target.value)}
                      className="w-full h-10 px-3 bg-[#030408] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Transaction ID / UPI Reference</label>
                    <input
                      required
                      type="text"
                      placeholder="Paste UPI Reference Code"
                      value={payTxnId}
                      onChange={(e) => setPayTxnId(e.target.value)}
                      className="w-full h-10 px-3 bg-[#030408] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 font-mono text-xs"
                    />
                  </div>

                  {payError && (
                    <div className="flex items-center gap-1.5 text-red-500 font-bold uppercase tracking-wider text-[9px]">
                      <AlertCircle size={12} /> {payError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={payLoading}
                      className="flex-1 h-11 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {payLoading ? 'Submitting...' : 'Submit Txn ID'}
                    </button>
                    <Link
                      href="/premium"
                      className="flex-1 h-11 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      Go Premium <Crown size={12} className="ml-1" />
                    </Link>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Digital Reader Modal */}
      <AnimatePresence>
        {viewingResource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="max-w-5xl w-full h-[88vh] glass-card flex flex-col relative overflow-hidden bg-[#05060B]">
              <button 
                onClick={() => setViewingResource(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-slate-200 transition-all shadow-xl z-[110]"
              >
                <ChevronLeft size={20} className="rotate-180" />
              </button>

              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#070912] pr-16">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{viewingResource.title}</h2>
                  <p className="text-xs text-slate-500">By {viewingResource.uploaderName || 'Verified Scholar'} • Secure MMMUT Archive Node</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Cyber Exception Download Override */}
                  {(isCyber || isAdmin) && (
                    <a 
                      href={`/api/resource/${viewingResource.id}`} 
                      download
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                    >
                      <Download size={14} /> Download PDF (Cyber Pass)
                    </a>
                  )}
                  <span className="px-3 py-1 bg-cyan-400/10 text-cyan-400 text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-1.5 border border-cyan-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Protected Reader
                  </span>
                </div>
              </div>
              
              {/* Reader Proxy View Render (Google Drive raw links never exposed) */}
              <div className="flex-1 w-full bg-[#030407] relative overflow-hidden flex items-center justify-center">
                {viewingResource.contentType === 'text' ? (
                  <div className="w-full h-full overflow-y-auto p-10 font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-none">
                    {viewingResource.textContent || 'No text content available.'}
                  </div>
                ) : (
                  <>
                    <iframe
                      src={`/api/resource/${viewingResource.id}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full border-0 select-none pointer-events-auto"
                      title={viewingResource.title}
                    />
                    {/* Transparent Click Prevention Layer for non-cyber/non-admin */}
                    {!isCyber && !isAdmin && (
                      <div className="absolute inset-0 bg-transparent pointer-events-none" />
                    )}
                  </>
                )}
              </div>

              {/* Secure watermark footer */}
              <div className="p-4 border-t border-white/5 bg-[#070912] text-center flex flex-col md:flex-row items-center justify-between px-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest gap-2">
                <span>Node ID: MMMUT-DL-SECURE-V3</span>
                <span>Watermarked Stream • Screenshots & Screen Recordings Prohibited</span>
                <span>Protected by Firebase E2E Rules</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Explore() {
  return (
    <Suspense fallback={
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
