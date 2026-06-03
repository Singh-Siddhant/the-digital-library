'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Calendar, Search } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

export default function Jobs() {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const years = ["2025", "2026", "2027", "2028", "2029"];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/jobs');
      setJobs(response.data);
    } catch (err) {
      console.error("Error loading placement updates:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesYear = selectedYear === 'All' || job.year === selectedYear;
    const matchesType = selectedType === 'All' || job.type === selectedType;
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.company.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesYear && matchesType && matchesSearch;
  });

  return (
    <div className="immersive-bg min-h-screen flex flex-col text-slate-200">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

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
            <div className="flex items-center gap-8">
              <Link href="/explore" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Explore</Link>
              <Link href="/jobs" className="text-sm font-medium text-white transition-colors relative">
                Job Updates
                <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400" />
              </Link>
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
      
      <div className="max-w-5xl mx-auto px-4 py-16 w-full flex-grow relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-400/10 border border-orange-400/20 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
            Career Update Center
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-white">Job & <span className="text-cyan-400">Internship Updates</span></h1>
          <p className="text-slate-500 text-sm md:text-base">Real-time dynamic recruitment alerts synced directly with our college placement sheet.</p>
        </div>

        {/* Year Filter Tracks */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setSelectedYear('All')}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${selectedYear === 'All' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-white'}`}
          >
            All Tracks
          </button>
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${selectedYear === year ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-white'}`}
            >
              Batch {year}
            </button>
          ))}
        </div>

        {/* Search Input and Opportunity Type switches */}
        <div className="glass-card p-6 mb-12 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <input
              type="text"
              placeholder="Search by company or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-all font-sans"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            {['All', 'job', 'intern'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 md:flex-none px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${selectedType === type ? 'bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'}`}
              >
                {type === 'All' ? 'All Formats' : type === 'job' ? 'Full-Time' : 'Internships'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 glass-card animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job) => (
                <motion.div
                  layout
                  key={job.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20"
                >
                  <div className="flex gap-6 items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${job.type === 'intern' ? 'bg-purple-400/10 text-purple-400' : 'bg-cyan-400/10 text-cyan-400'}`}>
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                        <span className="text-slate-300">{job.company}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {job.year} BATCH</span>
                        <span className={`px-2 py-0.5 rounded ${job.type === 'intern' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{job.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className="hidden md:block text-[9px] font-mono text-slate-600">ID: {job.id.substring(0, 8)}</span>
                    <a
                      href={job.applyLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-2 bg-slate-800 text-xs font-bold text-white rounded-lg border border-white/5 hover:bg-white hover:text-black transition-all cursor-pointer"
                    >
                      Process Application →
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
