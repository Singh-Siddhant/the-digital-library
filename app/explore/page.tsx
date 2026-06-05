'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadPdfDocument } from '../lib/pdfViewer';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  BookOpen, 
  ChevronRight, 
  Upload, 
  LogOut, 
  Download, 
  Lock,
  ChevronLeft,
  Crown,
  AlertCircle,
  QrCode,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

const categories = [
  "GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"
];

const branches = [
  "Computer Science", "Electrical Engineering", "Mechanical Engineering", 
  "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"
];

const semesters = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4", 
  "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
}

const PdfPage: React.FC<PdfPageProps> = ({ pdfDoc, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setLoading(true);
        
        renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });

        await renderTask.promise;
        if (!cancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error(`Failed to render page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div className="relative flex justify-center w-full mb-4 select-none pointer-events-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 rounded z-10">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto rounded border border-white/5 shadow-2xl bg-[#030407] select-none pointer-events-none"
      />
    </div>
  );
};

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, logout } = useAuth();
  
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedResourceType, setSelectedResourceType] = useState('All'); // note or pyq
  
  const [viewingResource, setViewingResource] = useState<any>(null);
  const [purchasedResourceIds, setPurchasedResourceIds] = useState<string[]>([]);

  // PDF.js Canvas Rendering states
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.25);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  
  // Custom Payment Modal for Single Paid Resource
  const [payModalResource, setPayModalResource] = useState<any>(null);
  const [payName, setPayName] = useState('');
  const [payTxnId, setPayTxnId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState('');
  
  // Custom non-blocking security warning toast
  const [securityToast, setSecurityToast] = useState("");
  const toastTimeoutRef = useRef<any>(null);

  const showSecurityToast = (msg: string) => {
    setSecurityToast(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setSecurityToast("");
    }, 3000);
  };

  // Security Flags
  const isCyber = userProfile?.role === 'cyber';
  const isAdmin = userProfile?.role === 'admin';
  const isPremiumActive = userProfile?.planStatus === 'Paid' && (
    !userProfile.expiryDate || 
    userProfile.expiryDate === 'N/A' || 
    new Date(userProfile.expiryDate).getTime() > Date.now()
  );

  // Guest redirect check removed to allow compulsory public catalog display

  useEffect(() => {
    const categoryFromQuery = searchParams?.get('category');
    if (categoryFromQuery) {
      setSelectedCategory(categoryFromQuery);
      setSelectedBranch('All');
      setSelectedSemester('All');
    }
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

  // Handle URL redirect query param to auto-open resource
  useEffect(() => {
    const targetId = searchParams?.get('id');
    if (targetId && resources.length > 0) {
      const targetRes = resources.find(r => r.id === targetId);
      if (targetRes) {
        const isUnlocked = isCyber || isAdmin || !targetRes.isPaid || isPremiumActive || purchasedResourceIds.includes(targetRes.id);
        if (isUnlocked) {
          setViewingResource(targetRes);
        } else {
          setPayModalResource(targetRes);
        }
      }
    }
  }, [searchParams, resources, purchasedResourceIds, isPremiumActive, isCyber, isAdmin]);

  // Load PDF Document when viewingResource changes
  useEffect(() => {
    let cancelled = false;
    if (!viewingResource || getResourceMediaType(viewingResource) !== 'pdf') {
      setPdfDoc(null);
      setPdfTotalPages(0);
      setPdfPage(1);
      setPdfError("");
      return;
    }

    const loadPdf = async () => {
      setPdfLoading(true);
      setPdfError("");
      try {
        const response = await fetch(`/api/resource/${viewingResource.id}`);
        if (!response.ok) {
          let errMsg = `Unable to fetch secure document from server (Status ${response.status}).`;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errMsg = `${errData.error} (Status ${response.status})`;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const loadedPdf = await loadPdfDocument(bytes);
        if (!cancelled) {
          setPdfDoc(loadedPdf);
          setPdfTotalPages(loadedPdf.numPages);
          setPdfPage(1);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("PDF.js loading failed:", err);
          setPdfError(err.message || "Failed to load secure PDF document.");
          alert("Secure Viewer Error: " + (err.message || err.toString()));
        }
      } finally {
        if (!cancelled) {
          setPdfLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [viewingResource]);

  // Scroll & Zoom Handlers for PDF Canvas List
  const handlePdfScroll = () => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const pageNodes = container.childNodes;
    const containerScrollTop = container.scrollTop;
    
    let currentPage = 1;
    let minDistance = Infinity;

    for (let i = 0; i < pageNodes.length; i++) {
      const node = pageNodes[i] as HTMLElement;
      if (node && node.offsetTop !== undefined) {
        const distance = Math.abs(node.offsetTop - containerScrollTop);
        if (distance < minDistance) {
          minDistance = distance;
          currentPage = i + 1;
        }
      }
    }
    
    setPdfPage((prev) => {
      if (prev !== currentPage) {
        return currentPage;
      }
      return prev;
    });
  };

  const scrollToPdfPage = (pageNum: number) => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const pageNodes = container.childNodes;
    const targetNode = pageNodes[pageNum - 1] as HTMLElement;
    if (targetNode) {
      container.scrollTo({
        top: targetNode.offsetTop,
        behavior: 'smooth'
      });
      setPdfPage(pageNum);
    }
  };

  // Attach Ctrl+Wheel zoom listener manually to allow preventing browser zoom
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setPdfScale(s => Math.min(3.0, Math.max(0.6, s + delta)));
      }
    };

    container.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelZoom);
    };
  }, [pdfDoc, pdfLoading]);

  // Global ContextMenu Blocker (Capturing Phase) to block right-clicks everywhere (including scrollbars/slide bar)
  useEffect(() => {
    const handleContextMenuGlobal = (e: MouseEvent) => {
      if (viewingResource) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenuGlobal, true);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenuGlobal, true);
    };
  }, [viewingResource]);

  // Media Type detection helper
  const getResourceMediaType = (res: any) => {
    if (!res) return 'pdf';
    const type = (res.contentType || '').toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('video') || type.includes('mp4')) return 'video';
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('gif') || type.includes('webp')) return 'image';
    
    // Fallback to URL or name
    const url = (res.fileUrl || '').toLowerCase();
    const name = (res.fileName || '').toLowerCase();
    if (url.includes('.pdf') || name.includes('.pdf')) return 'pdf';
    if (url.includes('.mp4') || name.includes('.mp4') || url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
    if (url.includes('.png') || name.includes('.png') || url.includes('.jpg') || name.includes('.jpg') || url.includes('.jpeg') || name.includes('.jpeg') || url.includes('.gif') || name.includes('.gif') || url.includes('.webp') || name.includes('.webp')) return 'image';
    
    return 'pdf'; // Default fallback
  };



  useEffect(() => {
    const handleModalKeys = (e: KeyboardEvent) => {
      if (viewingResource) {
        const key = e.key.toLowerCase();
        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        // Block Ctrl+P / Cmd+P (Print)
        if (ctrlOrCmd && key === 'p') {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Printing this secure academic file is disabled.');
          return;
        }
        // Block Ctrl+S / Cmd+S (Save)
        if (ctrlOrCmd && key === 's') {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Saving this secure academic file is disabled.');
          return;
        }
        // Block Ctrl+U / Cmd+U (View Source)
        if (ctrlOrCmd && key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Viewing source code is disabled.');
          return;
        }
        // Block DevTools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (
          e.key === 'F12' || 
          (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Developer tools are disabled in secure viewing mode.');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleModalKeys, true);
    return () => {
      window.removeEventListener('keydown', handleModalKeys, true);
    };
  }, [viewingResource]);

  const fetchPurchases = async () => {
    if (!user) return;
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
        where('isVerified', '==', true)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by createdAt desc to bypass index limits
      data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setResources(data);
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedBranch('All');
    setSelectedSemester('All');
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    
    // Branch applies to GATE & Semester Notes
    const isBranchApplicable = selectedCategory === 'GATE' || selectedCategory === 'Semester Notes';
    const matchesBranch = !isBranchApplicable || selectedBranch === 'All' || res.branch === selectedBranch;

    // Semester applies to Semester Notes only
    const isSemesterApplicable = selectedCategory === 'Semester Notes';
    const matchesSemester = !isSemesterApplicable || selectedSemester === 'All' || res.semester === selectedSemester;

    const matchesType = selectedResourceType === 'All' || res.resourceType === selectedResourceType;
    
    return matchesSearch && matchesCategory && matchesBranch && matchesSemester && matchesType;
  });

  const handleManualResourceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please login to request access.');
    if (!payName.trim()) return setPayError('Name is required.');
    if (!payTxnId.trim()) return setPayError('Transaction ID is required.');

    setPayLoading(true);
    setPayError('');

    try {
      await addDoc(collection(db, 'paymentRequests'), {
        userId: user.uid,
        email: user.email,
        fullName: payName.trim(),
        resourceId: payModalResource.id,
        resourceTitle: payModalResource.title,
        amount: payModalResource.price,
        transactionId: payTxnId.trim(),
        status: 'pending',
        type: 'resource',
        createdAt: new Date().toISOString()
      });

      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setPayModalResource(null);
        setPayName('');
        setPayTxnId('');
      }, 3000);
    } catch (err: any) {
      setPayError(err.message || 'Failed to submit payment request.');
    } finally {
      setPayLoading(false);
    }
  };

  const generateSimulatedTxn = () => {
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const simulated = `TXN-RES-${randomHex}`;
    setPayTxnId(simulated);
  };

  return (
    <div className="immersive-bg min-h-screen flex flex-col">
      <div className="ambient-glow-1" />

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
              <Link href="/explore" className="text-sm font-medium text-white transition-colors relative">
                Explore
                <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-cyan-400" />
              </Link>
              <Link href="/jobs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Job Updates
              </Link>
              <Link href="/premium" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-cyan-400">
                <Crown size={14} className="animate-pulse" /> Premium
              </Link>
              <Link href="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Support
              </Link>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <Link href="/upload" className="flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                    <Upload size={18} />
                    <span>Upload</span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold font-mono text-cyan-400 uppercase hover:border-cyan-400 transition-all">
                      {userProfile?.name?.substring(0, 2) || 'ST'}
                    </Link>
                    <button 
                      onClick={() => logout().then(() => router.push('/'))}
                      className="p-2 text-slate-500 hover:text-white transition-all"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <Link 
                  href="/" 
                  className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-cyan-400 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Layout Sidebar + Content */}
      <div className="flex-grow flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="w-80 glass-sidebar hidden lg:flex flex-col gap-8 p-8 relative z-10 shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">Archive Category</p>
            <div className="space-y-1">
              {['All', ...categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${selectedCategory === cat ? 'accent-cyan text-white shadow-lg shadow-cyan-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {/* Semester Filters (Semester Notes only) */}
            {selectedCategory === 'Semester Notes' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-4">Academic Semester</p>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {['All', ...semesters].map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSelectedSemester(s)}
                      className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg ${selectedSemester === s ? 'text-cyan-400' : 'text-slate-600 hover:text-white'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Branch Filters (GATE and Semester Notes only) */}
            {(selectedCategory === 'GATE' || selectedCategory === 'Semester Notes') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-4">
                  {selectedCategory === 'GATE' ? 'GATE Branches' : 'Academic Branches'}
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
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
          </AnimatePresence>

          <div className="mt-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-6">Resource Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSelectedResourceType('pyq')} className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedResourceType === 'pyq' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>PYQ</button>
              <button onClick={() => setSelectedResourceType('note')} className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedResourceType === 'note' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>Note</button>
              <button onClick={() => setSelectedResourceType('All')} className="col-span-2 py-2 text-[10px] font-bold text-slate-600 uppercase">Clear Filter</button>
            </div>
          </div>
        </aside>

        {/* Dynamic content */}
        <main className="flex-1 p-8 lg:p-12 relative z-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-display font-bold text-white mb-2">
                  {selectedCategory} 
                  {selectedSemester !== 'All' ? ` - ${selectedSemester}` : ''}
                  {selectedBranch !== 'All' ? ` - ${selectedBranch}` : ''}
                </h2>
                <p className="text-slate-500">{filteredResources.length} secure study modules available.</p>
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
                {filteredResources.map((res) => {
                  const isPaid = res.isPaid;
                  const isUnlocked = isCyber || isAdmin || !isPaid || isPremiumActive || purchasedResourceIds.includes(res.id);

                  return (
                    <motion.div
                      layout
                      key={res.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-8 flex flex-col group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                          <BookOpen size={20} />
                        </div>
                        {isPaid && !isUnlocked && (
                          <span className="px-2 py-1 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Lock size={10} /> Paid Reference
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">{res.title}</h3>
                      <p className="text-slate-500 text-xs mb-8 line-clamp-3 leading-relaxed">
                        {res.description || 'Verified academic study reference module.'}
                      </p>

                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[9px] font-mono text-slate-600 uppercase">
                          BY {res.uploaderName || 'ANONYMOUS'}
                        </div>
                        {isPaid && !isUnlocked ? (
                          <button 
                            onClick={() => setPayModalResource(res)} 
                            className="px-5 py-2 rounded-lg bg-orange-505 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 transition-all cursor-pointer shadow-lg shadow-orange-600/20"
                          >
                            UNLOCK ₹{res.price}
                          </button>
                        ) : (
                          <button 
                            onClick={() => setViewingResource(res)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 text-xs font-bold hover:bg-cyan-400 hover:text-black transition-all cursor-pointer"
                          >
                            VIEW SECURE COPY →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Unlock Resource Modal / UPI Request form */}
      <AnimatePresence>
        {payModalResource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }}
              className="max-w-md w-full glass-card p-8 border border-white/10 bg-[#0A0C16] relative overflow-hidden"
            >
              <button 
                onClick={() => setPayModalResource(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2 text-orange-400 mb-4">
                <Lock size={20} />
                <h3 className="text-xl font-bold">Unlock Study Resource</h3>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                You are requesting access to **{payModalResource.title}**. You can pay manually to activate access, or join **Premium** to unlock all resources.
              </p>

              {paySuccess ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-black">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Request Logged</h4>
                  <p className="text-xs text-slate-400 font-mono">Reference pending admin verification. Tracking updates on your Dashboard.</p>
                </div>
              ) : (
                <form onSubmit={handleManualResourceRequest} className="space-y-4">
                  
                  {/* UPI QR display */}
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex items-center gap-4">
                    <QrCode size={70} className="bg-white p-1 rounded text-slate-900 shrink-0" />
                    <div className="text-xs space-y-1 font-mono text-slate-400">
                      <div>UPI ID: <strong className="text-white">majorguru09@okaxis</strong></div>
                      <div>AMOUNT: <strong className="text-cyan-400">₹{payModalResource.price}.00</strong></div>
                      <button 
                        type="button" 
                        onClick={generateSimulatedTxn}
                        className="text-[9px] uppercase font-bold text-cyan-400 underline hover:text-cyan-300 block pt-1"
                      >
                        Simulate Payment Code
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Your Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Siddhant Singh"
                      value={payName}
                      onChange={(e) => setPayName(e.target.value)}
                      className="w-full h-10 px-3 bg-[#030408] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
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

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={payLoading}
                      className="flex-1 h-11 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {payLoading ? 'Submitting...' : 'Submit Txn ID'}
                    </button>
                    <Link
                      href="/premium"
                      className="flex-1 h-11 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer shadow-lg shadow-cyan-500/10"
                    >
                      Go Premium <Crown size={12} className="ml-1" />
                    </Link>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Digital Reader Modal */}
      <AnimatePresence>
        {viewingResource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 select-none"
            style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
          >
            <div className="max-w-5xl w-full h-[88vh] glass-card flex flex-col relative overflow-hidden bg-[#05060B]">
              <button 
                onClick={() => setViewingResource(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-slate-200 transition-all shadow-xl z-[110]"
              >
                <ChevronLeft size={20} className="rotate-180" />
              </button>

              <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between bg-[#070912] gap-4 pr-16">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{viewingResource.title}</h2>
                  <p className="text-xs text-slate-500">By {viewingResource.uploaderName || 'Verified Scholar'}</p>
                </div>

                {/* PDF Canvas Toolbar Controls */}
                {getResourceMediaType(viewingResource) === 'pdf' && pdfDoc && (
                  <div className="flex flex-wrap items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-2 rounded-xl text-xs">
                    <button
                      disabled={pdfPage <= 1}
                      onClick={() => scrollToPdfPage(pdfPage - 1)}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-black rounded font-bold uppercase text-[9px] tracking-wider transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-slate-400 font-mono text-[10px] min-w-[50px] text-center">
                      {pdfPage} / {pdfTotalPages}
                    </span>
                    <button
                      disabled={pdfPage >= pdfTotalPages}
                      onClick={() => scrollToPdfPage(pdfPage + 1)}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-cyan-400 hover:text-black rounded font-bold uppercase text-[9px] tracking-wider transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white cursor-pointer"
                    >
                      Next
                    </button>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <button
                      onClick={() => setPdfScale(s => Math.max(0.6, s - 0.15))}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded font-bold uppercase text-[9px] tracking-wider cursor-pointer"
                    >
                      Zoom -
                    </button>
                    <span className="text-slate-400 font-mono text-[10px] min-w-[40px] text-center">
                      {Math.round(pdfScale * 100)}%
                    </span>
                    <button
                      onClick={() => setPdfScale(s => Math.min(3.0, s + 0.15))}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded font-bold uppercase text-[9px] tracking-wider cursor-pointer"
                    >
                      Zoom +
                    </button>
                    <button
                      onClick={() => setPdfScale(1.25)}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded font-bold uppercase text-[9px] tracking-wider text-slate-400 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
              
              {/* Reader Proxy View Render (Google Drive raw links never exposed) */}
              <div className="flex-1 w-full bg-[#030407] relative overflow-hidden flex items-center justify-center">
                {viewingResource.contentType === 'text' ? (
                  <div className="w-full h-full overflow-y-auto p-10 font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-none">
                    {viewingResource.textContent || 'No text content available.'}
                  </div>
                ) : getResourceMediaType(viewingResource) === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <video
                      src={`/api/resource/${viewingResource.id}`}
                      controls
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      className="max-w-full max-h-full rounded-xl border border-white/5 shadow-2xl"
                    />
                  </div>
                ) : getResourceMediaType(viewingResource) === 'image' ? (
                  <div className="w-full h-full flex items-center justify-center p-4 select-none">
                    <img
                      src={`/api/resource/${viewingResource.id}`}
                      alt={viewingResource.title}
                      onContextMenu={(e) => e.preventDefault()}
                      className="max-w-full max-h-full object-contain rounded-xl border border-white/5 shadow-2xl select-none pointer-events-none"
                    />
                  </div>
                ) : getResourceMediaType(viewingResource) === 'pdf' ? (
                  pdfLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      <span className="text-xs uppercase tracking-widest font-bold text-cyan-400/80">Rendering Document...</span>
                    </div>
                  ) : pdfError ? (
                    <div className="h-full w-full flex items-center justify-center p-6 text-center text-xs font-bold text-red-500 uppercase tracking-widest">
                      {pdfError}
                    </div>
                  ) : (
                    <div 
                      ref={pdfContainerRef}
                      className="w-full h-full overflow-y-auto bg-[#030407] flex flex-col items-center p-6 select-none relative scroll-smooth"
                      onScroll={handlePdfScroll}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {Array.from({ length: pdfTotalPages }, (_, i) => (
                        <PdfPage 
                          key={i + 1}
                          pdfDoc={pdfDoc}
                          pageNumber={i + 1}
                          scale={pdfScale}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <iframe
                      src={`/api/resource/${viewingResource.id}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full border-0 select-none pointer-events-auto"
                      title={viewingResource.title}
                      onLoad={(e) => {
                        try {
                          const iframeDoc = e.currentTarget.contentDocument || e.currentTarget.contentWindow?.document;
                          if (iframeDoc) {
                            // Prevent right-click inside the iframe
                            iframeDoc.addEventListener('contextmenu', (evt) => {
                              evt.preventDefault();
                              alert('Security Lockout: Right-click is disabled on secure academic documents.');
                            });
                            // Prevent keyboard shortcuts inside the iframe
                            iframeDoc.addEventListener('keydown', (evt) => {
                              const key = evt.key.toLowerCase();
                              const ctrlOrCmd = evt.ctrlKey || evt.metaKey;
                              const shift = evt.shiftKey;

                              if (ctrlOrCmd && key === 'p') {
                                evt.preventDefault();
                                alert('Security Lockout: Printing this secure document is disabled.');
                              }
                              if (ctrlOrCmd && key === 's') {
                                evt.preventDefault();
                                alert('Security Lockout: Saving this secure document is disabled.');
                              }
                              if (ctrlOrCmd && key === 'u') {
                                evt.preventDefault();
                                alert('Security Lockout: Viewing source code is disabled.');
                              }
                              if (evt.key === 'F12' || (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c'))) {
                                evt.preventDefault();
                                alert('Security Lockout: Developer tools are disabled.');
                              }
                            }, true);
                          }
                        } catch (err) {
                          console.warn("Same-origin iframe direct event injection bypassed due to browser security context:", err);
                        }
                      }}
                    />
                    {/* Transparent Top-Right Toolbar Blocker (covers only print/download buttons) */}
                    <div className="absolute top-0 right-0 w-36 h-14 bg-transparent pointer-events-auto z-10" onContextMenu={(e) => e.preventDefault()} />
                    
                    {/* Transparent Main Document Blocker (blocks right-clicks on pages, leaves scrollbar lane active) */}
                    <div 
                      className="absolute inset-y-0 left-0 w-[calc(100%-20px)] bg-transparent pointer-events-auto z-10" 
                      onContextMenu={(e) => e.preventDefault()}
                      onWheel={(e) => {
                        const iframe = document.querySelector('iframe');
                        if (iframe) {
                          try {
                            const doc = iframe.contentDocument || iframe.contentWindow?.document;
                            const scrollContainer = doc?.documentElement || doc?.body;
                            if (scrollContainer) {
                              scrollContainer.scrollBy({
                                top: e.deltaY,
                                left: e.deltaX,
                                behavior: 'auto'
                              });
                            }
                          } catch (err) {
                            // Suppress cross-origin warnings
                          }
                        }
                      }}
                      onTouchStart={(e) => {
                        if (e.touches && e.touches[0]) {
                          touchStartRef.current = {
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY
                          };
                        }
                      }}
                      onTouchMove={(e) => {
                        if (e.touches && e.touches[0]) {
                          const deltaY = touchStartRef.current.y - e.touches[0].clientY;
                          const deltaX = touchStartRef.current.x - e.touches[0].clientX;
                          
                          // Update start for continuous tracking
                          touchStartRef.current = {
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY
                          };

                          const iframe = document.querySelector('iframe');
                          if (iframe) {
                            try {
                              const doc = iframe.contentDocument || iframe.contentWindow?.document;
                              const scrollContainer = doc?.documentElement || doc?.body;
                              if (scrollContainer) {
                                scrollContainer.scrollBy({
                                  top: deltaY,
                                  left: deltaX,
                                  behavior: 'auto'
                                });
                              }
                            } catch (err) {
                              // Suppress cross-origin warnings
                            }
                          }
                        }
                      }}
                    />
                    
                    {/* Transparent Click Prevention Layer for non-cyber/non-admin */}
                    {!isCyber && !isAdmin && (
                      <div className="absolute inset-0 bg-transparent pointer-events-none" />
                    )}
                  </>
                )}
              </div>

              {/* Secure watermark footer */}
              <div className="p-4 border-t border-white/5 bg-[#070912] text-center flex flex-col md:flex-row items-center justify-between px-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest gap-2">
                <span>Node ID: MMMUT-DL-SECURE-V3</span>
                <span>Watermarked Stream • Screenshots & Screen Recordings Prohibited</span>
                <span>Protected by Firebase E2E Rules</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking Security Warning Toast */}
      <AnimatePresence>
        {securityToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[200] px-6 py-3 bg-red-650 bg-red-600 border border-red-500/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <AlertCircle size={16} className="text-white animate-pulse" />
            <span>{securityToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Explore() {
  return (
    <Suspense fallback={
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
