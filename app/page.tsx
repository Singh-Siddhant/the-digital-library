'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  addDoc, 
  orderBy,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './lib/firebase';
import { useAuth } from './lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Shield, 
  Users, 
  FileCheck, 
  Edit2, 
  Save,
  BookOpen,
  Loader2,
  LogOut,
  Upload,
  Download,
  Briefcase,
  Trash2,
  FolderLock,
  Plus,
  Coins,
  CreditCard,
  AlertCircle,
  FileText,
  Video,
  QrCode
} from 'lucide-react';
import axios from 'axios';

type Tab = 'verification' | 'resources' | 'upload' | 'jobs' | 'users' | 'payments' | 'revenue';

export default function AdminConsoleHome() {
  const { user, userProfile, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const router = useRouter();

  // Login states
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const initRef = useRef(false);

  // General state
  const [activeTab, setActiveTab] = useState<Tab>('verification');
  const [loading, setLoading] = useState(true);

  // Tab 1: Verification Queue states
  const [pendingResources, setPendingResources] = useState<any[]>([]);

  // Tab 2: Resource Manager states
  const [verifiedResources, setVerifiedResources] = useState<any[]>([]);
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [editResTitle, setEditResTitle] = useState('');
  const [editResDesc, setEditResDesc] = useState('');
  const [editResCategory, setEditResCategory] = useState('');
  const [editResBranch, setEditResBranch] = useState('');
  const [editResSemester, setEditResSemester] = useState('');
  const [editResIsPaid, setEditResIsPaid] = useState(false);
  const [editResPrice, setEditResPrice] = useState(0);
  const [editResFileUrl, setEditResFileUrl] = useState('');

  // Tab 3: Direct Upload Form states
  const [upTitle, setUpTitle] = useState('');
  const [upDesc, setUpDesc] = useState('');
  const [upUploadType, setUpUploadType] = useState<'local' | 'drive'>('local');
  const [upSelectedFile, setUpSelectedFile] = useState<File | null>(null);
  const [upFileUrl, setUpFileUrl] = useState('');
  const [upCategory, setUpCategory] = useState('GATE');
  const [upBranch, setUpBranch] = useState('Computer Science');
  const [upSemester, setUpSemester] = useState('Semester 1');
  const [upResourceType, setUpResourceType] = useState('note'); // note or pyq
  const [upContentType, setUpContentType] = useState('pdf-local'); // pdf-local, video-local etc
  const [upIsPaid, setUpIsPaid] = useState(false);
  const [upPrice, setUpPrice] = useState(0);
  const [upLoading, setUpLoading] = useState(false);
  const [upProgress, setUpProgress] = useState(0);

  // Tab 4: Broadcast Jobs Form states
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobYear, setJobYear] = useState('2025');
  const [jobType, setJobType] = useState('job'); // job or intern
  const [jobApplyLink, setJobApplyLink] = useState('');
  const [jobLoading, setJobLoading] = useState(false);
  const [activeJobsList, setActiveJobsList] = useState<any[]>([]);
  const [loadingJobsList, setLoadingJobsList] = useState(false);

  // Tab 5: User Manager states
  const [users, setUsers] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserBatch, setEditUserBatch] = useState('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'admin' | 'cyber'>('user');
  const [editUserPlan, setEditUserPlan] = useState<'Free' | 'Paid'>('Free');
  const [editUserExpiry, setEditUserExpiry] = useState('');

  // Tab 6: Payment / Membership Activations states
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [paymentActionLoading, setPaymentActionLoading] = useState<string | null>(null);
  const [paymentsFilter, setPaymentsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [purchases, setPurchases] = useState<any[]>([]);

  const filteredPayments = React.useMemo(() => {
    if (paymentsFilter === 'all') return pendingPayments;
    return pendingPayments.filter(p => p.status === paymentsFilter);
  }, [pendingPayments, paymentsFilter]);

  // Shared constants
  const categories = ["GATE", "RRB", "SSC", "CAT", "UPSC", "Placement Prep", "Semester Notes"];
  const branches = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics Engineering", "Chemical Engineering", "Other"];
  const semesters = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];
  const years = ["2025", "2026", "2027", "2028", "2029"];

  // Security check
  const bootstrapAdmins = ['majorguru09@gmail.com', '2024021271@mmmut.ac.in', '2023051154@mmmut.ac.in'];
  const isAuthorizedAdmin = user && (bootstrapAdmins.includes(user.email || '') || userProfile?.role === 'admin');

  // Trigger data fetching on authorization and tab switch
  useEffect(() => {
    if (isAuthorizedAdmin) {
      fetchAllData();
    }
  }, [isAuthorizedAdmin]);

  useEffect(() => {
    if (isAuthorizedAdmin && activeTab === 'jobs') {
      fetchJobsList();
    }
  }, [activeTab, isAuthorizedAdmin]);

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
          
          const btnParent = document.getElementById("googleBtnAdminConsole");
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
    setLoadingLogin(true);
    setLoginError('');
    try {
      await loginWithGoogle(response.credential);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const fetchJobsList = async () => {
    setLoadingJobsList(true);
    try {
      const response = await axios.get('/api/jobs');
      setActiveJobsList(response.data);
    } catch (err) {
      console.error("Error loading placement updates list:", err);
    } finally {
      setLoadingJobsList(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const qPending = query(collection(db, 'resources'), where('isVerified', '==', false));
      // Bypassing composite index requirement by sorting verified resources client-side
      const qVerified = query(collection(db, 'resources'), where('isVerified', '==', true));
      const qUsers = collection(db, 'users');
      const qPayments = collection(db, 'paymentRequests');
      const qPurchases = collection(db, 'purchases');

      const [snapPending, snapVerified, snapUsers, snapPayments, snapPurchases] = await Promise.all([
        getDocs(qPending),
        getDocs(qVerified),
        getDocs(qUsers),
        getDocs(qPayments),
        getDocs(qPurchases)
      ]);

      setPendingResources(snapPending.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const verifiedData = snapVerified.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      verifiedData.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setVerifiedResources(verifiedData);
      
      setUsers(snapUsers.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Map and sort payment requests client-side by date
      const paymentsData = snapPayments.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      paymentsData.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPendingPayments(paymentsData);

      setPurchases(snapPurchases.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      fetchJobsList();
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tab 1 Actions: Verify Queue Approve / Reject
  const handleVerify = async (res: any, approve: boolean) => {
    try {
      if (approve) {
        const finalUrl = res.tempDriveUrl !== undefined && res.tempDriveUrl.trim() !== '' ? res.tempDriveUrl.trim() : res.fileUrl;
        const finalType = res.tempContentType !== undefined ? res.tempContentType : res.contentType;
        
        const updates: any = {
          isVerified: true,
          fileUrl: finalUrl,
          contentType: finalType
        };

        // If it has a storagePath and the URL was updated to a Google Drive link, delete from Firebase Storage
        if (res.storagePath && finalUrl !== res.fileUrl && (finalUrl.includes('drive.google.com') || finalUrl.includes('docs.google.com'))) {
          try {
            const fileRef = ref(storage, res.storagePath);
            await deleteObject(fileRef);
            updates.storagePath = ''; // Clear storagePath in Firestore
            console.log("Storage optimized: Deleted migrated Firebase Storage file:", res.storagePath);
          } catch (storageErr) {
            console.error("Failed to delete migrated storage object:", storageErr);
          }
        }

        await updateDoc(doc(db, 'resources', res.id), updates);
        alert('Module approved and published to main library!');
      } else {
        // Clean up from Firebase Storage if it has physical file
        if (res.storagePath) {
          try {
            const fileRef = ref(storage, res.storagePath);
            await deleteObject(fileRef);
          } catch (storageErr) {
            console.error("Failed to delete storage object on reject:", storageErr);
          }
        }
        await deleteDoc(doc(db, 'resources', res.id));
        alert('Module rejected and permanently deleted.');
      }
      setPendingResources(pendingResources.filter(r => r.id !== res.id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Verification update failed.');
    }
  };

  // Tab 2 Actions: Resource Manager Edit/Delete
  const startEditResource = (res: any) => {
    setEditingResId(res.id);
    setEditResTitle(res.title || '');
    setEditResDesc(res.description || '');
    setEditResCategory(res.category || 'GATE');
    setEditResBranch(res.branch || 'Computer Science');
    setEditResSemester(res.semester || 'Semester 1');
    setEditResIsPaid(res.isPaid || false);
    setEditResPrice(res.price || 0);
    setEditResFileUrl(res.fileUrl || '');
  };

  const handleSaveResource = async (resId: string) => {
    try {
      const resRef = doc(db, 'resources', resId);
      
      const updates: any = {
        title: editResTitle,
        description: editResDesc,
        category: editResCategory,
        isPaid: editResIsPaid,
        price: editResIsPaid ? Number(editResPrice) : 0,
        fileUrl: editResFileUrl
      };

      if (editResCategory === 'GATE') {
        updates.branch = editResBranch;
        updates.semester = '';
      } else if (editResCategory === 'Semester Notes') {
        updates.branch = editResBranch;
        updates.semester = editResSemester;
      } else {
        updates.branch = '';
        updates.semester = '';
      }

      await updateDoc(resRef, updates);
      
      setVerifiedResources(verifiedResources.map(r => r.id === resId ? { ...r, ...updates } : r));
      setEditingResId(null);
      alert('Resource settings updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update resource metadata.');
    }
  };

  const handleDeleteResource = async (res: any) => {
    if (!confirm('Are you sure you want to permanently delete this resource?')) return;
    try {
      // Clean up file from Firebase Storage
      if (res.storagePath) {
        try {
          await deleteObject(ref(storage, res.storagePath));
        } catch (storageErr) {
          console.error("Storage clean up failed:", storageErr);
        }
      }
      await deleteDoc(doc(db, 'resources', res.id));
      setVerifiedResources(verifiedResources.filter(r => r.id !== res.id));
      alert('Resource deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete resource.');
    }
  };

  // Tab 3 Actions: Direct File Upload
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size exceeds the 50MB security upload limit.');
      return;
    }

    setUpSelectedFile(file);
    if (file.type.includes('pdf')) {
      setUpContentType('pdf-local');
    } else if (file.type.includes('video') || file.type.includes('mp4')) {
      setUpContentType('video-local');
    } else if (file.type.includes('image') || file.type.match(/\.(png|jpe?g|gif|webp)$/i)) {
      setUpContentType('image-local');
    } else {
      setUpContentType('document-local');
    }

    if (!upTitle) {
      const parts = file.name.split('.');
      parts.pop();
      setUpTitle(parts.join('.'));
    }
  };

  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upUploadType === 'drive') {
      if (!upFileUrl) return alert('Google Drive link is required.');
      if (!upFileUrl.includes('drive.google.com') && !upFileUrl.includes('docs.google.com') && !upFileUrl.includes('youtube.com') && !upFileUrl.includes('youtu.be')) {
        return alert('Must be a valid Google Drive, Google Docs, or YouTube link.');
      }
    } else {
      if (!upSelectedFile) return alert('Please select a local file to upload.');
    }

    setUpLoading(true);
    setUpProgress(0);

    try {
      let finalFileUrl = upFileUrl;
      let storagePath = '';
      let finalContentType = upContentType;

      // Local file upload
      if (upUploadType === 'local' && upSelectedFile) {
        const timestamp = Date.now();
        const safeName = upSelectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        storagePath = `resources/${timestamp}_${safeName}`;
        const fileRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(fileRef, upSelectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUpProgress(pct);
            }, 
            (err) => reject(err), 
            async () => {
              finalFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const docData: any = {
        title: upTitle.trim(),
        description: upDesc.trim(),
        fileUrl: finalFileUrl,
        fileName: upUploadType === 'local' && upSelectedFile ? upSelectedFile.name : 'Google Drive Asset',
        storagePath: storagePath,
        category: upCategory,
        resourceType: upResourceType,
        contentType: upUploadType === 'drive' ? (upContentType === 'pdf-local' ? 'pdf-gdrive' : upContentType) : finalContentType,
        isPaid: upIsPaid,
        price: upIsPaid ? Number(upPrice) : 0,
        uploadedBy: user?.uid,
        uploaderName: userProfile?.name || 'System Admin',
        isVerified: true, // Directly verified since posted by Admin
        createdAt: new Date().toISOString()
      };

      if (upCategory === 'GATE') {
        docData.branch = upBranch;
        docData.semester = '';
      } else if (upCategory === 'Semester Notes') {
        docData.branch = upBranch;
        docData.semester = upSemester;
      } else {
        docData.branch = '';
        docData.semester = '';
      }

      await addDoc(collection(db, 'resources'), docData);
      alert('Verified resource directly published to the main site!');
      
      // Reset form
      setUpTitle('');
      setUpDesc('');
      setUpFileUrl('');
      setUpSelectedFile(null);
      setUpIsPaid(false);
      setUpPrice(0);
      setActiveTab('resources');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Direct upload entry failed.');
    } finally {
      setUpLoading(false);
    }
  };

  // Tab 4 Actions: Broadcast Jobs
  const handleBroadcastJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobCompany || !jobApplyLink) {
      return alert('Title, Company, and Application Link are required.');
    }

    setJobLoading(true);
    try {
      const jobPayload = {
        title: jobTitle.trim(),
        company: jobCompany.trim(),
        year: jobYear,
        type: jobType,
        applyLink: jobApplyLink.trim(),
        createdAt: new Date().toISOString()
      };

      await axios.post('/api/jobs', jobPayload);
      alert('Job listing broadcasted and saved to Google Sheets placement board successfully!');
      
      // Reset form
      setJobTitle('');
      setJobCompany('');
      setJobApplyLink('');
      // Reload placements list
      fetchJobsList();
    } catch (err: any) {
      console.error(err);
      alert('Sheet sync failed. Check your Apps Script environment configuration.');
    } finally {
      setJobLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this placement alert?")) return;
    try {
      await axios.delete(`/api/jobs?id=${jobId}`);
      alert("Job posting deleted successfully from Firestore!");
      setActiveJobsList(activeJobsList.filter(j => j.id !== jobId));
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete job posting.");
    }
  };

  // Tab 5 Actions: User Manager
  const startEditUser = (u: any) => {
    setEditingUserId(u.id);
    setEditUserBatch(u.batch || 'AI/Cyber Prep');
    setEditUserRole(u.role || 'user');
    setEditUserPlan(u.planStatus || 'Free');
    setEditUserExpiry(u.expiryDate || 'N/A');
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        batch: editUserBatch,
        role: editUserRole,
        planStatus: editUserPlan,
        expiryDate: editUserExpiry
      });

      setUsers(users.map(u => u.id === userId ? {
        ...u,
        batch: editUserBatch,
        role: editUserRole,
        planStatus: editUserPlan,
        expiryDate: editUserExpiry
      } : u));

      setEditingUserId(null);
      alert('User node credentials updated successfully.');
    } catch (err) {
      console.error(err);
      alert('User settings sync failed.');
    }
  };

  // Tab 6 Actions: Payment Activations Queue Approve / Reject
  const handlePaymentVerification = async (req: any, approve: boolean) => {
    setPaymentActionLoading(req.id);
    try {
      const requestRef = doc(db, 'paymentRequests', req.id);

      if (approve) {
        // 1. Mark request as approved
        await updateDoc(requestRef, { status: 'approved' });

        if (req.type === 'membership') {
          // Calculate expiry date
          const today = new Date();
          let daysToAdd = 30;
          if (req.planId === 'pro') daysToAdd = 90;
          if (req.planId === 'annual') daysToAdd = 365;
          
          today.setDate(today.getDate() + daysToAdd);
          const expiryString = today.toISOString().split('T')[0]; // YYYY-MM-DD

          // Upgrade user profile
          const userRef = doc(db, 'users', req.userId);
          await setDoc(userRef, {
            planStatus: 'Paid',
            expiryDate: expiryString
          }, { merge: true });

          alert(`Premium Membership activated successfully for ${req.email}! Expiry: ${expiryString}`);
        } else {
          // Individual resource access purchase
          await addDoc(collection(db, 'purchases'), {
            userId: req.userId,
            resourceId: req.resourceId,
            resourceTitle: req.resourceTitle,
            purchasedAt: new Date().toISOString()
          });

          alert(`Single Resource Access unlocked successfully for ${req.email}!`);
        }
      } else {
        // Mark request as rejected
        await updateDoc(requestRef, { status: 'rejected' });
        alert(`Payment reference request rejected for ${req.email}.`);
      }

      setPendingPayments(pendingPayments.filter(p => p.id !== req.id));
    } catch (err: any) {
      console.error(err);
      alert(`Activation error: ${err.message || 'Firestore updates failed.'}`);
    } finally {
      setPaymentActionLoading(null);
    }
  };

  // Revenue calculations helper
  const revenueData = React.useMemo(() => {
    const approved = pendingPayments.filter(p => p.status === 'approved');
    const total = approved.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    // Subscriptions
    const subPayments = approved.filter(p => p.type === 'membership' || p.planId);
    const subCost = subPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    // Single Resource Purchases
    const resPayments = approved.filter(p => p.type === 'resource' || p.resourceId);
    const resCost = resPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Group cumulative timeline
    const chron = [...approved].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    
    const dailyMap: { [date: string]: number } = {};
    chron.forEach(p => {
      const dateStr = p.createdAt ? p.createdAt.split('T')[0] : 'N/A';
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (Number(p.amount) || 0);
    });

    const dailyList = Object.keys(dailyMap).map(d => ({
      date: d,
      amount: dailyMap[d]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningTotal = 0;
    const timeline = dailyList.map(item => {
      runningTotal += item.amount;
      return {
        date: item.date,
        amount: item.amount,
        cumulative: runningTotal
      };
    });

    return { total, subCost, resCost, timeline };
  }, [pendingPayments]);

  const renderLineChart = () => {
    const data = revenueData.timeline;
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border border-white/5 bg-white/[0.01] rounded-2xl text-slate-500 text-xs">
          No approved revenue transactions recorded yet.
        </div>
      );
    }

    const width = 600;
    const height = 240;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...data.map(d => d.cumulative), 1000);
    const minVal = 0;

    const getX = (index: number) => {
      if (data.length <= 1) return paddingLeft + chartWidth / 2;
      return paddingLeft + (index / (data.length - 1)) * chartWidth;
    };

    const getY = (val: number) => {
      const scale = (val - minVal) / (maxVal - minVal);
      return height - paddingBottom - scale * chartHeight;
    };

    // Construct path string
    let pathD = '';
    let areaD = `M ${getX(0)} ${height - paddingBottom} `;

    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.cumulative);
      if (i === 0) {
        pathD += `M ${x} ${y} `;
      } else {
        pathD += `L ${x} ${y} `;
      }
      areaD += `L ${x} ${y} `;
    });

    areaD += `L ${getX(data.length - 1)} ${height - paddingBottom} Z`;

    // Grid lines y-axis ticks
    const yTicks = 4;
    const ticks = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (i / yTicks) * (maxVal - minVal));

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((t, idx) => {
          const y = getY(t);
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="rgba(255,255,255,0.05)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                fill="#64748b" 
                fontSize="10" 
                textAnchor="end" 
                className="font-mono"
              >
                ₹{Math.round(t)}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          const showLabel = data.length <= 8 || i % Math.ceil(data.length / 5) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          const x = getX(i);
          return (
            <text 
              key={i} 
              x={x} 
              y={height - paddingBottom + 18} 
              fill="#64748b" 
              fontSize="9" 
              textAnchor="middle" 
              className="font-mono"
            >
              {d.date.substring(5)}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGlow)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {data.map((d, i) => (
          <circle 
            key={i} 
            cx={getX(i)} 
            cy={getY(d.cumulative)} 
            r="4.5" 
            fill="#0f172a" 
            stroke="#22d3ee" 
            strokeWidth="2.5" 
            className="hover:r-6 hover:fill-cyan-400 transition-all cursor-pointer"
          />
        ))}
      </svg>
    );
  };

  const renderPieChart = () => {
    const { subCost, resCost } = revenueData;
    const total = subCost + resCost;
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border border-white/5 bg-white/[0.01] rounded-2xl text-slate-500 text-xs">
          No breakdown statistics.
        </div>
      );
    }

    const radius = 50;
    const circ = 2 * Math.PI * radius;
    const subPercent = (subCost / total) * 100;
    const resPercent = (resCost / total) * 100;

    const subStroke = (subPercent / 100) * circ;
    const resStroke = (resPercent / 100) * circ;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-4">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              fill="none" 
              stroke="#22d3ee" 
              strokeWidth="12" 
              strokeDasharray={`${subStroke} ${circ}`}
              strokeDashoffset="0"
            />
            {resPercent > 0 && (
              <circle 
                cx="60" 
                cy="60" 
                r={radius} 
                fill="none" 
                stroke="#f97316" 
                strokeWidth="12" 
                strokeDasharray={`${resStroke} ${circ}`}
                strokeDashoffset={-subStroke}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total</span>
            <span className="text-xs font-bold text-white">₹{total}</span>
          </div>
        </div>

        <div className="space-y-3 flex-grow text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Subscriptions</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-white font-mono">₹{subCost}</span>
              <span className="text-slate-500 font-mono text-[9px] block">({subPercent.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
              <span className="text-slate-400 font-semibold">Paid Volumes</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-white font-mono">₹{resCost}</span>
              <span className="text-slate-500 font-mono text-[9px] block">({resPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state (auth checking)
  if (authLoading) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Unauthenticated View
  if (!user) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center p-4">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card w-full max-w-md p-10 text-center relative z-10"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-8 neon-glow-purple">
            <Shield className="text-white w-7 h-7" />
          </div>
          
          <h1 className="text-3xl font-display font-bold mb-3 text-white tracking-tight">Admin Console</h1>
          <p className="text-slate-500 mb-10 text-sm">Sign in to manage library nodes, verify items, and post placements.</p>
          
          {loginError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg mb-8 text-center leading-relaxed">
              {loginError}
            </div>
          )}
          
          <div className="flex flex-col items-center justify-center min-h-[56px] w-full">
            {loadingLogin ? (
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider py-4">
                <Loader2 className="animate-spin" size={18} />
                Verifying Credentials...
              </div>
            ) : (
              <div id="googleBtnAdminConsole" className="w-full flex justify-center" />
            )}
          </div>
          
          <div className="mt-12 flex items-center gap-4 text-slate-700">
            <div className="flex-grow h-px bg-white/5" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em]">MMMUT Secure Admin</span>
            <div className="flex-grow h-px bg-white/5" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Unauthorized View (Non-Admin logged in)
  if (!isAuthorizedAdmin) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-10 text-center relative z-10 border-red-500/20">
          <div className="w-14 h-14 bg-red-500/10 rounded-xl mx-auto flex items-center justify-center mb-8 border border-red-500/20 text-red-500">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-3 text-white tracking-tight">Access Restricted</h1>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            This console is restricted. Your email ({user.email}) does not have administrative clearance.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full h-12 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-xl flex items-center justify-center hover:bg-white/10 hover:text-white transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            Sign Out & Switch account
          </button>
        </div>
      </div>
    );
  }

  // Active Tab classes helper
  const tabClass = (tab: Tab) => `flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${activeTab === tab ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 'text-slate-400 hover:text-white'}`;

  // Authorized Admin View
  return (
    <div className="immersive-bg min-h-screen flex flex-col">
      <div className="ambient-glow-1" />

      {/* Admin Navbar */}
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center neon-glow-purple">
                <Shield className="text-white w-5 h-5" />
              </div>
              <span className="text-lg font-display font-bold tracking-tight text-white">
                Digital Library Admin Center
              </span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-slate-500 uppercase">
              <span className="text-cyan-400 hidden md:inline">{user.email}</span>
              <button 
                onClick={() => logout()}
                className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-white/5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12 w-full flex-grow relative z-10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Systems Management</h1>
            <p className="text-slate-500 text-sm">Review student files, edit library resource nodes, post placement openings, and assign user subscriptions.</p>
          </div>
        </div>

        {/* Top Stats Overview Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-cyan-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Total Library Modules</span>
              <h2 className="text-3xl font-display font-bold text-white mt-1">{verifiedResources.length}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>
          
          <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-purple-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Registered Students</span>
              <h2 className="text-3xl font-display font-bold text-white mt-1">{users.length}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-emerald-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Paid Subscriptions</span>
              <h2 className="text-3xl font-display font-bold text-white mt-1">
                {users.filter(u => u.planStatus === 'Paid').length}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins size={20} />
            </div>
          </div>

          <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Pending Actions</span>
              <h2 className="text-3xl font-display font-bold text-white mt-1">
                {pendingResources.length + pendingPayments.filter(p => p.status === 'pending').length}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          <div className="hidden xl:block">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Control Panels</h2>
          </div>
          {/* Core Admin Tab List */}
          <div className="flex overflow-x-auto flex-nowrap md:flex-wrap bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 gap-1 scrollbar-none w-full md:w-auto">
            <button onClick={() => setActiveTab('verification')} className={tabClass('verification')}>
              <FileCheck size={14} /> Pending ({pendingResources.length})
            </button>
            <button onClick={() => setActiveTab('payments')} className={tabClass('payments')}>
              <Coins size={14} /> Payments ({pendingPayments.filter(p => p.status === 'pending').length})
            </button>
            <button onClick={() => setActiveTab('revenue')} className={tabClass('revenue')}>
              <Coins size={14} /> Revenue
            </button>
            <button onClick={() => setActiveTab('resources')} className={tabClass('resources')}>
              <FolderLock size={14} /> Manage Resources ({verifiedResources.length})
            </button>
            <button onClick={() => setActiveTab('upload')} className={tabClass('upload')}>
              <Upload size={14} /> Direct Upload
            </button>
            <button onClick={() => setActiveTab('jobs')} className={tabClass('jobs')}>
              <Briefcase size={14} /> Placements
            </button>
            <button onClick={() => setActiveTab('users')} className={tabClass('users')}>
              <Users size={14} /> User Manager ({users.length})
            </button>
          </div>
        </div>

        {/* Tab Displays */}
        {loading && (activeTab === 'verification' || activeTab === 'resources' || activeTab === 'users' || activeTab === 'payments' || activeTab === 'revenue') ? (
          <div className="animate-pulse space-y-4">
             <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
             <div className="h-24 bg-white/5 rounded-xl border border-white/5" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* TAB 1: VERIFICATION QUEUE */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                {pendingResources.length === 0 ? (
                  <div className="text-center py-20 glass-card">
                    <p className="text-slate-500 text-sm">No resources pending admin review inside verification queue.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {pendingResources.map((res) => (
                      <div key={res.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-cyan-500">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 text-[9px] font-bold uppercase tracking-wider border border-cyan-400/10">{res.category}</span>
                            {res.semester && (
                              <span className="px-2.5 py-0.5 rounded bg-blue-400/10 text-blue-400 text-[9px] font-bold uppercase tracking-wider border border-blue-400/10">{res.semester}</span>
                            )}
                            {res.branch && (
                              <span className="px-2.5 py-0.5 rounded bg-purple-400/10 text-purple-400 text-[9px] font-bold uppercase tracking-wider border border-purple-400/10">{res.branch}</span>
                            )}
                            <span className="text-slate-600 font-mono text-[10px]">{new Date(res.createdAt).toLocaleString()}</span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{res.title}</h3>
                          <p className="text-xs text-slate-400 mb-4">{res.description || 'No description provided.'}</p>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono text-slate-500 uppercase">
                            <span>FORMAT: <strong className="text-slate-300">{res.contentType}</strong></span>
                            <span>BY: <strong className="text-slate-300">{res.uploaderName}</strong></span>
                            <span>PAYMENT: <strong className={res.isPaid ? 'text-orange-400' : 'text-green-400'}>{res.isPaid ? `PAID (₹${res.price})` : 'FREE'}</strong></span>
                            <span>LINK: <a href={res.fileUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline lowercase hover:text-cyan-300">{res.fileUrl}</a></span>
                          </div>

                          {/* Storage Migration Panel */}
                          <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <Shield size={12} /> Admin Storage Optimizer & File Migration
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">New Google Drive URL (saves server space)</label>
                                <input
                                  type="url"
                                  placeholder="https://drive.google.com/file/d/..."
                                  value={res.tempDriveUrl !== undefined ? res.tempDriveUrl : (res.fileUrl.includes('drive.google.com') ? res.fileUrl : '')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPendingResources(prev => prev.map(p => p.id === res.id ? { ...p, tempDriveUrl: val } : p));
                                  }}
                                  className="w-full h-9 px-3 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-cyan-400 text-xs font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Override Content Type</label>
                                <select
                                  value={res.tempContentType !== undefined ? res.tempContentType : res.contentType}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPendingResources(prev => prev.map(p => p.id === res.id ? { ...p, tempContentType: val } : p));
                                  }}
                                  className="w-full h-9 px-3 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-cyan-400 text-xs"
                                >
                                  <option value="pdf-local">PDF (Local)</option>
                                  <option value="pdf-gdrive">PDF (Google Drive)</option>
                                  <option value="video-local">Video (Local)</option>
                                  <option value="video-gdrive">Video (Google Drive / YouTube)</option>
                                  <option value="image-local">Image (Local)</option>
                                  <option value="image-gdrive">Image (Google Drive)</option>
                                  <option value="document-local">Other Document (Local)</option>
                                  <option value="document-gdrive">Other Document (Google Drive)</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <a
                                href={res.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black rounded-lg border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                              >
                                <Download size={12} /> Download Original File
                              </a>
                              {res.fileUrl.includes('firebasestorage.googleapis.com') ? (
                                <span className="text-[9px] font-mono text-orange-400">
                                  ⚠️ Currently hosted on Firebase Storage. Download it, upload to Google Drive, paste URL above to save server space.
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono text-slate-500">
                                  ✓ Currently hosted on Google Drive or external link.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t md:border-t-0 border-white/5 shrink-0">
                          <button onClick={() => handleVerify(res, true)} className="px-4 py-2.5 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-500/20 hover:border-emerald-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer">
                            <Check size={14} /> Approve
                          </button>
                          <button onClick={() => handleVerify(res, false)} className="px-4 py-2.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl border border-red-500/20 hover:border-red-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer">
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RESOURCE MANAGER */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                {verifiedResources.length === 0 ? (
                  <div className="text-center py-20 glass-card">
                    <p className="text-slate-500 text-sm">No verified study resources inside the database.</p>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden border-white/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                            <th className="p-6">Resource Title / Uploader</th>
                            <th className="p-6">Metadata (Category/Sem)</th>
                            <th className="p-6">Plan Cost</th>
                            <th className="p-6">Purchased By</th>
                            <th className="p-6">File URL / Download Link</th>
                            <th className="p-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {verifiedResources.map((res) => {
                            const isEditing = editingResId === res.id;

                            return (
                              <tr key={res.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="p-6">
                                  {isEditing ? (
                                    <div className="space-y-2 max-w-sm">
                                      <input
                                        type="text"
                                        value={editResTitle}
                                        onChange={(e) => setEditResTitle(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none"
                                        placeholder="Title"
                                      />
                                      <textarea
                                        value={editResDesc}
                                        onChange={(e) => setEditResDesc(e.target.value)}
                                        rows={2}
                                        className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white text-xs outline-none"
                                        placeholder="Description"
                                      />
                                    </div>
                                  ) : (
                                    <div className="max-w-sm">
                                      <div className="font-bold text-white text-sm mb-1">{res.title}</div>
                                      <div className="text-slate-500 text-[10px] line-clamp-1">{res.description || 'No description provided.'}</div>
                                      <div className="text-slate-600 text-[9px] font-mono mt-1 uppercase">UPLOADER: {res.uploaderName}</div>
                                    </div>
                                  )}
                                </td>

                                <td className="p-6">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <select
                                        value={editResCategory}
                                        onChange={(e) => setEditResCategory(e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                                      >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                      
                                      {(editResCategory === 'GATE' || editResCategory === 'Semester Notes') && (
                                        <select
                                          value={editResBranch}
                                          onChange={(e) => setEditResBranch(e.target.value)}
                                          className="block bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                                        >
                                          {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                      )}

                                      {editResCategory === 'Semester Notes' && (
                                        <select
                                          value={editResSemester}
                                          onChange={(e) => setEditResSemester(e.target.value)}
                                          className="block bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                                        >
                                          {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/10 font-mono text-[9px] uppercase font-bold">
                                        {res.category}
                                      </div>
                                      {res.branch && (
                                        <div className="text-slate-400 text-[10px] font-medium">{res.branch}</div>
                                      )}
                                      {res.semester && (
                                        <div className="text-blue-400 font-bold text-[9px] font-mono">{res.semester}</div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="p-6">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <select
                                        value={editResIsPaid ? 'Paid' : 'Free'}
                                        onChange={(e) => setEditResIsPaid(e.target.value === 'Paid')}
                                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                                      >
                                        <option value="Free">Free</option>
                                        <option value="Paid">Paid</option>
                                      </select>
                                      
                                      {editResIsPaid && (
                                        <input
                                          type="number"
                                          value={editResPrice}
                                          onChange={(e) => setEditResPrice(Number(e.target.value))}
                                          className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none"
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <span className={`font-bold ${res.isPaid ? 'text-orange-400' : 'text-green-400'}`}>
                                      {res.isPaid ? `PAID (₹${res.price})` : 'FREE'}
                                    </span>
                                  )}
                                </td>

                                <td className="p-6 font-mono text-xs">
                                  {res.isPaid ? (
                                    <span className="font-bold text-white">
                                      {purchases.filter(p => p.resourceId === res.id).length} user(s)
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">N/A (Free)</span>
                                  )}
                                </td>

                                <td className="p-6">
                                  {isEditing ? (
                                    <input
                                      type="url"
                                      value={editResFileUrl}
                                      onChange={(e) => setEditResFileUrl(e.target.value)}
                                      className="w-full bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white font-mono text-xs outline-none"
                                    />
                                  ) : (
                                    <div className="max-w-[200px] truncate">
                                      <a href={res.fileUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline font-mono text-[10px] lowercase hover:text-cyan-300">
                                        {res.fileUrl}
                                      </a>
                                      {res.storagePath && (
                                        <span className="block text-[8px] text-slate-500 font-mono uppercase mt-0.5">STORAGE NODE: {res.storagePath}</span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="p-6 text-right">
                                  <div className="flex gap-2 justify-end">
                                    {isEditing ? (
                                      <button onClick={() => handleSaveResource(res.id)} className="p-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 transition-all cursor-pointer">
                                        <Save size={14} />
                                      </button>
                                    ) : (
                                      <button onClick={() => startEditResource(res)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer">
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                    <button onClick={() => handleDeleteResource(res)} className="p-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg border border-red-500/20 transition-all cursor-pointer">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DIRECT RESOURCE UPLOAD */}
            {activeTab === 'upload' && (
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleDirectUpload} className="space-y-6">
                  <div className="glass-card p-8 md:p-10 space-y-6">
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                      <Plus className="text-cyan-400" size={20} /> Publish Verified Document
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" onClick={() => setUpResourceType('note')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${upResourceType === 'note' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>
                        Study Note / Book
                      </button>
                      <button type="button" onClick={() => setUpResourceType('pyq')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${upResourceType === 'pyq' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>
                        Previous Year Paper (PYQ)
                      </button>
                    </div>

                    {/* Choose Source Mode */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Source Mode</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => { setUpUploadType('local'); setUpContentType('pdf-local'); }}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border cursor-pointer ${upUploadType === 'local' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                        >
                          Local File Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => { setUpUploadType('drive'); setUpContentType('pdf-gdrive'); }}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all border cursor-pointer ${upUploadType === 'drive' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                        >
                          External URL Link
                        </button>
                      </div>
                    </div>

                    {/* Local File Selector */}
                    {upUploadType === 'local' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Physical File</label>
                        <div className="relative border-2 border-dashed border-white/10 hover:border-cyan-400/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all bg-[#0A0C16]/50">
                          <input
                            type="file"
                            accept=".pdf,.mp4,.docx,.pptx,.png,.jpg,.jpeg"
                            onChange={handleLocalFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          {upSelectedFile ? (
                            <div className="flex flex-col items-center gap-1.5 text-center relative z-20">
                              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
                                {upSelectedFile.type.includes('video') ? <Video size={20} /> : <FileText size={20} />}
                              </div>
                              <span className="text-xs font-bold text-white max-w-xs truncate">{upSelectedFile.name}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{(upSelectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>
                          ) : (
                            <>
                              <Upload size={24} className="text-slate-600 animate-pulse" />
                              <span className="text-xs text-slate-400 font-semibold">Click or drag physical study file</span>
                              <span className="text-[9px] text-slate-600 font-mono">PDF, MP4, documents up to 50MB</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Google Drive URL */
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Google Drive Sharing Link</label>
                        <input required type="url" placeholder="https://drive.google.com/file/d/..." value={upFileUrl} onChange={(e) => setUpFileUrl(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 font-mono text-xs"/>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Resource Name</label>
                        <input required type="text" placeholder="Compiler Design Note" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Category</label>
                        <select value={upCategory} onChange={(e) => setUpCategory(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <AnimatePresence>
                      {upCategory === 'Semester Notes' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Semester</label>
                          <select value={upSemester} onChange={(e) => setUpSemester(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs">
                            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </motion.div>
                      )}

                      {(upCategory === 'GATE' || upCategory === 'Semester Notes') && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Academic Branch / Specialty</label>
                          <select value={upBranch} onChange={(e) => setUpBranch(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs">
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Description</label>
                      <textarea rows={3} placeholder="Provide details on the chapters, subjects, or concepts..." value={upDesc} onChange={(e) => setUpDesc(e.target.value)} className="w-full p-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs leading-relaxed"/>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">Paid Note settings</h3>
                          <p className="text-xs text-slate-500">Is this a premium asset requiring unlock fee?</p>
                        </div>
                        <button type="button" onClick={() => setUpIsPaid(!upIsPaid)} className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${upIsPaid ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${upIsPaid ? 'translate-x-6' : ''}`} />
                        </button>
                      </div>
                      
                      {upIsPaid && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-600">Price (INR)</label>
                          <input type="number" value={upPrice} onChange={(e) => setUpPrice(Number(e.target.value))} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs" placeholder="99"/>
                        </div>
                      )}
                    </div>

                    {/* Progress tracking display */}
                    {upLoading && upUploadType === 'local' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-cyan-400 font-bold uppercase">
                          <span>Uploading physical file...</span>
                          <span>{upProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-300" style={{ width: `${upProgress}%` }} />
                        </div>
                      </div>
                    )}

                    <button disabled={upLoading} className="w-full h-14 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider">
                      {upLoading ? <Loader2 className="animate-spin" size={16} /> : 'Publish Document Node'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 4: BROADCAST & MANAGE PLACEMENT OPPORTUNITIES */}
            {activeTab === 'jobs' && (
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                
                {/* Form column */}
                <form onSubmit={handleBroadcastJob} className="space-y-6">
                  <div className="glass-card p-8 space-y-6">
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                      <Briefcase className="text-cyan-400" size={20} /> Broadcast Placement Alert
                    </h2>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Opportunity Type</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => setJobType('job')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${jobType === 'job' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>
                          Full-Time Job
                        </button>
                        <button type="button" onClick={() => setJobType('intern')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${jobType === 'intern' ? 'accent-cyan text-white border-cyan-400/50' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>
                          Summer/Winter Intern
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Job Title / Role</label>
                        <input required type="text" placeholder="Software Engineer (SDE-1)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Target Batch Year</label>
                        <select value={jobYear} onChange={(e) => setJobYear(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs">
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Company Name</label>
                      <input required type="text" placeholder="Google India" value={jobCompany} onChange={(e) => setJobCompany(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 text-xs" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Application URL</label>
                      <input required type="url" placeholder="https://careers.google.com/jobs/..." value={jobApplyLink} onChange={(e) => setJobApplyLink(e.target.value)} className="w-full h-12 px-4 bg-[#0A0C16] border border-white/10 rounded-xl text-white outline-none focus:border-cyan-400 font-mono text-xs" />
                    </div>

                    <button disabled={jobLoading} className="w-full h-14 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer text-xs uppercase tracking-wider">
                      {jobLoading ? <Loader2 className="animate-spin" size={16} /> : 'Broadcast Alert'}
                    </button>
                  </div>
                </form>

                {/* Manage List column */}
                <div className="glass-card p-6 md:p-8 space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                    <Briefcase className="text-cyan-400" size={18} /> Active Placements List
                  </h3>

                  {loadingJobsList ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-6">
                      <Loader2 className="animate-spin" size={14} /> Retrieving placements...
                    </div>
                  ) : activeJobsList.length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono py-6 text-center">No active recruitment alerts available.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeJobsList.map((job) => (
                        <div key={job.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-white">{job.title}</h4>
                            <div className="flex items-center gap-3 text-[9px] text-slate-500 font-mono uppercase mt-1">
                              <span className="text-slate-300 font-sans font-semibold">{job.company}</span>
                              <span>•</span>
                              <span>Batch {job.year}</span>
                              <span>•</span>
                              <span className={`px-1.5 rounded ${job.type === 'intern' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{job.type}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {/* Standard jobs in Firestore have numeric/alphanumeric IDs rather than row/mock headers */}
                            {!job.id.startsWith('row-') && !job.id.startsWith('mock-') && (
                              <button 
                                type="button"
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                                title="Delete Listing"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <a href={job.applyLink} target="_blank" rel="noreferrer" className="p-2 bg-white/5 text-slate-400 hover:text-white rounded-lg border border-white/10 transition-colors" title="Visit link">
                              <Plus className="rotate-45" size={12} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 5: USER MANAGER */}
            {activeTab === 'users' && (
              <div className="glass-card overflow-hidden border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        <th className="p-6">User / Email</th>
                        <th className="p-6">Batch / Exam</th>
                        <th className="p-6">System Role</th>
                        <th className="p-6">Plan Status</th>
                        <th className="p-6">Expiry Date</th>
                        <th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {users.map((u) => {
                        const isEditing = editingUserId === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="p-6">
                              <div className="font-bold text-white text-sm mb-1">{u.name}</div>
                              <div className="font-mono text-slate-500 text-[10px]">{u.email}</div>
                            </td>

                            <td className="p-6">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editUserBatch}
                                  onChange={(e) => setEditUserBatch(e.target.value)}
                                  className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-400"
                                />
                              ) : (
                                <div>
                                  <div className="font-medium text-slate-300">{u.batch || 'General Prep'}</div>
                                  {u.username && (
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      @{u.username}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="p-6">
                              {isEditing ? (
                                <select
                                  value={editUserRole}
                                  onChange={(e) => setEditUserRole(e.target.value as any)}
                                  className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none"
                                >
                                  <option value="user">User</option>
                                  <option value="cyber">Cyber</option>
                                  <option value="admin">Admin</option>
                                </select>
                              ) : (
                                <span className={`px-2 py-0.5 rounded font-mono uppercase font-bold text-[9px] ${
                                  u.role === 'admin' ? 'bg-purple-500/25 text-purple-400 border border-purple-500/20' :
                                  u.role === 'cyber' ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/20' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {u.role || 'user'}
                                </span>
                              )}
                            </td>

                            <td className="p-6">
                              {isEditing ? (
                                <select
                                  value={editUserPlan}
                                  onChange={(e) => setEditUserPlan(e.target.value as any)}
                                  className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none"
                                >
                                  <option value="Free">Free</option>
                                  <option value="Paid">Paid</option>
                                </select>
                              ) : (
                                <span className={`flex items-center gap-1.5 font-bold ${u.planStatus === 'Paid' ? 'text-green-400' : 'text-slate-500'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${u.planStatus === 'Paid' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-slate-700'}`} />
                                  {u.planStatus || 'Free'}
                                </span>
                              )}
                            </td>

                            <td className="p-6">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editUserExpiry}
                                  placeholder="e.g. 2026-12-31"
                                  onChange={(e) => setEditUserExpiry(e.target.value)}
                                  className="bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none font-mono"
                                />
                              ) : (
                                <span className="font-mono text-slate-400">{u.expiryDate || 'N/A'}</span>
                              )}
                            </td>

                            <td className="p-6 text-right">
                              <div className="flex gap-2 justify-end">
                                {isEditing ? (
                                  <button onClick={() => handleSaveUser(u.id)} className="p-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 transition-all cursor-pointer">
                                    <Save size={14} />
                                  </button>
                                ) : (
                                  <button onClick={() => startEditUser(u)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer">
                                    <Edit2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: PAYMENTS & MEMBERSHIP ACTIVATIONS QUEUE */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Coins className="text-cyan-400" size={18} /> Payments Verification Queue
                    </h2>
                    <p className="text-[10px] text-slate-500">Review, approve, or decline subscription and file payment requests.</p>
                  </div>

                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider gap-0.5">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setPaymentsFilter(status)}
                        className={`px-3 py-1.5 rounded cursor-pointer transition-all ${paymentsFilter === status ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="text-center py-20 glass-card">
                    <p className="text-slate-500 text-sm">No payment requests found for this filter.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {filteredPayments.map((req) => {
                      const isResource = req.type === 'resource' || req.resourceId;
                      const isPendingAction = paymentActionLoading === req.id;
                      const isPending = req.status === 'pending' || !req.status;
                      
                      return (
                        <div 
                          key={req.id} 
                          className={`glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 ${
                            req.status === 'approved' ? 'border-l-emerald-500' :
                            req.status === 'rejected' ? 'border-l-red-500' :
                            'border-l-amber-500'
                          }`}
                        >
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2.5 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-400/10">
                                {req.type || 'resource'}
                              </span>
                              <span className="text-slate-600 font-mono text-[10px]">
                                Submitted: {new Date(req.createdAt).toLocaleString()}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono ${
                                req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                                'bg-orange-500/10 text-orange-400 border border-orange-500/10'
                              }`}>
                                {req.status || 'pending'}
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2">
                              {isResource ? `Buy File: ${req.resourceTitle}` : `Membership: ${req.planName} Plan`}
                            </h3>
                            
                            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-400 uppercase pt-2">
                              <div>
                                <span className="text-[9px] text-slate-600 block">User Name</span>
                                <strong className="text-slate-300">{req.fullName}</strong>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-600 block">User Email</span>
                                <strong className="text-slate-300 lowercase">{req.email}</strong>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-600 block">Transaction Reference ID</span>
                                <strong className="text-cyan-400">{req.transactionId}</strong>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-600 block">Amount Submitted</span>
                                <strong className="text-emerald-400">₹{req.amount}.00</strong>
                              </div>
                            </div>
                          </div>
                          
                          {isPending && (
                            <div className="flex gap-3 pt-4 border-t md:border-t-0 border-white/5 shrink-0">
                              <button 
                                disabled={isPendingAction}
                                onClick={() => handlePaymentVerification(req, true)} 
                                className="px-4 py-2.5 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-500/20 hover:border-emerald-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isPendingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve & Upgrade
                              </button>
                              <button 
                                disabled={isPendingAction}
                                onClick={() => handlePaymentVerification(req, false)} 
                                className="px-4 py-2.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl border border-red-500/20 hover:border-red-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isPendingAction ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Decline
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: REVENUE OVERVIEW */}
            {activeTab === 'revenue' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Coins className="text-cyan-400" size={20} /> Revenue Dashboard
                  </h2>
                  <p className="text-xs text-slate-500">Track and overview verified collection stats, timelines, and payment source contributions.</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Left Column: Timeline Cumulative Chart */}
                  <div className="lg:col-span-2 glass-card p-6 md:p-8 space-y-6 bg-gradient-to-br from-slate-900/60 to-cyan-950/10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">Cumulative Revenue Growth</h3>
                        <p className="text-[10px] text-slate-500">Total verified earnings growth tracked over chronological days</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-400">Total: ₹{revenueData.total}.00</span>
                    </div>

                    <div className="pt-4">
                      {renderLineChart()}
                    </div>
                  </div>

                  {/* Right Column: Breakdown Donut Chart */}
                  <div className="glass-card p-6 md:p-8 space-y-6 bg-gradient-to-br from-slate-900/60 to-orange-950/10">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-base font-bold text-white">Payment Method Share</h3>
                      <p className="text-[10px] text-slate-500">Subscriptions vs. individual resource volume purchases</p>
                    </div>

                    <div className="pt-2">
                      {renderPieChart()}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
