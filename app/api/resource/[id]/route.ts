import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { adminAuth, adminDb } from '../../../lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Authenticate user from secure HttpOnly session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('lib_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    let decodedToken;
    try {
      const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${sessionToken}`);
      decodedToken = response.data;
      if (!decodedToken || decodedToken.aud !== "714314998273-55vo9d46u0n6alrfddfd2murgvcsjidg.apps.googleusercontent.com") {
        throw new Error('Invalid audience');
      }
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    const uid = decodedToken.sub;

    // 2. Fetch User Profile from Firestore to check roles
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Unauthorized: User profile missing' }, { status: 403 });
    }
    const userProfile = userDoc.data();
    const role = userProfile?.role || 'user';
    const isCyber = role === 'cyber';
    const isAdmin = role === 'admin';

    // 3. Fetch Resource Details from Firestore
    const resDoc = await adminDb.collection('resources').doc(id).get();
    if (!resDoc.exists) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    const resource = resDoc.data();

    // 4. Access Control validation
    if (resource?.isPaid) {
      // Check if cyber/admin or if purchased
      if (!isCyber && !isAdmin) {
        const purchaseQuery = await adminDb.collection('purchases')
          .where('userId', '==', uid)
          .where('resourceId', '==', id)
          .limit(1)
          .get();

        if (purchaseQuery.empty) {
          return NextResponse.json({ 
            error: 'Access Denied: Payment required to access this resource.' 
          }, { status: 403 });
        }
      }
    }

    // 5. Secure Streaming Proxy Logic (Google Drive Direct stream)
    const fileUrl = resource?.fileUrl || '';
    if (!fileUrl) {
      return NextResponse.json({ error: 'Invalid resource link URL' }, { status: 400 });
    }

    // Extract File ID from Google Drive link
    const regD = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const regId = /[?&]id=([a-zA-Z0-9_-]+)/;
    let fileId = '';
    
    let match = fileUrl.match(regD);
    if (match && match[1]) {
      fileId = match[1];
    } else {
      match = fileUrl.match(regId);
      if (match && match[1]) {
        fileId = match[1];
      }
    }

    if (!fileId) {
      // Fallback: If not Google Drive, redirect/fetch external URL securely or return direct redirect if admin/cyber
      if (isCyber || isAdmin) {
        return NextResponse.redirect(new URL(fileUrl));
      }
      return NextResponse.json({ error: 'Invalid Google Drive link format.' }, { status: 400 });
    }

    // Fetch stream from Google Drive secure direct download
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    const response = await axios({
      method: 'get',
      url: driveDownloadUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });

    const contentType = String(response.headers['content-type'] || 'application/pdf');
    
    // Return stream back to Client
    return new NextResponse(response.data as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${resource.title || 'secure-document'}"`,
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      }
    });

  } catch (err: any) {
    console.error("Resource Streaming Proxy Error:", err);
    return NextResponse.json({ 
      error: 'Streaming failure. Verify your Google Drive sharing settings (Anyone with the link can view).' 
    }, { status: 500 });
  }
}
