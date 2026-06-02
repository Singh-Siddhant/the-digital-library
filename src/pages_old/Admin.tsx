import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Shield, Plus, Briefcase, Trash2, Mail, ExternalLink, Calendar } from 'lucide-react';

export default function Admin() {
  const { userProfile } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verification' | 'jobs'>('verification');

  // Job Form State
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [year, setYear] = useState('2025');
  const [jobType, setJobType] = useState('job');
  const [applyLink, setApplyLink] = useState('');

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchUnverifiedResources();
    }
  }, [userProfile]);

  const fetchUnverifiedResources = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'resources'), where('isVerified', '==', false));
      const snapshot = await getDocs(q);
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await updateDoc(doc(db, 'resources', id), { isVerified: true });
      setResources(resources.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
      setResources(resources.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'jobs'), {
        title: jobTitle,
        company,
        year,
        type: jobType,
        applyLink,
        createdAt: new Date().toISOString()
      });
      alert('Job posted successfully!');
      setJobTitle('');
      setCompany('');
      setApplyLink('');
    } catch (err) {
      console.error(err);
    }
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Shield size={64} className="text-red-500 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400">This portal is reserved for library administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3 bg-purple-600 rounded-2xl shadow-xl shadow-purple-600/20">
          <Shield className="text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-slate-400">Manage resource approvals and career updates.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-12 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-4 px-4 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'verification' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          Verification Queue ({resources.length})
          {activeTab === 'verification' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />}
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-4 px-4 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === 'jobs' ? 'text-purple-400' : 'text-slate-500'}`}
        >
          Post Job Update
          {activeTab === 'jobs' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600" />}
        </button>
      </div>

      {activeTab === 'verification' ? (
        <div className="space-y-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
               <div className="h-20 bg-slate-800 rounded-xl" />
               <div className="h-20 bg-slate-800 rounded-xl" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <p className="text-slate-500">No pending resources in the queue.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {resources.map((res) => (
                <div key={res.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-blue-600">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-xs font-bold uppercase tracking-widest text-blue-400">{res.category}</span>
                       <span className="text-slate-600 font-mono text-xs">{new Date(res.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{res.title}</h3>
                    <p className="text-sm text-slate-400">By {res.uploaderName} ({res.uploadedBy})</p>
                    <div className="mt-4">
                      <a href={res.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-2">
                        <ExternalLink size={14} /> Review File
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleVerify(res.id)}
                      className="p-4 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-xl transition-all"
                    >
                      <Check size={24} />
                    </button>
                    <button 
                      onClick={() => handleDelete(res.id)}
                      className="p-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto glass-card p-10">
          <form onSubmit={handleAddJob} className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Plus className="text-purple-500" /> Post Career Update
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Job Title</label>
                <input
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. Software Engineer Intern"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Company Name</label>
                <input
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. Google India"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Target Batch</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4"
                  >
                    {["2025", "2026", "2027", "2028", "2029"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Opportunity Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4"
                  >
                    <option value="job">Full-time Job</option>
                    <option value="intern">Internship</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Application Link</label>
                <input
                  required
                  value={applyLink}
                  onChange={(e) => setApplyLink(e.target.value)}
                  className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 focus:border-purple-500 focus:outline-none"
                  placeholder="https://company.com/careers/..."
                />
              </div>
            </div>
            <button
              className="w-full h-14 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20"
            >
              Broadcast Job Listing
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
