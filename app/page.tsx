'use client';

import { useAuth } from './lib/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Briefcase, 
  Heart, 
  GraduationCap, 
  Rocket, 
  ChevronRight, 
  Zap, 
  Shield, 
  Upload, 
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

const quickLinks = [
  { name: 'GATE Archive', path: '/explore?category=GATE' },
  { name: 'UPSC Notes', path: '/explore?category=UPSC' },
  { name: 'Career Updates', path: '/jobs' },
  { name: 'SSC Prep', path: '/explore?category=SSC' },
  { name: 'Internships', path: '/jobs' },
];

const features = [
  {
    title: "Academic Excellence",
    description: "Access curated notes, previous year questions, and textbooks tailored for Indian universities.",
    icon: GraduationCap,
  },
  {
    title: "Competitive Ready",
    description: "Specialized resources for GATE, UPSC, SSC, and CAT to help you ace your entrance exams.",
    icon: Rocket,
  },
  {
    title: "Career Advancement",
    description: "Real-time job and internship updates integrated with placement preparation guides.",
    icon: Briefcase,
  }
];

export default function Home() {
  const { user, userProfile, logout, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="immersive-bg flex flex-col min-h-screen">
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

            <div className="hidden md:flex items-center gap-8">
              <Link href="/explore" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
                Explore
              </Link>
              <Link href="/jobs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
                Job Updates
              </Link>
              <Link href="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
                Support
              </Link>
              
              {userProfile?.role === 'admin' && (
                <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-all flex items-center gap-2">
                  <Shield size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin Panel</span>
                </Link>
              )}
              
              <div className="h-6 w-px bg-white/5 mx-2" />
              
              {user ? (
                <div className="flex items-center gap-4">
                  <Link href="/upload" className="flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                    <Upload size={18} />
                    <span>Upload</span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono text-cyan-400 uppercase">
                      {userProfile?.name?.substring(0, 2) || 'ST'}
                    </div>
                    <button 
                      onClick={() => logout().then(() => router.push('/login'))}
                      className="p-2 text-slate-500 hover:text-white transition-all"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/login" className="px-6 py-2 rounded-full bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition-all neon-glow-cyan">
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        {/* User Dashboard Section (If Logged In) */}
        {user && userProfile && (
          <section className="max-w-7xl mx-auto px-4 w-full pt-10 pb-6">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 bg-gradient-to-br from-[#0B0D19] to-[#06080F]/90 border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/[0.02] blur-[80px] pointer-events-none" />
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-xl shadow-cyan-500/10">
                    <div className="w-full h-full bg-[#05060B] rounded-full flex items-center justify-center font-mono font-bold text-lg text-white">
                      {userProfile.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1 flex items-center gap-2">
                      Welcome back, {userProfile.name}
                      <span className="text-xs font-mono uppercase bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">{userProfile.role} Node</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">{userProfile.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full lg:w-auto border-t lg:border-t-0 border-white/5 pt-6 lg:pt-0">
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Target Batch</p>
                    <p className="text-sm font-bold text-slate-200">{userProfile.batch}</p>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl relative overflow-hidden">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Plan Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${userProfile.planStatus === 'Paid' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-yellow-500 shadow-[0_0_8px_#eab308]'} animate-pulse`} />
                      <p className="text-sm font-bold text-slate-200">{userProfile.planStatus} Node</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Expiry Date</p>
                    <p className="text-sm font-mono font-bold text-slate-200">{userProfile.expiryDate}</p>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Library Access</p>
                    <p className="text-sm font-bold text-cyan-400">All Modules Enabled</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Hero Section */}
        <section className="relative pt-16 pb-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-400/10 border border-cyan-400/20 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                All-in-One Learning Resource
              </span>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-bold tracking-tight mb-8 text-white">
                The Digital <span className="text-cyan-400">Library</span>
              </h1>
              <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed px-4">
                Experience a highly secure viewing ecosystem for Indian scholars. Curated notes, PYQs, and career pathways accessible in one unified secure archive.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 px-4">
                <Link href="/explore" className="w-full sm:w-auto px-10 py-4 rounded-xl bg-cyan-500 text-white font-bold flex items-center justify-center gap-2 neon-glow-cyan hover:bg-cyan-400 transition-all active:scale-95">
                  Explore Resources <ChevronRight size={20} />
                </Link>
                <Link href="/jobs" className="w-full sm:w-auto px-10 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                  Latest Job Updates
                </Link>
              </div>

              {/* Quick Access Bar */}
              <div className="max-w-4xl mx-auto p-4 glass-card bg-white/[0.02] flex flex-col sm:flex-row justify-center items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest sm:border-r sm:border-white/10 sm:pr-6">
                  <Zap size={14} className="text-yellow-500" />
                  Quick Access
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                  {quickLinks.map((link) => (
                    <Link key={link.name} href={link.path} className="text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Community Heartbeat Section */}
        <section className="py-24 relative z-10 bg-white/[0.01]">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-pink-500/20">
              <Heart className="text-pink-500" size={24} />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-6">Community Heartbeat</h2>
            <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
              We would like to thank our incredible community of contributors who have shared over 10,000 resources. You are the heartbeat of this platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Ananya S.', 'Rahul M.', 'Priya K.', 'Vikram R.'].map((name) => (
                <div key={name} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-10 flex flex-col items-start gap-8 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/50 transition-all">
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                  <div className="mt-auto pt-6 w-full">
                    <Link href={feature.title === 'Career Advancement' ? '/jobs' : '/explore'} className="text-sm font-bold text-cyan-400 hover:text-white transition-colors">
                      Explore Now →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <BookOpen className="text-cyan-500 w-6 h-6" />
            <span className="text-lg font-display font-bold text-white">The Digital Library</span>
          </div>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
            Empowering students across India with secure, restricted, and accessible high-quality educational resources.
          </p>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
            &copy; 2026 DIGITAL LIBRARY SECURE ECOSYSTEM
          </div>
        </div>
      </footer>
    </div>
  );
}
