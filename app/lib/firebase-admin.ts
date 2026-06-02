import * as admin from 'firebase-admin';
import firebaseConfig from '../../firebase-applet-config.json';

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '') 
    : undefined;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  const isPlaceholder = !privateKey || 
                        privateKey.includes('...') || 
                        privateKey.includes('your-service-account') ||
                        !clientEmail || 
                        clientEmail.includes('your-service-account');

  if (privateKey && clientEmail && !isPlaceholder) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        privateKey,
        clientEmail,
      }),
      databaseURL: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`
    });
  } else {
    // Falls back to standard token verification (only requires Project ID)
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

export const adminAuth = admin.auth();
// If we initialized without cert, standard admin.firestore() will look at local credentials
export const adminDb = admin.firestore();
