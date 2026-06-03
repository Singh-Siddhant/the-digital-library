'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Landmark, Book, Share2, Coffee, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

export default function Donate() {
  const { user, userProfile } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState('₹500');

  const handleDonate = () => {
    const numericAmount = parseInt(selectedAmount.replace(/[^\d]/g, ''), 10);
    if (isNaN(numericAmount)) return;

    if (typeof window === 'undefined' || !(window as any).Razorpay) {
      alert("Razorpay checkout is loading, please try again in a few seconds.");
      return;
    }

    const options = {
      key: "rzp_test_placeholder",
      amount: numericAmount * 100,
      currency: "INR",
      name: "The Digital Library",
      description: "Community Support Donation",
      handler: function (response: any) {
        alert(`Thank you so much for your generous support of ${selectedAmount}! Your contribution keeps our library alive.`);
      },
      theme: { color: "#06b6d4" }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  return (
    <div className="immersive-bg min-h-screen flex flex-col text-slate-200">
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
            <div className="flex items-center gap-8">
              <Link href="/explore" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Explore</Link>
              <Link href="/jobs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Job Updates</Link>
              <Link href="/donate" className="text-sm font-medium text-white transition-colors relative">
                Support
                <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400" />
              </Link>
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

      <main className="max-w-7xl mx-auto px-4 py-16 w-full flex-grow relative z-10">
        <div className="text-center mb-16">
          <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             className="w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500 shadow-lg shadow-pink-500/5"
          >
            <Heart size={32} fill="currentColor" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 text-white">Support Our Community</h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            The Digital Library is built by students, for students. We rely on your contributions to keep the servers running and the library secure for everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {/* Support financially */}
          <div className="glass-card p-8 md:p-10 space-y-8 flex flex-col items-start bg-gradient-to-br from-slate-900 to-indigo-950/20 border-white/10">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/25">
              <Coffee className="text-white w-6 h-6" />
            </div>
            <div className="w-full">
              <h2 className="text-2xl font-bold text-white mb-3">Donate Funds</h2>
              <p className="text-slate-400 text-xs leading-relaxed mb-8">
                Contribute to server bandwidth costs, E2E security maintenance, and API routes deployment. Every small bit keeps the node active.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8 w-full">
                 {['₹100', '₹500', '₹1000'].map(amt => (
                   <button 
                     key={amt} 
                     onClick={() => setSelectedAmount(amt)}
                     className={`py-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedAmount === amt ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-white'}`}
                   >
                     {amt}
                   </button>
                 ))}
              </div>
              <button 
                onClick={handleDonate}
                className="w-full h-14 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider shadow-lg"
              >
                 Support with UPI / Card <Landmark size={16} />
              </button>
            </div>
          </div>

          {/* Support with resources */}
          <div className="glass-card p-8 md:p-10 space-y-8 flex flex-col items-start bg-gradient-to-br from-slate-900 to-emerald-950/20 border-white/10">
            <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/25">
              <Book className="text-white w-6 h-6" />
            </div>
            <div className="w-full">
              <h2 className="text-2xl font-bold text-white mb-3">Share Knowledge</h2>
              <p className="text-slate-400 text-xs leading-relaxed mb-8">
                The richest contribution you can make is sharing verified notes or books. Submit your links to be reviewed.
              </p>
              <ul className="space-y-4 mb-10">
                 {[
                   'Handwritten Semester Notes',
                   'Entrance Exam Solved Papers',
                   'Placement Interview Experiences',
                   'Technical Reference Guides'
                 ].map(item => (
                   <li key={item} className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                      <Sparkles size={14} className="text-emerald-500 shrink-0 animate-pulse" />
                      {item}
                   </li>
                 ))}
              </ul>
              <Link href="/upload" className="w-full h-14 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25">
                 Upload Google Drive Link <Share2 size={16} />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-24 text-center max-w-2xl mx-auto p-8 md:p-12 glass-card border-white/5 bg-white/[0.01]">
           <h3 className="text-lg font-bold text-white mb-3">Wall of Gratitude</h3>
           <p className="text-slate-500 text-xs mb-8 leading-relaxed">
             We would like to thank our incredible community of contributors who have shared over 10,000 resources. You are the heartbeat of this platform.
           </p>
           <div className="flex flex-wrap justify-center gap-4">
              {['Ananya S.', 'Rahul M.', 'Priya K.', 'Vikram R.', 'Sneha T.'].map(name => (
                <span key={name} className="px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                  {name}
                </span>
              ))}
              <span className="px-4 py-2 rounded-full bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-mono text-cyan-400 animate-pulse">
                And You?
              </span>
           </div>
        </div>
      </main>

      <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
    </div>
  );
}
