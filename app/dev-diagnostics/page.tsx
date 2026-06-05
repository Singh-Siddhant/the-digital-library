'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Database, 
  Terminal, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  LogOut,
  ChevronLeft,
  Server,
  FileSpreadsheet,
  Cpu
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

const PUBLIC_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1VtiMY9i-q7moN1m0fifTnR7OsnxGzfHx2M3DUXWaInE/export?format=csv";

export default function DevDiagnostics() {
  const { user, userProfile, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const router = useRouter();

  // Authentication & authorization checking
  const bootstrapAdmins = ['majorguru09@gmail.com', '2024021271@mmmut.ac.in'];
  const isAuthorizedAdmin = user && (bootstrapAdmins.includes(user.email || '') || userProfile?.role === 'admin');
  
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const initRef = useRef(false);

  // Diagnostics states
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [errorReport, setErrorReport] = useState('');
  const [pingStatus, setPingStatus] = useState<string>('');
  const [pingLoading, setPingLoading] = useState(false);

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
          
          const btnParent = document.getElementById("googleBtnDevDiagnostics");
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
      setLoginError(err.message || 'Authentication failed.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const loadDiagnosticsReport = async () => {
    setLoadingReport(true);
    setErrorReport('');
    try {
      const response = await axios.get('/api/dev-diagnostics');
      setReport(response.data);
    } catch (err: any) {
      console.error(err);
      setErrorReport(err.response?.data?.error || err.message || 'Failed to fetch diagnostics reports.');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadDiagnosticsReport();
    }
  }, [isAuthorizedAdmin]);

  const triggerTestJobPing = async () => {
    setPingLoading(true);
    setPingStatus('');
    try {
      const testJob = {
        title: "Test Sync Alert (Dev Ping)",
        company: "Diagnostics Console",
        year: "2026",
        type: "job",
        applyLink: "https://google.com",
        createdAt: new Date().toISOString()
      };
      
      const res = await axios.post('/api/jobs', testJob);
      setPingStatus(`Ping Success! Firestore entry ID: ${res.data.id}. Google Sheet update completed.`);
      loadDiagnosticsReport(); // Refresh report counts
    } catch (err: any) {
      setPingStatus(`Ping Failed: ${err.response?.data?.error || err.message || 'Unknown write error.'}`);
    } finally {
      setPingLoading(false);
    }
  };

  // Render loading state for auth check
  if (authLoading) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Guest view (Unauthenticated)
  if (!user) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center p-4">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        <div className="glass-card w-full max-w-md p-10 text-center relative z-10">
          <div className="w-14 h-14 bg-[#1e1b4b] border border-cyan-400/20 rounded-xl mx-auto flex items-center justify-center mb-8">
            <ShieldAlert className="text-cyan-400 w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-3 text-white tracking-tight">System Developer Diagnostics</h1>
          <p className="text-slate-500 mb-10 text-xs leading-relaxed">Please authenticate with an administrator account to access deep systems diagnostics logs.</p>
          {loginError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg mb-8">
              {loginError}
            </div>
          )}
          <div className="flex flex-col items-center justify-center min-h-[56px] w-full">
            {loadingLogin ? (
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider py-4">
                <Loader2 className="animate-spin" size={18} />
                Authenticating...
              </div>
            ) : (
              <div id="googleBtnDevDiagnostics" className="w-full flex justify-center" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not Admin
  if (!isAuthorizedAdmin) {
    return (
      <div className="immersive-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-10 text-center relative z-10 border-red-500/20">
          <div className="w-14 h-14 bg-red-500/10 rounded-xl mx-auto flex items-center justify-center mb-8 border border-red-500/20 text-red-500">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-3 text-white tracking-tight">Clearance Rejected</h1>
          <p className="text-slate-500 mb-8 text-xs leading-relaxed">
            Your email ({user.email}) does not have Developer/Admin clearance to access diagnostic records.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full h-12 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-xl flex items-center justify-center hover:bg-white/10 hover:text-white transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  // Diagnostic card coloring utility
  const getStatusCard = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="text-emerald-400" size={18} />,
          text: 'Connected',
          class: 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.02]'
        };
      case 'error':
        return {
          icon: <XCircle className="text-red-400" size={18} />,
          text: 'Connection Error',
          class: 'border-l-4 border-l-red-500 bg-red-500/[0.02]'
        };
      case 'not_configured':
        return {
          icon: <AlertTriangle className="text-amber-400" size={18} />,
          text: 'Not Configured',
          class: 'border-l-4 border-l-amber-500 bg-amber-500/[0.02]'
        };
      default:
        return {
          icon: <Loader2 className="animate-spin text-cyan-400" size={18} />,
          text: 'Testing Connection...',
          class: 'border-l-4 border-l-cyan-500 bg-cyan-500/[0.02]'
        };
    }
  };

  return (
    <div className="immersive-bg min-h-screen flex flex-col text-slate-200">
      {/* Dev Navbar */}
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={16} /> Back to Dashboard
              </Link>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">Systems Diagnostics</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">{user.email}</span>
              <button 
                onClick={() => logout().then(() => router.push('/'))}
                className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-white/5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut size={12} /> Log Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12 w-full flex-grow relative z-10">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
              <Cpu className="text-cyan-400 animate-pulse" size={28} /> System Integration Diagnostics
            </h1>
            <p className="text-slate-500 text-sm">Validates Vercel configurations, Firestore database access, and spreadsheet sync connectivity.</p>
          </div>

          <button 
            disabled={loadingReport}
            onClick={loadDiagnosticsReport}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            {loadingReport ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
            Run Analysis
          </button>
        </div>

        {errorReport && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mb-8 space-y-2">
            <h3 className="font-bold flex items-center gap-2"><XCircle size={16} /> API Handshake Failed</h3>
            <p className="text-xs font-mono">{errorReport}</p>
          </div>
        )}

        {loadingReport && !report ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin text-cyan-400 mx-auto mb-4" size={32} />
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Compiling diagnostics diagnostics report...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Quick Health Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Firestore Indicator */}
              <div className={`glass-card p-6 flex items-start gap-4 ${getStatusCard(report?.firestore?.status).class}`}>
                <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                  <Database size={20} />
                </div>
                <div className="flex-grow space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Database Connectivity</span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                    {getStatusCard(report?.firestore?.status).icon}
                    {getStatusCard(report?.firestore?.status).text}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Project: {report?.firestore?.projectId || 'n/a'}</p>
                </div>
              </div>

              {/* Apps Script Indicator */}
              <div className={`glass-card p-6 flex items-start gap-4 ${getStatusCard(report?.appsScriptConnection?.status).class}`}>
                <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                  <Server size={20} />
                </div>
                <div className="flex-grow space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Google Apps Script</span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                    {getStatusCard(report?.appsScriptConnection?.status).icon}
                    {getStatusCard(report?.appsScriptConnection?.status).text}
                  </h3>
                  {report?.appsScriptConnection?.latencyMs > 0 && (
                    <p className="text-[10px] text-emerald-400 font-mono">Ping: {report.appsScriptConnection.latencyMs}ms</p>
                  )}
                  {report?.appsScriptConnection?.error && (
                    <p className="text-[10px] text-red-400 font-mono truncate">Code: {report.appsScriptConnection.statusCode || '500'}</p>
                  )}
                </div>
              </div>

              {/* Public CSV Indicator */}
              <div className={`glass-card p-6 flex items-start gap-4 ${getStatusCard(report?.publicCsvConnection?.status).class}`}>
                <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="flex-grow space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Public CSV Reader</span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                    {getStatusCard(report?.publicCsvConnection?.status).icon}
                    {getStatusCard(report?.publicCsvConnection?.status).text}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Fetched Rows: {report?.publicCsvConnection?.rowCount || 0}</p>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Vercel Environment Variables card */}
              <div className="glass-card p-8 space-y-6">
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                  <Terminal className="text-cyan-400" size={16} /> Environment Keys validation
                </h3>
                
                <div className="space-y-4 text-xs">
                  {/* Client Email check */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold tracking-tight text-slate-400">FIREBASE_CLIENT_EMAIL</span>
                      {report?.envVariables?.FIREBASE_CLIENT_EMAIL?.configured ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">Configured</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold text-[9px] uppercase tracking-wider">Missing</span>
                      )}
                    </div>
                    {report?.envVariables?.FIREBASE_CLIENT_EMAIL?.configured && (
                      <p className="text-[10px] font-mono text-slate-500 lowercase bg-[#030407] p-2 rounded truncate border border-white/5">{report.envVariables.FIREBASE_CLIENT_EMAIL.value}</p>
                    )}
                  </div>

                  {/* Private Key check */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold tracking-tight text-slate-400">FIREBASE_PRIVATE_KEY</span>
                      {report?.envVariables?.FIREBASE_PRIVATE_KEY?.configured ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">Configured</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold text-[9px] uppercase tracking-wider">Missing</span>
                      )}
                    </div>
                    {report?.envVariables?.FIREBASE_PRIVATE_KEY?.configured && (
                      <div className="space-y-1.5 text-[10px] font-mono">
                        <div className="flex justify-between border-b border-white/5 py-1 text-slate-500">
                          <span>Key Length:</span>
                          <span className="text-white">{report.envVariables.FIREBASE_PRIVATE_KEY.length} characters</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1 text-slate-500">
                          <span>Cert Boundary Match:</span>
                          <span className={report.envVariables.FIREBASE_PRIVATE_KEY.isValidFormat ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold flex items-center gap-1'}>
                            {report.envVariables.FIREBASE_PRIVATE_KEY.isValidFormat ? 'Valid (BEGIN/END tags found)' : 'Invalid Format (Check BEGIN/END tags)'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1 text-slate-500">
                          <span>Contains escaped newlines (`\\n`):</span>
                          <span className={report.envVariables.FIREBASE_PRIVATE_KEY.hasEscapedNewlines ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                            {report.envVariables.FIREBASE_PRIVATE_KEY.hasEscapedNewlines ? 'Yes (Requires parsing replace)' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 text-slate-500">
                          <span>Contains raw newlines:</span>
                          <span className="text-slate-400">{report.envVariables.FIREBASE_PRIVATE_KEY.hasNewlines ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apps Script Endpoint check */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold tracking-tight text-slate-400">JOBS_SHEET_URL</span>
                      {report?.envVariables?.JOBS_SHEET_URL?.configured ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">Configured</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[9px] uppercase tracking-wider">Missing</span>
                      )}
                    </div>
                    {report?.envVariables?.JOBS_SHEET_URL?.configured && (
                      <p className="text-[10px] font-mono text-slate-500 bg-[#030407] p-2 rounded truncate border border-white/5">{report.envVariables.JOBS_SHEET_URL.value}</p>
                    )}
                  </div>

                </div>
              </div>

              {/* Firestore Document Counts card */}
              <div className="glass-card p-8 space-y-6">
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                  <Database className="text-cyan-400" size={16} /> Firestore Node Metrics
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-24">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Users Collection</span>
                    <strong className="text-2xl text-white font-display font-semibold mt-1">{report?.firestore?.counts?.users || 0}</strong>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-24">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Resources Collection</span>
                    <strong className="text-2xl text-white font-display font-semibold mt-1">{report?.firestore?.counts?.resources || 0}</strong>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-24">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Payment Requests</span>
                    <strong className="text-2xl text-white font-display font-semibold mt-1">{report?.firestore?.counts?.paymentRequests || 0}</strong>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-24">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Broadcaster Jobs</span>
                    <strong className="text-2xl text-white font-display font-semibold mt-1">{report?.firestore?.counts?.jobs || 0}</strong>
                  </div>
                </div>

                {report?.firestore?.error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed font-mono">
                    <strong>Query Error Details:</strong>
                    <p className="mt-1">{report.firestore.error.message}</p>
                    <p className="mt-1 text-[10px] text-red-400/75 select-all">{report.firestore.error.details}</p>
                  </div>
                )}
              </div>

            </div>

            {/* Integration Tester Box */}
            <div className="glass-card p-8 space-y-6">
              <h3 className="text-base font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                <Terminal className="text-cyan-400" size={16} /> Google Sheet Write Sync Tester
              </h3>

              <div className="space-y-4">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Triggering the test sync will write a simulated Job placement entry labeled <strong>"Test Sync Alert (Dev Ping)"</strong> into both your Firestore database and Google Sheet Apps Script URL. This allows verifying if the server-side API writes successfully bypassing all authorization rules.
                </p>

                <div className="flex flex-wrap gap-4 items-center">
                  <button
                    disabled={pingLoading}
                    onClick={triggerTestJobPing}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-xl shadow-cyan-500/10 cursor-pointer"
                  >
                    {pingLoading ? <Loader2 className="animate-spin" size={14} /> : null}
                    Trigger test sync write
                  </button>
                  
                  {report?.publicCsvConnection?.status === 'connected' && (
                    <a
                      href={PUBLIC_SHEET_CSV_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Inspect Sheet raw CSV
                    </a>
                  )}
                </div>

                {pingStatus && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed font-mono ${
                    pingStatus.includes('Success') 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {pingStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Troubleshooting checklist */}
            <div className="glass-card p-8 space-y-6 border border-white/10">
              <h3 className="text-base font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={16} /> Integration Troubleshooting checklist
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-400">
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">1. Fixing Firestore "Missing or insufficient permissions"</h4>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Confirm that you generated a service account credentials JSON in <strong>Firebase Console &rarr; Project Settings &rarr; Service Accounts</strong>.</li>
                    <li>Verify the Vercel Environment variables are named exactly:
                      <ul className="list-disc list-inside pl-4 mt-1 font-mono text-[10px]">
                        <li>`FIREBASE_CLIENT_EMAIL`</li>
                        <li>`FIREBASE_PRIVATE_KEY`</li>
                      </ul>
                    </li>
                    <li>If the Vercel private key contains double quotes, remove them so it is just the raw text starting with <code className="font-mono bg-[#030407] px-1 py-0.5 rounded text-white">-----BEGIN PRIVATE KEY-----</code>.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">2. Fixing "Sheet Sync Failed"</h4>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Open your Apps Script deployment and make sure it is configured to execute as <strong>"Me"</strong> and who has access is set to <strong>"Anyone"</strong>.</li>
                    <li>Double check that the <strong>`JOBS_SHEET_URL`</strong> variable in your Vercel project matches the Web App URL exactly (ends in <code className="font-mono text-cyan-400">/exec</code>).</li>
                    <li>Ensure the columns of the sheet are completely free of custom cell-merges, matching columns: Title, Company, Year, Type, link.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
