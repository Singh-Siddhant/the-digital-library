'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Landmark, Book, Share2, Coffee, Sparkles, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Donate() {
  const { user, userProfile } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState('₹500');
  const [showUpiDetails, setShowUpiDetails] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const upiId = '6372843175@okaxis';

  // Form states
  const [payName, setPayName] = useState('');
  const [payTxnId, setPayTxnId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState('');

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleDonate = () => {
    setShowUpiDetails(true);
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setPayError('You must login to submit donation details.');
    if (!payName.trim()) return setPayError('Please enter your full name.');
    if (!payTxnId.trim()) return setPayError('Please enter your payment reference ID.');

    setPayLoading(true);
    setPayError('');

    try {
      const numericAmount = parseInt(selectedAmount.replace(/[^\d]/g, ''), 10);
      const payload = {
        userId: user.uid,
        email: user.email,
        fullName: payName.trim(),
        amount: numericAmount,
        transactionId: payTxnId.trim(),
        status: 'pending',
        type: 'donation',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'paymentRequests'), payload);
      setPaySuccess(true);
    } catch (err: any) {
      setPayError(err.message || 'Failed to submit donation details.');
    } finally {
      setPayLoading(false);
    }
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
              {!showUpiDetails ? (
                <button 
                  onClick={handleDonate}
                  className="w-full h-14 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider shadow-lg"
                >
                   Support with UPI <Landmark size={16} />
                </button>
              ) : paySuccess ? (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full p-6 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-black">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Donation Logged</h4>
                  <p className="text-xs text-slate-400 font-mono">Reference pending admin verification. Thank you for your support! 🙏</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4"
                >
                  <form onSubmit={handleDonationSubmit} className="space-y-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1 shrink-0 relative">
                        <QrCode size={56} className="text-slate-900" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block">PAYEE UPI ID</span>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-white font-bold tracking-wider">{upiId}</p>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-2 py-0.5 bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-black rounded text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                          >
                            {copiedUpi ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="text-xs font-bold text-slate-400 mt-1">
                          Amount: <span className="text-cyan-400">{selectedAmount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-400/5 border border-amber-400/10 rounded-lg text-[9px] text-amber-400 font-bold uppercase tracking-wider leading-relaxed text-center">
                      ⚠️ Transfer exactly {selectedAmount}.00 to the UPI ID. Fill details below after payment.
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Your Full Name</label>
                      <input
                        required
                        type="text"
                        placeholder="Your Name"
                        value={payName}
                        onChange={(e) => setPayName(e.target.value)}
                        className="w-full h-10 px-3 bg-[#030408] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
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

                    <button
                      type="submit"
                      disabled={payLoading}
                      className="w-full h-11 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {payLoading ? 'Submitting...' : 'Submit Donation Confirmation'}
                    </button>
                  </form>
                </motion.div>
              )}
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
      {/* Razorpay checkout script removed to keep UPI only option */}
    </div>
  );
}
