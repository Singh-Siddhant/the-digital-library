'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Save, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  BookOpen, 
  GraduationCap,
  Crown,
  ShieldCheck,
  ShoppingCart,
  Clock3,
  CircleCheck,
  CircleX,
  LogOut,
  ExternalLink,
  RefreshCw,
  Lock
} from 'lucide-react';

import Link from 'next/link';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function UserDashboard() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Profile states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [targetedExam, setTargetedExam] = useState('');
  const [branch, setBranch] = useState('Computer Science');
  const [semester, setSemester] = useState('Semester 1');
  
  // Interface states
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Payment requests states
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const exams = [
    "GATE", "Semester Notes", "RRB", "SSC", "CAT", "UPSC", "Placement Prep"
  ];

  const branches = [
    "Computer Science", "Electrical Engineering", "Mechanical Engineering", 
    "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"
  ];

  const semesters = [
    "Semester 1", "Semester 2", "Semester 3", "Semester 4", 
    "Semester 5", "Semester 6", "Semester 7", "Semester 8"
  ];

  // 1. Fetch profile settings on load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (userProfile) {
      setFullName(userProfile.name || '');
      setUsername(userProfile.username || '');
      setTargetedExam(userProfile.targetedExam || '');
      setBranch(userProfile.branch || 'Computer Science');
      setSemester(userProfile.semester || 'Semester 1');
    }
  }, [user, authLoading, userProfile, router]);

  // 2. Fetch user's payment / purchase requests on load
  useEffect(() => {
    if (user) {
      fetchPaymentRequests();
    }
  }, [user]);

  const fetchPaymentRequests = async () => {
    if (!user) return;
    setLoadingPayments(true);
    try {
      const q = query(
        collection(db, 'paymentRequests'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by createdAt desc
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPaymentRequests(data);
    } catch (err) {
      console.error("Error loading payment requests:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      const updates: any = {
        name: fullName.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, '_'),
        targetedExam
      };

      if (targetedExam === 'GATE') {
        updates.branch = branch;
        updates.semester = '';
      } else if (targetedExam === 'Semester Notes') {
        updates.branch = branch;
        updates.semester = semester;
      } else {
        updates.branch = '';
        updates.semester = '';
      }

      await setDoc(userRef, updates, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  // Compute statistics
  const stats = React.useMemo(() => {
    const total = paymentRequests.length;
    const pending = paymentRequests.filter(r => r.status === 'pending').length;
    const approved = paymentRequests.filter(r => r.status === 'approved').length;
    const rejected = paymentRequests.filter(r => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [paymentRequests]);

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    if (activeFilter === 'all') return paymentRequests;
    return paymentRequests.filter(r => r.status === activeFilter);
  }, [paymentRequests, activeFilter]);

  const isPremiumActive = userProfile?.planStatus === 'Paid' && (
    !userProfile.expiryDate || 
    userProfile.expiryDate === 'N/A' || 
    new Date(userProfile.expiryDate).getTime() > Date.now()
  );

  if (authLoading || !user || !userProfile) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isBranchVisible = targetedExam === 'GATE' || targetedExam === 'Semester Notes';
  const isSemesterVisible = targetedExam === 'Semester Notes';

  return (
    <div className="immersive-bg min-h-screen flex flex-col">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

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
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12 w-full flex-grow relative z-10">
        <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-400/20 text-cyan-400 shadow-xl shadow-cyan-400/5">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Student Dashboard</h1>
              <p className="text-slate-500 text-sm">Manage your profile credentials and monitor resource purchases.</p>
            </div>
          </div>
          
          <Link href="/explore" className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Library
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Profile & Target setup */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="glass-card p-8 md:p-10 space-y-6 bg-gradient-to-br from-slate-900/60 to-indigo-950/10">
                <h2 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                  <UserIcon className="text-cyan-400" size={18} /> Profile Settings
                </h2>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Your Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Your Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Username Identifier</label>
                    <input
                      required
                      type="text"
                      placeholder="your_name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">College Email Node (Read Only)</label>
                  <div className="h-12 px-4 bg-[#05060B] border border-white/5 rounded-xl text-slate-500 flex items-center text-xs font-mono select-none">
                    {user.email}
                  </div>
                </div>

                {/* Targeted Exam setup */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Target Goal / Exam</label>
                  <select
                    value={targetedExam}
                    onChange={(e) => setTargetedExam(e.target.value)}
                    className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                  >
                    <option value="">Select Target Exam</option>
                    {exams.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <AnimatePresence>
                  {/* Branch (GATE & Semester only) */}
                  {isBranchVisible && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Specialty</label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                      >
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </motion.div>
                  )}

                  {/* Semester (Semester only) */}
                  {isSemesterVisible && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Current Semester</label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                      >
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wide">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wide">
                    <CheckCircle2 size={16} />
                    Profile updated successfully!
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    disabled={saving}
                    type="submit"
                    className="h-12 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider font-sans"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Profile Settings
                  </button>
                  <button 
                    type="button"
                    onClick={() => logout().then(() => router.push('/'))}
                    className="h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            </form>

            {/* List Section: Purchase Requests */}
            <div className="glass-card p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="text-cyan-400" size={18} /> Purchase Requests
                  </h2>
                  <p className="text-[10px] text-slate-500">Individual premium files or membership upgrades submitted.</p>
                </div>

                <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider gap-0.5">
                  {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setActiveFilter(status)}
                      className={`px-3 py-1.5 rounded cursor-pointer transition-all ${activeFilter === status ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {loadingPayments ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-8">
                  <Loader2 className="animate-spin" size={16} /> Retrieving requests queue...
                </div>
              ) : filteredRequests.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono py-8 text-center">No payment requests found for this filter.</p>
              ) : (
                <div className="grid gap-4">
                  {filteredRequests.map((req) => {
                    const isResource = req.type === 'resource' || req.resourceId;
                    const isClickable = req.status === 'approved' && isResource;
                    
                    return (
                      <div 
                        key={req.id} 
                        onClick={() => {
                          if (isClickable) {
                            router.push(`/explore?id=${req.resourceId}`);
                          }
                        }}
                        className={`p-4 rounded-xl border bg-white/[0.01] border-white/5 flex items-center justify-between gap-4 transition-all ${
                          isClickable ? 'hover:border-cyan-400/50 hover:bg-cyan-500/[0.01] cursor-pointer' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold text-white ${isClickable ? 'underline decoration-cyan-400/50' : ''}`}>
                              {isResource ? req.resourceTitle : `${req.planName} Membership`}
                            </h3>
                            <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                              {req.type || 'resource'}
                            </span>
                            {isClickable && <ExternalLink size={12} className="text-cyan-400 shrink-0" />}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono text-slate-500 uppercase mt-1">
                            <span>Cost: <strong className="text-slate-300">INR {req.amount}</strong></span>
                            <span>TXN: <strong className="text-slate-300">{req.transactionId}</strong></span>
                            <span>Date: <strong>{new Date(req.createdAt).toLocaleDateString()}</strong></span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono shrink-0 ${
                          req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                          req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                          'bg-orange-500/10 text-orange-400 border border-orange-500/10'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Column 2: Sticky memberships overview & stats */}
          <div className="space-y-6">
            
            {/* Membership overview */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Crown className="text-cyan-400" size={16} /> Premium Access
              </h3>
              {isPremiumActive ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><CheckCircle2 size={14} /> Active Premium Membership</p>
                  <p className="text-slate-400 font-mono text-[10px]">Expiry: {userProfile.expiryDate}</p>
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                  <Lock size={14} />
                  <span>No active premium membership.</span>
                </div>
              )}
              
              <Link 
                href="/premium"
                className="w-full h-11 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 text-xs uppercase tracking-wider cursor-pointer"
              >
                Manage Premium
              </Link>
            </div>

            {/* Purchase statistics overview */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-cyan-400" size={16} /> Purchase Overview
                </h3>
                
                <div className="flex gap-2">
                  <button 
                    onClick={fetchPaymentRequests}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded border border-white/5 transition-all cursor-pointer"
                    title="Refresh Status"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <Link 
                    href="/explore"
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded border border-white/5 transition-all text-[9px] uppercase font-bold tracking-widest flex items-center"
                  >
                    Open Library
                  </Link>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-400">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><Clock3 size={12} className="text-orange-400" /> Pending Requests:</span>
                  <span className="text-white font-bold">{stats.pending}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><CircleCheck size={12} className="text-emerald-400" /> Approved Requests:</span>
                  <span className="text-white font-bold">{stats.approved}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><CircleX size={12} className="text-red-400" /> Rejected Requests:</span>
                  <span className="text-white font-bold">{stats.rejected}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2 text-slate-300 font-sans font-bold">
                  <span>Total Submissions:</span>
                  <span className="text-cyan-400">{stats.total}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
