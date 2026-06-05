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

    // Direct download/view prevention headers check
    const fetchDest = req.headers.get('sec-fetch-dest');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    if (fetchDest && fetchDest !== 'iframe' && fetchDest !== 'embed' && fetchDest !== 'object') {
      return NextResponse.json({ 
        error: 'Access Denied: Direct file downloading is disabled for security reasons.' 
      }, { status: 403 });
    }

    if (referer && host && !referer.includes(host)) {
      return NextResponse.json({ 
        error: 'Access Denied: Referer origin is invalid.' 
      }, { status: 403 });
    }
    
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

    // 2. Fetch User Profile from Firestore to check roles (auto-create if missing)
    let userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      const bootstrapAdmins = ['majorguru09@gmail.com', '2024021271@mmmut.ac.in'];
      const isBootstrapAdmin = bootstrapAdmins.includes(decodedToken.email || '');

      const defaultProfile = {
        uid: uid,
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Student',
        email: decodedToken.email || '',
        picture: decodedToken.picture || '',
        role: isBootstrapAdmin ? 'admin' : 'user',
        batch: 'AI/Cyber Prep',
        planStatus: 'Free',
        expiryDate: 'N/A',
        createdAt: new Date().toISOString()
      };

      await adminDb.collection('users').doc(uid).set(defaultProfile);
      userDoc = await adminDb.collection('users').doc(uid).get();
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

    // 5. Secure Streaming Proxy Logic (Google Drive or Firebase Storage stream)
    const fileUrl = resource?.fileUrl || '';
    if (!fileUrl) {
      return NextResponse.json({ error: 'Invalid resource link URL' }, { status: 400 });
    }

    // Stream from Firebase Storage securely if URL belongs to Firebase Storage
    if (fileUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const response = await axios({
          method: 'get',
          url: fileUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          }
        });

        const contentType = String(response.headers['content-type'] || 'application/pdf');
        
        return new NextResponse(response.data as any, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${resource.title || 'secure-document'}"`,
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
          }
        });
      } catch (e: any) {
        console.error("Firebase Storage secure stream proxy issue:", e);
        return NextResponse.json({ error: 'Failed to securely stream Firebase Storage file.' }, { status: 500 });
      }
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

    // Fetch stream from Google Drive secure direct download with confirmation bypass
    let driveResponse;
    const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    try {
      // 1. Fetch headers and cookies first using a stream
      const firstResponse = await axios({
        method: 'get',
        url: initialUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      const contentType = String(firstResponse.headers['content-type'] || '');
      
      // 2. If it's HTML, it means Google Drive presented a virus warning/confirmation page (or login redirect)
      if (contentType.includes('text/html')) {
        // Read stream to string
        const htmlContent = await new Promise<string>((resolve, reject) => {
          let data = '';
          firstResponse.data.on('data', (chunk: any) => data += chunk.toString('utf8'));
          firstResponse.data.on('end', () => resolve(data));
          firstResponse.data.on('error', (err: any) => reject(err));
        });

        // 2a. Detect Google Login Redirect (meaning file sharing settings are private/restricted)
        if (htmlContent.includes('accounts.google.com') || htmlContent.includes('ServiceLogin') || htmlContent.includes('google-signin')) {
          return NextResponse.json({ 
            error: 'Access Denied: This specific Google Drive file is private. Please ensure its sharing settings are set to "Anyone with the link can view" in Google Drive.' 
          }, { status: 403 });
        }

        // Extract confirm token
        const confirmMatch = htmlContent.match(/confirm=([a-zA-Z0-9_-]+)/);
        if (confirmMatch && confirmMatch[1]) {
          const confirmToken = confirmMatch[1];
          // Get cookies
          const setCookieHeader = firstResponse.headers['set-cookie'];
          const cookie = setCookieHeader ? setCookieHeader.map((c: string) => c.split(';')[0]).join('; ') : '';

          // Fetch second response with confirmation token and cookie
          driveResponse = await axios({
            method: 'get',
            url: `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`,
            responseType: 'stream',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cookie': cookie
            }
          });
        } else {
          // If confirm token is not found, throw error to trigger catch block
          throw new Error('Google Drive warning page found but confirm token could not be extracted.');
        }
      } else {
        // It's the direct file stream
        driveResponse = firstResponse;
      }

      let streamContentType = String(driveResponse.headers['content-type'] || 'application/pdf');
      if (streamContentType === 'application/octet-stream') {
        streamContentType = 'application/pdf';
      }

      let fileName = resource.title || 'secure-document';
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }

      return new NextResponse(driveResponse.data as any, {
        headers: {
          'Content-Type': streamContentType,
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        }
      });

    } catch (e: any) {
      console.error("Direct Google Drive stream proxy failed, trying backup docs method...", e);
      
      // Fallback: If direct stream fails, construct docs export url
      const backupUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
      const backupResponse = await axios({
        method: 'get',
        url: backupUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      let backupContentType = String(backupResponse.headers['content-type'] || 'application/pdf');
      if (backupContentType === 'application/octet-stream') {
        backupContentType = 'application/pdf';
      }

      let backupFileName = resource.title || 'secure-document';
      if (!backupFileName.toLowerCase().endsWith('.pdf')) {
        backupFileName += '.pdf';
      }

      return new NextResponse(backupResponse.data as any, {
        headers: {
          'Content-Type': backupContentType,
          'Content-Disposition': `inline; filename="${backupFileName}"`,
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        }
      });
    }

  } catch (err: any) {
    console.error("Resource Streaming Proxy Error:", err);
    return NextResponse.json({ 
      error: 'Streaming failure. Verify your Google Drive sharing settings (Anyone with the link can view).',
      details: err.message || err.toString()
    }, { status: 500 });
  }
}
