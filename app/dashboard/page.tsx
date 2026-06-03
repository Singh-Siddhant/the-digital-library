'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
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
  GraduationCap 
} from 'lucide-react';
import Link from 'next/link';

export default function UserDashboard() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Form states
  const [targetedExam, setTargetedExam] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (userProfile) {
      setTargetedExam(userProfile.targetedExam || '');
      setBranch(userProfile.branch || 'Computer Science');
      setSemester(userProfile.semester || 'Semester 1');
    }
  }, [user, authLoading, userProfile, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      const updates: any = {
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

      await updateDoc(userRef, updates);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

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
              <Link href="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-grow relative z-10 flex flex-col justify-center">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-400/20 text-cyan-400 shadow-xl shadow-cyan-400/5">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Student Dashboard</h1>
              <p className="text-slate-500 text-sm">Manage your profile, target preferences, and academic branch settings.</p>
            </div>
          </div>
          
          <Link href="/explore" className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Library
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Left Column - User Details Summary */}
          <div className="glass-card p-8 space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-xl shadow-cyan-500/10 mx-auto">
              <div className="w-full h-full bg-[#05060B] rounded-full flex items-center justify-center font-mono font-bold text-2xl text-white">
                {userProfile.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{userProfile.name}</h2>
              <p className="text-xs text-slate-500 font-mono mb-4">{userProfile.email}</p>
              <span className="text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 tracking-wider">
                {userProfile.role} Node
              </span>
            </div>

            <div className="border-t border-white/5 pt-6 space-y-4 text-left text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span>Plan Level:</span>
                <span className={`font-bold uppercase tracking-wider ${userProfile.planStatus === 'Paid' ? 'text-green-400' : 'text-slate-500'}`}>
                  {userProfile.planStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Expiry Date:</span>
                <span className="font-mono text-slate-300">{userProfile.expiryDate}</span>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => logout().then(() => router.push('/'))}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Sign Out Node
              </button>
            </div>
          </div>

          {/* Right Column - Profile Settings Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="glass-card p-8 md:p-10 space-y-6">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">Academic & Career Setup</h3>
                
                {/* Targeted Exam */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Targeted Exam / Goal</label>
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
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Branch</label>
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
                    Profile preferences updated successfully!
                  </div>
                )}

                <button
                  disabled={saving}
                  className="w-full h-14 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving profile settings...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Node Preferences
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
