import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { adminDb, adminAuth } from '../../lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & Admin Authorization check
    const sessionToken = req.cookies.get('lib_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(sessionToken);
    } catch (e) {
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
    const bootstrapAdmins = ['majorguru09@gmail.com', '2024021271@mmmut.ac.in', '2023051154@mmmut.ac.in'];
    let isAuthorized = bootstrapAdmins.includes(email);

    if (!isAuthorized) {
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

    // 2. Process request body
    const body = await req.json();
    const { requestId, approve } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    // 3. Fetch payment request
    const requestRef = adminDb.collection('paymentRequests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Payment request not found.' }, { status: 404 });
    }

    const paymentReq = requestDoc.data();

    if (approve) {
      // 1. Mark request as approved
      await requestRef.update({ status: 'approved' });

      if (paymentReq?.type === 'membership') {
        // Calculate expiry date
        const today = new Date();
        let daysToAdd = 30;
        if (paymentReq.planId === 'pro') daysToAdd = 90;
        if (paymentReq.planId === 'annual') daysToAdd = 365;

        today.setDate(today.getDate() + daysToAdd);
        const expiryString = today.toISOString().split('T')[0];

        // Upgrade user profile
        const userRef = adminDb.collection('users').doc(paymentReq.userId);
        await userRef.set({
          planStatus: 'Paid',
          expiryDate: expiryString
        }, { merge: true });

      } else if (paymentReq?.type === 'resource') {
        // Individual resource access purchase
        await adminDb.collection('purchases').add({
          userId: paymentReq?.userId,
          resourceId: paymentReq?.resourceId,
          resourceTitle: paymentReq?.resourceTitle,
          purchasedAt: new Date().toISOString()
        });
      }
    } else {
      // Mark request as rejected
      await requestRef.update({ status: 'rejected' });
    }

    return NextResponse.json({ status: 'success' });

  } catch (err: any) {
    console.error("Verify Payment API Error:", err);
    return NextResponse.json({ error: err.message || 'Operation failed.' }, { status: 500 });
  }
}
