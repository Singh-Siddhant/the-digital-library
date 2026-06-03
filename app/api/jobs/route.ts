import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { adminDb } from '../../lib/firebase-admin';

// Public view link converted to CSV format for fast display reads
const PUBLIC_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1VtiMY9i-q7moN1m0fifTnR7OsnxGzfHx2M3DUXWaInE/export?format=csv";
const JOBS_SHEET_URL = process.env.JOBS_SHEET_URL || '';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch from Firestore
    let firestoreJobs: any[] = [];
    try {
      const snapshot = await adminDb.collection('jobs').orderBy('createdAt', 'desc').get();
      firestoreJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error reading jobs from Firestore:", e);
    }

    // 2. Fetch directly from the public Google Sheet CSV URL (extremely fast & cached)
    let sheetJobs: any[] = [];
    try {
      const response = await axios.get(PUBLIC_SHEET_CSV_URL, { timeout: 6000 });
      const csvText = response.data as string;
      const lines = csvText.split('\n');
      
      // Parse CSV lines (expecting columns: title, company, year, type, applyLink, createdAt)
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (columns.length >= 5) {
          sheetJobs.push({
            id: `sheet-${i}-${columns[0].substring(0,3)}`,
            title: columns[0],
            company: columns[1],
            year: columns[2],
            type: columns[3] === 'intern' ? 'intern' : 'job',
            applyLink: columns[4],
            createdAt: columns[5] || new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Google Sheets public CSV fetch failed:", err);
    }

    // 3. Merge & Deduplicate
    const allJobsMap = new Map<string, any>();
    
    sheetJobs.forEach(job => {
      const key = `${job.title.toLowerCase().trim()}_${job.company.toLowerCase().trim()}`;
      allJobsMap.set(key, job);
    });

    firestoreJobs.forEach(job => {
      const key = `${job.title.toLowerCase().trim()}_${job.company.toLowerCase().trim()}`;
      allJobsMap.set(key, job);
    });

    const mergedJobs = Array.from(allJobsMap.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(mergedJobs);
  } catch (err: any) {
    console.error("Jobs GET API Error:", err);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.company || !body.applyLink) {
      return NextResponse.json({ error: 'Title, company, and applyLink are required.' }, { status: 400 });
    }

    const jobData = {
      title: body.title,
      company: body.company,
      year: body.year || '2025',
      type: body.type === 'intern' ? 'intern' : 'job',
      applyLink: body.applyLink,
      createdAt: body.createdAt || new Date().toISOString()
    };

    // 1. Save to Firebase Firestore
    const docRef = await adminDb.collection('jobs').add(jobData);

    // 2. Post to Google Sheets Apps Script URL for admin updates
    if (JOBS_SHEET_URL) {
      try {
        await axios.post(JOBS_SHEET_URL, jobData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 6000
        });
      } catch (err) {
        console.error("Error pushing job to Apps Script sheet:", err);
        // Do not fail Firestore since it completed
      }
    } else {
      console.warn("JOBS_SHEET_URL env variable not configured. Apps Script sheet bypass.");
    }

    return NextResponse.json({ status: 'success', id: docRef.id });
  } catch (err: any) {
    console.error("Error creating job posting:", err);
    return NextResponse.json({ error: err.message || 'Failed to create job posting.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    await adminDb.collection('jobs').doc(id).delete();
    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error("Error deleting job from Firestore:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
