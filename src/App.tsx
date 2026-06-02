/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { BookOpen, Search, Briefcase, Heart, User, LogOut, Menu, X, Shield, Upload } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import Home from './pages/Home';
import Explore from './pages/Explore';
import Jobs from './pages/Jobs';
import Donate from './pages/Donate';
import Admin from './pages/Admin';
import ResourceUpload from './pages/ResourceUpload';
import Login from './pages/Login';

function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center neon-glow-cyan transition-transform group-hover:scale-105">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-white">
                Digital Library
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/explore" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
              Explore
              <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Link>
            <Link to="/jobs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
              Job Updates
              <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Link>
            <Link to="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
              Support
              <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Link>
            
            {userProfile?.role === 'admin' && (
              <Link to="/admin" className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-all flex items-center gap-2">
                <Shield size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin Panel</span>
              </Link>
            )}
            
            <div className="h-6 w-px bg-white/5 mx-2" />
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/upload" className="flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                  <Upload size={18} />
                  <span>Upload</span>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono">
                    {userProfile?.name?.substring(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 text-slate-500 hover:text-white transition-all"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="px-6 py-2 rounded-full bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition-all neon-glow-cyan">
                Get Started
              </Link>
            )}
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-slate-400">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-800 bg-[#030712] overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/explore" className="block px-3 py-4 text-base font-medium text-slate-300 hover:bg-slate-900 rounded-xl" onClick={() => setIsOpen(false)}>Explore</Link>
              <Link to="/jobs" className="block px-3 py-4 text-base font-medium text-slate-300 hover:bg-slate-900 rounded-xl" onClick={() => setIsOpen(false)}>Job Updates</Link>
              <Link to="/donate" className="block px-3 py-4 text-base font-medium text-slate-300 hover:bg-slate-900 rounded-xl" onClick={() => setIsOpen(false)}>Donate</Link>
              {user ? (
                <>
                  <Link to="/upload" className="block px-3 py-4 text-base font-medium text-blue-400" onClick={() => setIsOpen(false)}>Upload Resource</Link>
                  <button onClick={() => { logout(); setIsOpen(false); }} className="w-full text-left px-3 py-4 text-base font-medium text-red-400">Logout</button>
                </>
              ) : (
                <Link to="/login" className="block px-3 py-4 text-base font-medium text-white" onClick={() => setIsOpen(false)}>Sign In</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Login />;

  return (
    <>
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col selection:bg-blue-500/30 bg-[#05060B]">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={
              <ProtectedLayout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/donate" element={<Donate />} />
                  <Route path="/upload" element={<ResourceUpload />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </ProtectedLayout>
            } />
          </Routes>
          <footer className="bg-slate-950 border-t border-white/5 py-12 relative z-10">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex justify-center items-center gap-2 mb-4">
                <BookOpen className="text-cyan-500 w-6 h-6" />
                <span className="text-lg font-display font-bold text-white">The Digital Library</span>
              </div>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                Empowering students across India with accessible, high-quality educational resources.
              </p>
              <div className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
                &copy; 2026 DIGITAL LIBRARY PROJECT
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}
