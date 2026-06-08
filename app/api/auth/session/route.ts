import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';
import { adminAuth } from '../../../lib/firebase-admin';
import axios from 'axios';

const BOOTSTRAP_ADMINS = ['2024021271@mmmut.ac.in', '2023051154@mmmut.ac.in'];

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // 1. Verify the Google ID Token using Google's tokeninfo API
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const decodedToken = response.data;

    if (!decodedToken || decodedToken.aud !== "714314998273-55vo9d46u0n6alrfddfd2murgvcsjidg.apps.googleusercontent.com") {
      return NextResponse.json({ error: 'Unauthorized: Invalid token audience' }, { status: 401 });
    }

    const email = decodedToken.email || '';

    // 2. Validate email domain restriction (@mmmut.ac.in or bootstrap admin)
    const isCollegeDomain = email.endsWith('@mmmut.ac.in');
    const isBootstrapAdmin = BOOTSTRAP_ADMINS.includes(email.toLowerCase());

    if (!isCollegeDomain && !isBootstrapAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Access restricted strictly to @mmmut.ac.in emails.' 
      }, { status: 403 });
    }

    // 3. Create Session Cookie (expires in 5 days)
    const cookieStore = await cookies();
    cookieStore.set('lib_session', credential, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/'
    });

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error("Session API Error:", err);
    return NextResponse.json({ error: err.message || 'Authentication check failed.' }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('lib_session');
  return NextResponse.json({ status: 'success' });
}
