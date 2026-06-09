'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { loadPdfDocument } from '../lib/pdfViewer';
import { 
  User as UserIcon, 
  Save, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  BookOpen, 
  GraduationCap,
  Crown,
  ShieldCheck,
  ShoppingCart,
  Clock3,
  CircleCheck,
  CircleX,
  LogOut,
  ExternalLink,
  RefreshCw,
  Lock,
  ChevronLeft,
  Search,
  X,
  AlertCircle
} from 'lucide-react';

import Link from 'next/link';
import YoutubeSecurePlayer from '../components/YoutubeSecurePlayer';

const categories = [
  "GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"
];

const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) 
    ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&modestbranding=1&rel=0` 
    : null;
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
}

const PdfPage: React.FC<PdfPageProps> = ({ pdfDoc, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const vp = page.getViewport({ scale });
        setViewport(vp);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = vp.width;
        canvas.height = vp.height;

        setLoading(true);
        
        renderTask = page.render({
          canvasContext: context,
          viewport: vp
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
        style={viewport ? {
          width: scale > 1.0 ? `${viewport.width}px` : '100%',
          maxWidth: scale > 1.0 ? 'none' : `${viewport.width}px`,
          height: scale > 1.0 ? `${viewport.height}px` : 'auto'
        } : {
          width: '100%',
          aspectRatio: '1 / 1.414'
        }}
        className="rounded border border-white/5 shadow-2xl bg-[#030407] select-none pointer-events-none mx-auto"
      />
    </div>
  );
};

export default function UserDashboard() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Profile states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [targetedExam, setTargetedExam] = useState('');
  const [branch, setBranch] = useState('Computer Science');
  const [semester, setSemester] = useState('Semester 1');
  
  // Interface states
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Payment requests states
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  // New Tab & Resource states
  const [activeTab, setActiveTab] = useState<'settings' | 'resources'>('settings');
  const [resources, setResources] = useState<any[]>([]);
  const [purchasedResourceIds, setPurchasedResourceIds] = useState<string[]>([]);
  const [viewingResource, setViewingResource] = useState<any | null>(null);
  const [isPlayerPip, setIsPlayerPip] = useState(false);

  useEffect(() => {
    setIsPlayerPip(false);
  }, [viewingResource]);

  // Search & Filter states for My Purchased Resources
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedResourceType, setSelectedResourceType] = useState('All');

  // PDF secure viewer states
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.25);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
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

  // Helper functions
  const getResourceMediaType = (res: any) => {
    if (!res) return 'pdf';
    const url = (res.fileUrl || '').toLowerCase();
    const name = (res.fileName || '').toLowerCase();
    
    // Prioritize checking if the URL contains YouTube domains
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'video';
    }
    
    const type = (res.contentType || '').toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('video') || type.includes('mp4')) return 'video';
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('gif') || type.includes('webp')) return 'image';
    
    // Fallback to URL or name
    if (url.includes('.pdf') || name.includes('.pdf')) return 'pdf';
    if (url.includes('.mp4') || name.includes('.mp4')) return 'video';
    if (url.includes('.png') || name.includes('.png') || url.includes('.jpg') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.jpeg') || url.includes('.gif') || url.includes('.gif') || url.includes('.webp') || url.includes('.webp')) return 'image';
    
    return 'pdf';
  };

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
      if (prev !== currentPage) return currentPage;
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

  // Keyboard and menu blockers
  useEffect(() => {
    const handleContextMenuGlobal = (e: MouseEvent) => {
      if (viewingResource) e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenuGlobal, true);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenuGlobal, true);
    };
  }, [viewingResource]);

  useEffect(() => {
    const handleModalKeys = (e: KeyboardEvent) => {
      if (viewingResource) {
        const key = e.key.toLowerCase();
        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        if (ctrlOrCmd && key === 'p') {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Printing this secure academic file is disabled.');
          return;
        }
        if (ctrlOrCmd && key === 's') {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Saving this secure academic file is disabled.');
          return;
        }
        if (ctrlOrCmd && key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          showSecurityToast('Viewing source code is disabled.');
          return;
        }
        if (e.key === 'F12' || (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c'))) {
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

  // Load PDF document when viewingResource changes
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
          showSecurityToast("Secure Viewer Error: " + (err.message || err.toString()));
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

  // Attach Ctrl+Wheel zoom listener manually
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

  // Fetch verified resources and user's purchases
  useEffect(() => {
    if (user) {
      fetchPurchasedResourceIds();
      fetchResources();
    }
  }, [user]);

  const fetchPurchasedResourceIds = async () => {
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
    try {
      const q = query(
        collection(db, 'resources'),
        where('isVerified', '==', true)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(data);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  };

  const exams = [
    "GATE", "Semester Notes", "RRB", "SSC", "CAT", "UPSC", "Placement Prep"
  ];

  const branches = [
    "Computer Science", "Electrical Engineering", "Mechanical Engineering", 
    "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"
  ];

  const semesters = [
    "Semester 1", "Semester 2", "Semester 3", "Semester 4", 
    "Semester 5", "Semester 6", "Semester 7", "Semester 8"
  ];

  // 1. Fetch profile settings on load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (userProfile) {
      setFullName(userProfile.name || '');
      setUsername(userProfile.username || '');
      setTargetedExam(userProfile.targetedExam || '');
      setBranch(userProfile.branch || 'Computer Science');
      setSemester(userProfile.semester || 'Semester 1');
    }
  }, [user, authLoading, userProfile, router]);

  // 2. Fetch user's payment / purchase requests on load
  useEffect(() => {
    if (user) {
      fetchPaymentRequests();
    }
  }, [user]);

  const fetchPaymentRequests = async () => {
    if (!user) return;
    setLoadingPayments(true);
    try {
      const q = query(
        collection(db, 'paymentRequests'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually by createdAt desc
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPaymentRequests(data);
    } catch (err) {
      console.error("Error loading payment requests:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      const updates: any = {
        name: fullName.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, '_'),
        targetedExam
      };

      if (targetedExam === 'GATE') {
        updates.branch = branch;
        updates.semester = '';
      } else if (targetedExam === 'Semester Notes') {
        updates.branch = branch;
        updates.semester = semester;
      } else {
        updates.branch = '';
        updates.semester = '';
      }

      await setDoc(userRef, updates, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  // Compute statistics
  const stats = React.useMemo(() => {
    const total = paymentRequests.length;
    const pending = paymentRequests.filter(r => r.status === 'pending').length;
    const approved = paymentRequests.filter(r => r.status === 'approved').length;
    const rejected = paymentRequests.filter(r => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [paymentRequests]);

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    if (activeFilter === 'all') return paymentRequests;
    return paymentRequests.filter(r => r.status === activeFilter);
  }, [paymentRequests, activeFilter]);

  const isPremiumActive = userProfile?.planStatus === 'Paid' && (
    !userProfile.expiryDate || 
    userProfile.expiryDate === 'N/A' || 
    new Date(userProfile.expiryDate).getTime() > Date.now()
  );

  const allBoughtResources = React.useMemo(() => {
    return resources.filter(res => res.isPaid && (purchasedResourceIds.includes(res.id) || isPremiumActive));
  }, [resources, purchasedResourceIds, isPremiumActive]);

  const filteredBoughtResources = React.useMemo(() => {
    return allBoughtResources.filter(res => {
      const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
      
      const isBranchApplicable = selectedCategory === 'GATE' || selectedCategory === 'Semester Notes';
      const matchesBranch = !isBranchApplicable || selectedBranch === 'All' || res.branch === selectedBranch;

      const isSemesterApplicable = selectedCategory === 'Semester Notes';
      const matchesSemester = !isSemesterApplicable || selectedSemester === 'All' || res.semester === selectedSemester;

      const matchesType = selectedResourceType === 'All' || res.resourceType === selectedResourceType;
      
      return matchesSearch && matchesCategory && matchesBranch && matchesSemester && matchesType;
    });
  }, [allBoughtResources, searchTerm, selectedCategory, selectedBranch, selectedSemester, selectedResourceType]);

  if (authLoading || !user || !userProfile) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isBranchVisible = targetedExam === 'GATE' || targetedExam === 'Semester Notes';
  const isSemesterVisible = targetedExam === 'Semester Notes';

  return (
    <div className="immersive-bg min-h-screen flex flex-col">
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
              <Link href="/premium" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Premium</Link>
              <Link href="/donate" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12 w-full flex-grow relative z-10">
        <div className="mb-10 flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-400/20 text-cyan-400 shadow-xl shadow-cyan-400/5">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Student Dashboard</h1>
              <p className="text-slate-500 text-sm">Manage your profile credentials and monitor resource purchases.</p>
            </div>
          </div>
          
          <Link href="/explore" className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Library
          </Link>
        </div>

        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 text-xs font-bold uppercase tracking-wider gap-1 mb-8 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 rounded-lg cursor-pointer transition-all text-center ${activeTab === 'settings' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Profile & Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex-1 py-2.5 rounded-lg cursor-pointer transition-all text-center ${activeTab === 'resources' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            My Resources ({allBoughtResources.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Profile & Target setup / Purchased Resources */}
          <div className={activeTab === 'resources' ? 'col-span-full space-y-6' : 'lg:col-span-2 space-y-6'}>
            {activeTab === 'settings' ? (
              <>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="glass-card p-8 md:p-10 space-y-6 bg-gradient-to-br from-slate-900/60 to-indigo-950/10">
                    <h2 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                      <UserIcon className="text-cyan-400" size={18} /> Profile Settings
                    </h2>
                    
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Your Full Name</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Your Name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Username Identifier</label>
                        <input
                          required
                          type="text"
                          placeholder="your_name"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">College Email Node (Read Only)</label>
                      <div className="h-12 px-4 bg-[#05060B] border border-white/5 rounded-xl text-slate-500 flex items-center text-xs font-mono select-none">
                        {user.email}
                      </div>
                    </div>

                    {/* Targeted Exam setup */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Target Goal / Exam</label>
                      <select
                        value={targetedExam}
                        onChange={(e) => setTargetedExam(e.target.value)}
                        className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                      >
                        <option value="">Select Target Exam</option>
                        {exams.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>

                    <AnimatePresence>
                      {/* Branch (GATE & Semester only) */}
                      {isBranchVisible && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Specialty</label>
                          <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                          >
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </motion.div>
                      )}

                      {/* Semester (Semester only) */}
                      {isSemesterVisible && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Current Semester</label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 transition-all text-xs"
                          >
                            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wide">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wide">
                        <CheckCircle2 size={16} />
                        Profile updated successfully!
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <button
                        disabled={saving}
                        type="submit"
                        className="h-12 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider font-sans"
                      >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save Profile Settings
                      </button>
                      <button 
                        type="button"
                        onClick={() => logout().then(() => router.push('/'))}
                        className="h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </div>
                </form>

                <div className="glass-card p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShoppingCart className="text-cyan-400" size={18} /> Purchase Requests
                      </h2>
                      <p className="text-[10px] text-slate-500">Individual premium files or membership upgrades submitted.</p>
                    </div>

                    <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider gap-0.5">
                      {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setActiveFilter(status)}
                          className={`px-3 py-1.5 rounded cursor-pointer transition-all ${activeFilter === status ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingPayments ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-8">
                      <Loader2 className="animate-spin" size={16} /> Retrieving requests queue...
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono py-8 text-center">No payment requests found for this filter.</p>
                  ) : (
                    <div className="grid gap-4">
                      {filteredRequests.map((req) => {
                        const isResource = req.type === 'resource' || req.resourceId;
                        const isClickable = req.status === 'approved' && isResource;
                        
                        return (
                          <div 
                            key={req.id} 
                            onClick={() => {
                              if (isClickable) {
                                router.push(`/explore?id=${req.resourceId}`);
                              }
                            }}
                            className={`p-4 rounded-xl border bg-white/[0.01] border-white/5 flex items-center justify-between gap-4 transition-all ${
                              isClickable ? 'hover:border-cyan-400/50 hover:bg-cyan-500/[0.01] cursor-pointer' : ''
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className={`text-sm font-bold text-white ${isClickable ? 'underline decoration-cyan-400/50' : ''}`}>
                                  {isResource ? req.resourceTitle : `${req.planName} Membership`}
                                </h3>
                                <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                                  {req.type || 'resource'}
                                </span>
                                {isClickable && <ExternalLink size={12} className="text-cyan-400 shrink-0" />}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono text-slate-500 uppercase mt-1">
                                <span>Cost: <strong className="text-slate-300">INR {req.amount}</strong></span>
                                <span>TXN: <strong className="text-slate-300">{req.transactionId}</strong></span>
                                <span>Date: <strong>{new Date(req.createdAt).toLocaleDateString()}</strong></span>
                              </div>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono shrink-0 ${
                              req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                              req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                              'bg-orange-500/10 text-orange-400 border border-orange-500/10'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-10">
                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">
                      My Unlocked Resources
                    </h2>
                    <p className="text-slate-500 text-xs">{filteredBoughtResources.length} secure study modules available.</p>
                  </div>
                  <div className="relative w-full md:w-96 group">
                    <input
                      type="text"
                      placeholder="Search purchased modules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-12 pr-6 text-sm focus:border-cyan-400 outline-none transition-all text-slate-200"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  </div>
                </div>

                {/* Filters panel */}
                <div className="space-y-6 bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-md">
                  {/* Categories */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">Archive Category</p>
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none -mx-2 px-2 scroll-smooth">
                      {['All', ...categories].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedBranch('All');
                            setSelectedSemester('All');
                          }}
                          className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            selectedCategory === cat 
                              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Semester Selector (Semester Notes only) */}
                  <AnimatePresence>
                    {selectedCategory === 'Semester Notes' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">Academic Semester</p>
                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none -mx-2 px-2 scroll-smooth">
                          {['All', ...semesters].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSelectedSemester(s)}
                              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                selectedSemester === s 
                                  ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20' 
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Branch Selector (GATE & Semester Notes) */}
                  <AnimatePresence>
                    {(selectedCategory === 'GATE' || selectedCategory === 'Semester Notes') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">
                          {selectedCategory === 'GATE' ? 'GATE Branches' : 'Academic Branches'}
                        </p>
                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none -mx-2 px-2 scroll-smooth">
                          {['All', ...branches].map(b => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setSelectedBranch(b)}
                              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                selectedBranch === b 
                                  ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20' 
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Resource Type */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">Resource Type</p>
                    <div className="grid grid-cols-3 gap-2 max-w-md">
                      <button type="button" onClick={() => setSelectedResourceType('All')} className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider cursor-pointer ${selectedResourceType === 'All' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>All Types</button>
                      <button type="button" onClick={() => setSelectedResourceType('pyq')} className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider cursor-pointer ${selectedResourceType === 'pyq' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>PYQ</button>
                      <button type="button" onClick={() => setSelectedResourceType('note')} className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider cursor-pointer ${selectedResourceType === 'note' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'}`}>Note</button>
                    </div>
                  </div>
                </div>

                {/* Grid container */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                  <AnimatePresence mode="popLayout">
                    {filteredBoughtResources.length === 0 ? (
                      <div className="col-span-full glass-card p-12 text-center text-slate-500 text-xs font-mono">
                        No matching unlocked resources found.
                      </div>
                    ) : (
                      filteredBoughtResources.map((res) => {
                        return (
                          <motion.div
                            layout
                            key={res.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-card p-8 flex flex-col group relative overflow-hidden transition-all duration-300 border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50 hover:bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-400/10 text-emerald-400">
                                <BookOpen size={20} />
                              </div>
                              <span className="px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={10} /> Purchased
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-3 transition-colors line-clamp-2 group-hover:text-emerald-400">{res.title}</h3>
                            <p className="text-slate-500 text-xs mb-8 line-clamp-3 leading-relaxed">
                              {res.description || 'Verified academic study reference module.'}
                            </p>

                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                              <div className="text-[9px] font-mono text-slate-600 uppercase">
                                BY {res.uploaderName || 'ANONYMOUS'}
                              </div>
                              <button 
                                onClick={() => setViewingResource(res)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-emerald-400 hover:bg-emerald-400 hover:text-black hover:border-emerald-400/50 transition-all cursor-pointer"
                              >
                                VIEW SECURE COPY →
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Sticky memberships overview & stats */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Membership overview */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Crown className="text-cyan-400" size={16} /> Premium Access
                </h3>
                {isPremiumActive ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5"><CheckCircle2 size={14} /> Active Premium Membership</p>
                    <p className="text-slate-400 font-mono text-[10px]">Expiry: {userProfile.expiryDate}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-slate-500 text-xs flex items-center gap-2">
                    <Lock size={14} />
                    <span>No active premium membership.</span>
                  </div>
                )}
                
                <Link 
                  href="/premium"
                  className="w-full h-11 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 text-xs uppercase tracking-wider cursor-pointer"
                >
                  Manage Premium
                </Link>
              </div>

              {/* Purchase statistics overview */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-cyan-400" size={16} /> Purchase Overview
                  </h3>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={fetchPaymentRequests}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded border border-white/5 transition-all cursor-pointer"
                      title="Refresh Status"
                    >
                      <RefreshCw size={12} />
                    </button>
                    <Link 
                      href="/explore"
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded border border-white/5 transition-all text-[9px] uppercase font-bold tracking-widest flex items-center"
                    >
                      Open Library
                    </Link>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5"><Clock3 size={12} className="text-orange-400" /> Pending Requests:</span>
                    <span className="text-white font-bold">{stats.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5"><CircleCheck size={12} className="text-emerald-400" /> Approved Requests:</span>
                    <span className="text-white font-bold">{stats.approved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5"><CircleX size={12} className="text-red-400" /> Rejected Requests:</span>
                    <span className="text-white font-bold">{stats.rejected}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2 text-slate-300 font-sans font-bold">
                    <span>Total Submissions:</span>
                    <span className="text-cyan-400">{stats.total}</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

      {/* Secure Digital Reader Modal */}
      <AnimatePresence>
        {viewingResource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onContextMenu={(e) => e.preventDefault()}
            className={isPlayerPip 
              ? "fixed bottom-6 right-6 z-[100] w-[340px] h-[220px] select-none rounded-2xl overflow-hidden border border-white/20 shadow-2xl transition-all duration-300"
              : "fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 select-none transition-all duration-300"
            }
            style={isPlayerPip ? {} : { userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
          >
            <div className={isPlayerPip 
              ? "w-full h-full flex flex-col relative overflow-hidden bg-black" 
              : "max-w-5xl w-full h-[88vh] glass-card flex flex-col relative overflow-hidden bg-[#05060B]"
            }>
              {!isPlayerPip && (
                <button 
                  onClick={() => setViewingResource(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-slate-200 transition-all shadow-xl z-[110]"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              )}

              {!isPlayerPip && (
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
            )}
              
              {/* Reader Proxy View Render */}
              <div className="flex-1 w-full bg-[#030407] relative overflow-hidden flex items-center justify-center">
                {viewingResource.contentType === 'text' ? (
                  <div className="w-full h-full overflow-y-auto p-10 font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-none">
                    {viewingResource.textContent || 'No text content available.'}
                  </div>
                ) : getResourceMediaType(viewingResource) === 'video' ? (
                  <div className={isPlayerPip ? "w-full h-full flex items-center justify-center" : "w-full h-full flex items-center justify-center p-4"}>
                    {viewingResource.fileUrl.includes('youtube.com') || viewingResource.fileUrl.includes('youtu.be') ? (
                      <YoutubeSecurePlayer 
                        url={viewingResource.fileUrl} 
                        title={viewingResource.title} 
                        isPip={isPlayerPip}
                        onPipToggle={() => setIsPlayerPip(!isPlayerPip)}
                        onClose={() => setViewingResource(null)}
                      />
                    ) : (
                      <video
                        src={`/api/resource/${viewingResource.id}`}
                        controls
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                        className="max-w-full max-h-full rounded-xl border border-white/5 shadow-2xl"
                      />
                    )}
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
                      className="w-full h-full overflow-auto bg-[#030407] flex flex-col p-6 select-none relative scroll-smooth"
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
                            iframeDoc.addEventListener('contextmenu', (evt) => {
                              evt.preventDefault();
                              showSecurityToast('Security Lockout: Right-click is disabled on secure academic documents.');
                            });
                            iframeDoc.addEventListener('keydown', (evt) => {
                              const key = evt.key.toLowerCase();
                              const ctrlOrCmd = evt.ctrlKey || evt.metaKey;
                              const shift = evt.shiftKey;

                              if (ctrlOrCmd && key === 'p') {
                                evt.preventDefault();
                                showSecurityToast('Security Lockout: Printing this secure document is disabled.');
                              }
                              if (ctrlOrCmd && key === 's') {
                                evt.preventDefault();
                                showSecurityToast('Security Lockout: Saving this secure document is disabled.');
                              }
                              if (ctrlOrCmd && key === 'u') {
                                evt.preventDefault();
                                showSecurityToast('Security Lockout: Viewing source code is disabled.');
                              }
                              if (evt.key === 'F12' || (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c'))) {
                                evt.preventDefault();
                                showSecurityToast('Security Lockout: Developer tools are disabled.');
                              }
                            }, true);
                          }
                        } catch (err) {
                          console.warn("Same-origin iframe direct event injection bypassed:", err);
                        }
                      }}
                    />
                    <div className="absolute top-0 right-0 w-36 h-14 bg-transparent pointer-events-auto z-10" onContextMenu={(e) => e.preventDefault()} />
                    <div 
                      className="absolute inset-y-0 left-0 w-[calc(100%-20px)] bg-transparent pointer-events-auto z-10" 
                      onContextMenu={(e) => e.preventDefault()}
                    />
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

      </main>
    </div>
  );
}
