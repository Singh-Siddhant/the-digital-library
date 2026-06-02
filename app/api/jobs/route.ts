import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Users can define their Apps Script or Google Sheets CSV endpoint in environment variables
const JOBS_SHEET_URL = process.env.JOBS_SHEET_URL || '';

export async function GET(req: NextRequest) {
  try {
    if (!JOBS_SHEET_URL) {
      // Fallback: If no sheet configured, return dynamic mock academic preparation jobs
      return NextResponse.json([
        {
          id: 'mock-1',
          title: 'Software Developer Engineer (SDE-1)',
          company: 'Google India',
          year: '2025',
          type: 'job',
          applyLink: 'https://careers.google.com',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-2',
          title: 'Cyber Security Operations Intern',
          company: 'Microsoft Cyber Center',
          year: '2026',
          type: 'intern',
          applyLink: 'https://careers.microsoft.com',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-3',
          title: 'Systems & Networks Associate',
          company: 'Cisco Systems',
          year: '2025',
          type: 'job',
          applyLink: 'https://careers.cisco.com',
          createdAt: new Date().toISOString()
        }
      ]);
    }

    const response = await axios.get(JOBS_SHEET_URL);
    let jobsData = [];

    // Parse logic depending on whether URL is Google Sheet CSV or custom Apps Script JSON
    if (JOBS_SHEET_URL.includes('output=csv')) {
      const csvText = response.data as string;
      const lines = csvText.split('\n');
      // Headers: title,company,year,type,applyLink
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (columns.length >= 5) {
          jobsData.push({
            id: `row-${i}`,
            title: columns[0],
            company: columns[1],
            year: columns[2],
            type: columns[3] === 'intern' ? 'intern' : 'job',
            applyLink: columns[4],
            createdAt: new Date().toISOString()
          });
        }
      }
    } else {
      // Apps Script API returns JSON directly
      jobsData = response.data;
    }

    return NextResponse.json(jobsData);
  } catch (err: any) {
    console.error("Jobs Dynamic API Error:", err);
    return NextResponse.json({ error: 'Failed to fetch dynamic jobs from Sheets.' }, { status: 500 });
  }
}
