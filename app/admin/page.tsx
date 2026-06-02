'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Shield, 
  Users, 
  FileCheck, 
  TrendingUp, 
  Edit2, 
  Save, 
  BookOpen 
} from 'lucide-react';
import Link from 'next/link';

export default function Admin() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [resources, setResources] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verification' | 'users'>('verification');

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editBatch, setEditBatch] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin' | 'cyber'>('user');
  const [editPlan, setEditPlan] = useState<'Free' | 'Paid'>('Free');
  const [editExpiry, setEditExpiry] = useState('');

  useEffect(() => {
    if (!authLoading && userProfile?.role !== 'admin') {
      router.push('/');
    } else if (userProfile?.role === 'admin') {
      fetchAdminData();
    }
  }, [userProfile, authLoading, router]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch unverified resources
      const resQuery = query(collection(db, 'resources'), where('isVerified', '==', false));
      const resSnapshot = await getDocs(resQuery);
      setResources(resSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Fetch users
      const usersQuery = collection(db, 'users');
      const usersSnapshot = await getDocs(usersQuery);
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, approve: boolean) => {
    try {
      if (approve) {
        // "YES" - Approve and Verify
        await updateDoc(doc(db, 'resources', id), { isVerified: true });
        alert('Module resource approved and published!');
      } else {
        // "NO" - Disapprove / Delete
        await deleteDoc(doc(db, 'resources', id));
        alert('Module resource rejected and deleted!');
      }
      setResources(resources.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Verification status update failed.');
    }
  };

  const startEditUser = (u: any) => {
    setEditingUserId(u.id);
    setEditBatch(u.batch || 'AI/Cyber Prep');
    setEditRole(u.role || 'user');
    setEditPlan(u.planStatus || 'Free');
    setEditExpiry(u.expiryDate || 'N/A');
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        batch: editBatch,
        role: editRole,
        planStatus: editPlan,
        expiryDate: editExpiry
      });

      // Update local state
      setUsers(users.map(u => u.id === userId ? {
        ...u,
        batch: editBatch,
        role: editRole,
        planStatus: editPlan,
        expiryDate: editExpiry
      } : u));

      setEditingUserId(null);
      alert('User profile nodes updated successfully.');
    } catch (err) {
      console.error("Error saving user node:", err);
      alert('Failed to update user profile.');
    }
  };

  if (authLoading || userProfile?.role !== 'admin') {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="immersive-bg min-h-screen flex flex-col">
      <div className="ambient-glow-1" />

      {/* Global Navbar */}
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center neon-glow-cyan transition-transform group-hover:scale-105">
                  <span className="text-white font-bold text-lg">D</span>
                </div>
                <span className="text-xl font-display font-bold tracking-tight text-white">
                  Digital Library
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-500 uppercase">
              System Admin Console
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12 w-full flex-grow relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 rounded-2xl shadow-xl shadow-purple-600/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold text-white mb-1">Admin Dashboard</h1>
              <p className="text-slate-500 text-sm">Manage user authorizations, subscriptions, and verify module queues.</p>
            </div>
          </div>

          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'verification' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              <FileCheck size={14} /> Verification Queue ({resources.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'users' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              <Users size={14} /> User Manager ({users.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-28 bg-white/5 rounded-2xl border border-white/5" />
             <div className="h-28 bg-white/5 rounded-2xl border border-white/5" />
          </div>
        ) : activeTab === 'verification' ? (
          <div className="space-y-6">
            {resources.length === 0 ? (
              <div className="text-center py-20 glass-card">
                <p className="text-slate-500">No resources currently pending validation inside the verification queue.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {resources.map((res) => (
                  <div key={res.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-cyan-500">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 text-[9px] font-bold uppercase tracking-wider border border-cyan-400/10">{res.category}</span>
                        <span className="text-slate-600 font-mono text-[10px]">{new Date(res.createdAt).toLocaleString()}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{res.title}</h3>
                      <p className="text-xs text-slate-400 mb-4">{res.description || 'No description provided.'}</p>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono text-slate-500 uppercase">
                        <span>FORMAT: <strong className="text-slate-300">{res.contentType}</strong></span>
                        <span>BY: <strong className="text-slate-300">{res.uploaderName}</strong></span>
                        <span>PAYMENT: <strong className={res.isPaid ? 'text-orange-400' : 'text-green-400'}>{res.isPaid ? `PAID (₹${res.price})` : 'FREE'}</strong></span>
                      </div>
                    </div>
                    
                    {/* Secure YES/NO Verification Actions */}
                    <div className="flex gap-3 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                      <button 
                        onClick={() => handleVerify(res.id, true)}
                        className="px-5 py-3 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-500/20 hover:border-emerald-500 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Check size={16} /> Yes, Approve
                      </button>
                      <button 
                        onClick={() => handleVerify(res.id, false)}
                        className="px-5 py-3 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl border border-red-500/20 hover:border-red-500 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <X size={16} /> No, Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* User Manager Tab */
          <div className="glass-card overflow-hidden border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    <th className="p-6">User / Email</th>
                    <th className="p-6">Target Batch</th>
                    <th className="p-6">System Role</th>
                    <th className="p-6">Plan Status</th>
                    <th className="p-6">Expiry Date</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {users.map((u) => {
                    const isEditing = editingUserId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="p-6">
                          <div className="font-bold text-white text-sm mb-1">{u.name}</div>
                          <div className="font-mono text-slate-500 text-[10px]">{u.email}</div>
                        </td>

                        {/* Batch */}
                        <td className="p-6">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editBatch}
                              onChange={(e) => setEditBatch(e.target.value)}
                              className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-400"
                            />
                          ) : (
                            <span className="font-medium text-slate-300">{u.batch || 'General Prep'}</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="p-6">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none"
                            >
                              <option value="user">User</option>
                              <option value="cyber">Cyber</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-mono uppercase font-bold text-[9px] ${
                              u.role === 'admin' ? 'bg-purple-500/25 text-purple-400 border border-purple-500/20' :
                              u.role === 'cyber' ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/20' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {u.role || 'user'}
                            </span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="p-6">
                          {isEditing ? (
                            <select
                              value={editPlan}
                              onChange={(e) => setEditPlan(e.target.value as any)}
                              className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none"
                            >
                              <option value="Free">Free</option>
                              <option value="Paid">Paid</option>
                            </select>
                          ) : (
                            <span className={`flex items-center gap-1.5 font-bold ${u.planStatus === 'Paid' ? 'text-green-400' : 'text-slate-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.planStatus === 'Paid' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-slate-700'}`} />
                              {u.planStatus || 'Free'}
                            </span>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="p-6">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editExpiry}
                              placeholder="e.g. Dec 31, 2026"
                              onChange={(e) => setEditExpiry(e.target.value)}
                              className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none font-mono"
                            />
                          ) : (
                            <span className="font-mono text-slate-400">{u.expiryDate || 'N/A'}</span>
                          )}
                        </td>

                        {/* Edit Buttons */}
                        <td className="p-6 text-right">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveUser(u.id)}
                              className="p-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
                            >
                              <Save size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => startEditUser(u)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
