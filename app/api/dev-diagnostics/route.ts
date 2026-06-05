import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { adminDb, adminAuth } from '../../lib/firebase-admin';

// Public view link converted to CSV format for fast display reads
const PUBLIC_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1VtiMY9i-q7moN1m0fifTnR7OsnxGzfHx2M3DUXWaInE/export?format=csv";

export async function GET(req: NextRequest) {
  try {
    // 1. Verify credentials from the session cookie to restrict this API to Admins only
    const sessionToken = req.cookies.get('lib_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(sessionToken);
    } catch (e) {
      // Fallback: Try tokeninfo validation if verifyIdToken fails due to missing keys locally
      try {
        const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${sessionToken}`);
        decodedToken = response.data;
        if (!decodedToken || decodedToken.aud !== "714314998273-55vo9d46u0n6alrfddfd2murgvcsjidg.apps.googleusercontent.com") {
          throw new Error('Invalid audience');
        }
        decodedToken = { email: decodedToken.email, uid: decodedToken.sub };
      } catch (err) {
        return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
      }
    }

    const email = decodedToken.email || '';
    const bootstrapAdmins = ['majorguru09@gmail.com', '2024021271@mmmut.ac.in'];
    
    // Check if the user is a bootstrap admin
    let isAuthorized = bootstrapAdmins.includes(email);
    
    if (!isAuthorized) {
      // Check if user has admin role in Firestore
      try {
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'admin') {
          isAuthorized = true;
        }
      } catch (e) {
        console.error("Failed to query user doc for admin validation:", e);
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Admin clearance required.' }, { status: 403 });
    }

    // 2. Perform Diagnostics
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        vercelEnv: process.env.VERCEL_ENV || 'development',
      },
      envVariables: {
        FIREBASE_CLIENT_EMAIL: {
          configured: !!process.env.FIREBASE_CLIENT_EMAIL,
          value: process.env.FIREBASE_CLIENT_EMAIL || null,
        },
        FIREBASE_PRIVATE_KEY: {
          configured: !!process.env.FIREBASE_PRIVATE_KEY,
          length: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
          hasNewlines: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('\n') : false,
          hasEscapedNewlines: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('\\n') : false,
          isValidFormat: process.env.FIREBASE_PRIVATE_KEY ? (process.env.FIREBASE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----') && process.env.FIREBASE_PRIVATE_KEY.includes('-----END PRIVATE KEY-----')) : false,
        },
        JOBS_SHEET_URL: {
          configured: !!process.env.JOBS_SHEET_URL,
          value: process.env.JOBS_SHEET_URL ? `${process.env.JOBS_SHEET_URL.substring(0, 45)}...` : null,
        }
      },
      firestore: {
        status: 'untested',
        projectId: null,
        error: null,
        counts: {
          users: 0,
          resources: 0,
          paymentRequests: 0,
          jobs: 0
        }
      },
      appsScriptConnection: {
        status: 'untested',
        statusCode: null,
        error: null,
        latencyMs: 0
      },
      publicCsvConnection: {
        status: 'untested',
        statusCode: null,
        error: null,
        rowCount: 0
      }
    };

    // 3. Test Firestore Connectivity (Using server-side credentials)
    try {
      const dbProjId = (adminDb as any).projectId;
      diagnostics.firestore.projectId = dbProjId;

      const [snapUsers, snapResources, snapPayments, snapJobs] = await Promise.all([
        adminDb.collection('users').limit(1).get(),
        adminDb.collection('resources').limit(1).get(),
        adminDb.collection('paymentRequests').limit(1).get(),
        adminDb.collection('jobs').limit(1).get()
      ]);

      // If we made it here, read connection works!
      diagnostics.firestore.status = 'connected';

      // Fetch actual document counts (approximate using simple lists or just count query)
      const [countUsers, countResources, countPayments, countJobs] = await Promise.all([
        adminDb.collection('users').count().get(),
        adminDb.collection('resources').count().get(),
        adminDb.collection('paymentRequests').count().get(),
        adminDb.collection('jobs').count().get()
      ]);

      diagnostics.firestore.counts.users = countUsers.data().count;
      diagnostics.firestore.counts.resources = countResources.data().count;
      diagnostics.firestore.counts.paymentRequests = countPayments.data().count;
      diagnostics.firestore.counts.jobs = countJobs.data().count;

    } catch (e: any) {
      diagnostics.firestore.status = 'error';
      diagnostics.firestore.error = {
        message: e.message || 'Firestore access failed',
        code: e.code || null,
        details: e.toString()
      };
    }

    // 4. Test Google Apps Script connection
    if (process.env.JOBS_SHEET_URL) {
      const startTime = Date.now();
      try {
        // Send a GET request to test if Web App is live and deployed correctly
        const res = await axios.get(process.env.JOBS_SHEET_URL, { timeout: 6000 });
        diagnostics.appsScriptConnection.status = 'connected';
        diagnostics.appsScriptConnection.statusCode = res.status;
        diagnostics.appsScriptConnection.latencyMs = Date.now() - startTime;
      } catch (err: any) {
        diagnostics.appsScriptConnection.status = 'error';
        diagnostics.appsScriptConnection.statusCode = err.response?.status || null;
        diagnostics.appsScriptConnection.error = {
          message: err.message,
          response: err.response?.data ? String(err.response.data).substring(0, 150) : null
        };
      }
    } else {
      diagnostics.appsScriptConnection.status = 'not_configured';
    }

    // 5. Test Public CSV Download connection
    const csvStartTime = Date.now();
    try {
      const res = await axios.get(PUBLIC_SHEET_CSV_URL, { timeout: 6000 });
      diagnostics.publicCsvConnection.status = 'connected';
      diagnostics.publicCsvConnection.statusCode = res.status;
      
      const csvText = res.data as string;
      const lines = csvText.split('\n').filter(line => line.trim().length > 0);
      diagnostics.publicCsvConnection.rowCount = lines.length;
    } catch (err: any) {
      diagnostics.publicCsvConnection.status = 'error';
      diagnostics.publicCsvConnection.statusCode = err.response?.status || null;
      diagnostics.publicCsvConnection.error = {
        message: err.message,
        details: err.toString()
      };
    }

    return NextResponse.json(diagnostics);

  } catch (err: any) {
    console.error("Dev Diagnostics API Error:", err);
    return NextResponse.json({ error: 'System diagnostics query failed.', details: err.message }, { status: 500 });
  }
}
