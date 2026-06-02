import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, BookOpen, Download, User as UserIcon, Calendar, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

const categories = [
  "GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"
];

const branches = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Explore() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedResourceType, setSelectedResourceType] = useState('All'); // note or pyq
  
  const [viewingResource, setViewingResource] = useState<any>(null);
  const [purchasedResourceIds, setPurchasedResourceIds] = useState<string[]>([]);

  useEffect(() => {
    const categoryFromQuery = searchParams.get('category');
    if (categoryFromQuery) setSelectedCategory(categoryFromQuery);
  }, [searchParams]);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    } else {
      setPurchasedResourceIds([]);
    }
  }, [user]);

  useEffect(() => {
    const handleModalKeys = (e: KeyboardEvent) => {
      if (viewingResource) {
        if ((e.ctrlKey && e.key === 'p') || (e.ctrlKey && e.key === 's')) {
          e.preventDefault();
          alert('Printing and saving this restricted document is blocked to protect intellectual property.');
        }
      }
    };
    window.addEventListener('keydown', handleModalKeys);
    return () => window.removeEventListener('keydown', handleModalKeys);
  }, [viewingResource]);

  const fetchPurchases = async () => {
    try {
      const q = query(
        collection(db, 'purchases'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map(doc => doc.data().resourceId);
      setPurchasedResourceIds(ids);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'resources'),
        where('isVerified', '==', true),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    const matchesBranch = selectedBranch === 'All' || res.branch === selectedBranch;
    const matchesType = selectedResourceType === 'All' || res.resourceType === selectedResourceType;
    return matchesSearch && matchesCategory && matchesBranch && matchesType;
  });

  const handlePayment = (resource: any) => {
    if (!user) return alert('Please login to purchase');
    
    const options = {
      key: "rzp_test_placeholder",
      amount: resource.price * 100,
      currency: "INR",
      name: "The Digital Library",
      description: `Purchase ${resource.title}`,
      handler: async function (response: any) {
        try {
          await addDoc(collection(db, 'purchases'), {
            userId: user.uid,
            resourceId: resource.id,
            purchasedAt: new Date().toISOString()
          });
          alert('Payment Successful! You can now access this resource.');
          fetchPurchases();
        } catch (err: any) {
          console.error(err);
          alert('Failed to save purchase details. Please contact support.');
        }
      },
      prefill: {
        email: user.email,
        name: user.displayName
      },
      theme: { color: "#06b6d4" }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="immersive-bg min-h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      <div className="ambient-glow-1" />
      
      {/* Mobile Filters */}
      <div className="lg:hidden sticky top-0 z-20 bg-[#05060B]/80 backdrop-blur-md border-b border-white/5 px-4 py-4 space-y-4">
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none no-scrollbar">
          <button onClick={() => setSelectedCategory('All')} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${selectedCategory === 'All' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-400'}`}>All Archives</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${selectedCategory === cat ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-400'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="w-80 glass-sidebar hidden lg:flex flex-col gap-8 p-8 relative z-10 shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">Archive Category</p>
          <div className="space-y-1">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === cat ? 'accent-cyan text-white shadow-lg shadow-cyan-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {selectedCategory === 'GATE' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">GATE Branches</p>
            <div className="space-y-1">
              {['All', ...branches].map(b => (
                <button 
                  key={b} 
                  onClick={() => setSelectedBranch(b)}
                  className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg ${selectedBranch === b ? 'text-cyan-400' : 'text-slate-600 hover:text-white'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">Resource Type</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSelectedResourceType('pyq')} className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedResourceType === 'pyq' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>PYQ</button>
            <button onClick={() => setSelectedResourceType('note')} className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedResourceType === 'note' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>Note</button>
            <button onClick={() => setSelectedResourceType('All')} className="col-span-2 py-2 text-[10px] font-bold text-slate-600 uppercase">Clear Filter</button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 lg:p-12 relative z-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl font-display font-bold text-white mb-2">{selectedCategory} {selectedBranch !== 'All' ? `- ${selectedBranch}` : ''}</h2>
              <p className="text-slate-500">{filteredResources.length} available study modules.</p>
            </div>
            <div className="relative w-full md:w-96 group">
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-full pl-12 pr-6 text-sm focus:border-cyan-400 outline-none transition-all text-slate-200"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            <AnimatePresence mode="popLayout">
              {filteredResources.map((res) => (
                <motion.div
                  layout
                  key={res.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-8 flex flex-col group relative"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                        <BookOpen size={20} />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">{res.title}</h3>
                  <p className="text-slate-500 text-xs mb-10 line-clamp-3 leading-relaxed">
                    {res.description || 'Verified academic resource.'}
                  </p>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      By {res.uploaderName}
                    </div>
                    {res.isPaid && !purchasedResourceIds.includes(res.id) ? (
                      <button onClick={() => handlePayment(res)} className="px-5 py-2 rounded-lg bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-orange-400 transition-all">
                        BUY ₹{res.price}
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          if (['text', 'pdf', 'pdf-gdrive'].includes(res.contentType)) {
                            setViewingResource(res);
                          } else {
                            window.open(res.fileUrl, '_blank');
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 text-xs font-bold hover:bg-cyan-400 hover:text-black transition-all"
                      >
                        VIEW IN READER →
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Secure Digital Reader Modal */}
      <AnimatePresence>
        {viewingResource && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="max-w-5xl w-full h-[85vh] glass-card flex flex-col relative overflow-hidden">
              <button 
                onClick={() => setViewingResource(null)}
                className="absolute -top-2 -right-2 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-slate-200 transition-all shadow-xl z-[110]"
              >
                <ChevronRight className="rotate-45" size={24} />
              </button>
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#070912]">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{viewingResource.title}</h2>
                  <p className="text-xs text-slate-500">By {viewingResource.uploaderName} • Secure Academic Archive Node</p>
                </div>
                <span className="px-3 py-1 bg-cyan-400/10 text-cyan-400 text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Protected Viewer
                </span>
              </div>
              
              {/* Reader Content Render based on format */}
              {viewingResource.contentType === 'text' && (
                <div className="flex-1 overflow-y-auto p-10 font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-none">
                  {viewingResource.textContent}
                </div>
              )}

              {viewingResource.contentType === 'pdf' && (
                <div className="flex-1 w-full bg-[#0A0C16] relative overflow-hidden">
                  <iframe
                    src={`${viewingResource.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 select-none"
                    title={viewingResource.title}
                  />
                  <div className="absolute inset-0 bg-transparent pointer-events-none" />
                </div>
              )}

              {viewingResource.contentType === 'pdf-gdrive' && (
                <div className="flex-1 w-full bg-[#0A0C16] relative overflow-hidden">
                  <iframe
                    src={(function() {
                      const url = viewingResource.fileUrl || '';
                      if (url.includes('/preview')) return url;
                      const regD = /\/file\/d\/([a-zA-Z0-9_-]+)/;
                      const regId = /[?&]id=([a-zA-Z0-9_-]+)/;
                      let match = url.match(regD);
                      if (!match) match = url.match(regId);
                      return match && match[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
                    })()}
                    className="w-full h-full border-0 select-none"
                    title={viewingResource.title}
                    allow="autoplay"
                  />
                  <div className="absolute inset-0 bg-transparent pointer-events-none" />
                </div>
              )}

              <div className="p-6 border-t border-white/5 bg-[#070912] text-center flex items-center justify-between px-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Node: DL-SECURE-ALPHA</span>
                <span>Restricted View-Only Mode • Downloads & Prints Blocked</span>
                <span>Protected by Digital Library</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </div>
  );
}
