'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Crown, 
  Wallet, 
  Receipt, 
  UserCheck, 
  Check, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  QrCode
} from 'lucide-react';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  description: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 149,
    duration: '30 Days',
    features: ['Premium notes', 'Exclusive PDFs', 'Priority support'],
    description: 'Good for trying premium materials with a lower entry price.'
  },
  {
    id: 'pro',
    name: '90 Days',
    price: 299,
    duration: '90 Days',
    features: ['All Basic benefits', 'Full premium library', 'Faster approvals'],
    description: 'Best value for regular learners who want full premium access.',
    popular: true
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 499,
    duration: '12 Months',
    features: ['Everything in 90 Days', 'Long-term savings', 'Featured member badge'],
    description: 'Long-term access for serious students and repeat visitors.'
  }
];

export default function PremiumCheckout() {
  const { user, userProfile, loading: authLoading, loginWithGoogle } = useAuth();
  const router = useRouter();
  const initRef = useRef(false);

  // States
  const [selectedPlanId, setSelectedPlanId] = useState('pro');
  const [fullName, setFullName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [simulatedTxnId, setSimulatedTxnId] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const handleCopyUpi = () => {
    navigator.clipboard.writeText('6372843175@okaxis');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  useEffect(() => {
    if (userProfile?.name && !fullName) {
      setFullName(userProfile.name);
    }
  }, [userProfile, fullName]);

  // Google Login Initialization
  useEffect(() => {
    if (user || authLoading) return;

    const initializeGSI = () => {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: "714314998273-55vo9d46u0n6alrfddfd2murgvcsjidg.apps.googleusercontent.com",
            callback: handleCredentialResponse,
          });
          
          const btnParent = document.getElementById("googleBtnPremium");
          if (btnParent) {
            (window as any).google.accounts.id.renderButton(
              btnParent,
              { theme: "filled_blue", size: "large", width: 340, shape: "pill" }
            );
          }
        } catch (e) {
          console.error("GSI Button rendering issue:", e);
        }
      } else {
        setTimeout(initializeGSI, 250);
      }
    };

    if (!initRef.current) {
      initRef.current = true;
      initializeGSI();
    }
  }, [user, authLoading]);

  const handleCredentialResponse = async (response: any) => {
    setError('');
    try {
      await loginWithGoogle(response.credential);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[1];

  // Helper to generate simulated txn ID
  const handleSimulatePayment = () => {
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const simulated = `TXN-MMMUT-${randomHex}`;
    setSimulatedTxnId(simulated);
    setTransactionId(simulated);
    setShowQR(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError('You must login to request activation.');
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!transactionId.trim()) return setError('Please enter your payment reference ID.');

    setLoading(true);
    setError('');

    try {
      const payload = {
        userId: user.uid,
        email: user.email,
        fullName: fullName.trim(),
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        transactionId: transactionId.trim(),
        status: 'pending',
        type: 'membership',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'paymentRequests'), payload);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment details.');
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
            className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/20 text-black"
          >
            <CheckCircle2 size={32} />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4 text-white">Request Submitted</h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm">
            Your transaction reference **{transactionId}** has been sent to the admin. Your membership will activate as soon as it is verified!
          </p>
          <p className="text-xs text-slate-600 font-mono">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="immersive-bg min-h-screen flex flex-col text-slate-200">
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
              {user && (
                <Link href="/dashboard" className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono text-cyan-400 uppercase hover:border-cyan-400 transition-all">
                  {userProfile?.name?.substring(0, 2) || 'ST'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12 w-full flex-grow relative z-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Premium Checkout
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Unlock Premium Library</h1>
            <p className="text-slate-500 text-sm mt-1">Get full security-unlocked access to all exclusive notes and premium exam papers.</p>
          </div>
          <Link href="/explore" className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500 hover:text-white transition-colors self-start md:self-center">
            <ArrowLeft size={14} /> Back to Library
          </Link>
        </div>

        {/* Step Cards Progress Indicators */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className={`p-4 rounded-xl border transition-all ${user ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-500'}`}>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <UserCheck size={16} /> 01. Connect Login
            </div>
            <p className="text-[10px] font-mono mt-1">{user ? `Signed In (${user.email})` : 'Google Login Required'}</p>
          </div>
          <div className={`p-4 rounded-xl border transition-all ${user ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-500'}`}>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Crown size={16} /> 02. Choose Plan
            </div>
            <p className="text-[10px] font-mono mt-1">Selected: {selectedPlan.name} (₹{selectedPlan.price})</p>
          </div>
          <div className="p-4 rounded-xl border bg-white/5 border-white/5 text-slate-500">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Wallet size={16} /> 03. Pay Manually
            </div>
            <p className="text-[10px] font-mono mt-1">UPI ID or QR scan payment</p>
          </div>
          <div className="p-4 rounded-xl border bg-white/5 border-white/5 text-slate-500">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Receipt size={16} /> 04. Submit Txn ID
            </div>
            <p className="text-[10px] font-mono mt-1">Wait for admin manual review</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-start">
          
          {/* Left Columns - Steps 1, 2, 3 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Login */}
            <div className="glass-card p-6 md:p-8 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">1</span>
                Connect Google Account
              </h2>
              {user ? (
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                  <div>
                    <span className="font-bold">Verified Account:</span> {user.email}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-[9px] font-bold uppercase">CONNECTED</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">Sign in with your college/personal Google Account to start the checkout process.</p>
                  <div className="flex justify-center min-h-[50px]">
                    <div id="googleBtnPremium" />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Choose Plan */}
            <div className={`glass-card p-6 md:p-8 space-y-6 ${!user ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">2</span>
                  Select Membership Duration
                </h2>
                <p className="text-xs text-slate-500 mt-1">Upgrade your study cycle. All plans grant access to the entire premium vault.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {plans.map((plan) => {
                  const isActive = selectedPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isActive
                          ? 'border-cyan-400/50 bg-cyan-500/[0.04] shadow-lg shadow-cyan-500/5'
                          : 'border-white/10 bg-white/[0.02] hover:border-cyan-500/30'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute right-3 top-3 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-400">
                          Popular
                        </span>
                      )}
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400">{plan.duration}</span>
                        <h3 className="text-base font-bold text-white mt-1">{plan.name}</h3>
                        <p className="text-2xl font-bold text-white mt-2">₹{plan.price}</p>
                        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{plan.description}</p>
                      </div>

                      <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-center gap-1.5 text-[9px] text-slate-400">
                            <Check className="text-cyan-400 shrink-0" size={10} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Pay Manually */}
            <div className={`glass-card p-6 md:p-8 space-y-6 ${!user ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">3</span>
                  Complete Payment
                </h2>
                <p className="text-xs text-slate-500 mt-1">Scan the QR code below or transfer to the UPI ID to pay manually.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center p-6 rounded-2xl bg-white/[0.01] border border-white/5">
                <div className="w-36 h-36 bg-white rounded-xl flex items-center justify-center p-2 shrink-0 shadow-lg shadow-white/5 relative">
                  <QrCode size={130} className="text-slate-900" />
                  <div className="absolute inset-0 bg-[#000]/2 bg-opacity-10 rounded-xl" />
                </div>

                <div className="flex-grow space-y-3 text-center md:text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block">PAYEE UPI ID</span>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <p className="text-sm font-mono text-white font-bold tracking-wider">6372843175@okaxis</p>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-black rounded text-[9px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                      >
                        {copiedUpi ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">PAYMENT VALUE</span>
                    <p className="text-lg font-bold text-cyan-400">INR {selectedPlan.price}.00</p>
                  </div>
                  <div className="p-3 bg-amber-400/5 border border-amber-400/10 rounded-xl text-[10px] text-amber-400 font-bold uppercase tracking-wider leading-relaxed">
                    ⚠️ Plan amount: ₹{selectedPlan.price}.00. Is plan ka exact amount aur payment reference transaction ID transfer ke baad niche form me fill (copy-paste) krna compulsory hai.
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                    <button
                      type="button"
                      onClick={handleSimulatePayment}
                      className="px-4 py-2 bg-cyan-500 text-black font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-cyan-400 transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      Simulate Test Payment
                    </button>
                    <span className="text-[10px] text-slate-500 self-center">For testing, generates reference automatically</span>
                  </div>
                </div>
              </div>

              {showQR && (
                <div className="p-4 bg-cyan-500/5 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs space-y-1 font-mono">
                  <p className="font-bold flex items-center gap-1.5"><Check size={14} /> Test Payment Successful!</p>
                  <p>Transaction ID **{simulatedTxnId}** generated.</p>
                  <p className="text-[10px] text-slate-500">Paste this reference ID into the form in Step 4 below.</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Step 4 (Sticky checkout summary & submission) */}
          <div className="space-y-6 lg:sticky lg:top-24">
            
            {/* Membership status card */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Crown className="text-cyan-400" size={16} /> Membership Status
              </h2>
              {userProfile?.planStatus === 'Paid' ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><CheckCircle2 size={14} /> Active Premium Account</p>
                  <p className="text-slate-400 font-mono text-[10px]">Expiry: {userProfile.expiryDate}</p>
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                  <Lock size={14} />
                  <span>No active premium membership.</span>
                </div>
              )}
            </div>

            {/* Step 4 Submission Form */}
            <div className={`glass-card p-6 space-y-6 ${!user ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">4</span>
                  Submit Activation Request
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">Admin will verify your payment and activate your premium pass.</p>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Your Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Payment Reference / Transaction ID</label>
                  <input
                    required
                    type="text"
                    placeholder="Paste reference or UPI Txn ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full h-11 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] text-slate-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Plan level:</span>
                    <span className="text-white font-bold">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-white font-mono">{selectedPlan.duration}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5">
                    <span>Amount:</span>
                    <span className="text-cyan-400 font-bold">₹{selectedPlan.price}.00</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button
                  disabled={loading || !user}
                  type="submit"
                  className="w-full h-12 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Submit Payment to Admin'}
                </button>
              </form>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
