'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithCredential, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import axios from 'axios';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  picture?: string;
  role: 'user' | 'admin' | 'cyber';
  batch: string;
  planStatus: 'Free' | 'Paid';
  expiryDate: string;
  branch?: string;
  targetedExam?: string;
  semester?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userProfile: null, 
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Content Protection Shortcuts (F12, right click, Ctrl+Shift+I, etc.)
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Listen to Firebase auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Real-time Firestore sync of user profile
          const userRef = doc(db, 'users', firebaseUser.uid);
          
          // Initial setup for new user if document doesn't exist or is missing role field
          const docSnap = await getDoc(userRef);
          const hasRole = docSnap.exists() && docSnap.data()?.role;
          if (!hasRole) {
            const bootstrapAdmins = ['majorguru09@gmail.com'];
            const isBootstrapAdmin = bootstrapAdmins.includes(firebaseUser.email || '');
            
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Student',
              email: firebaseUser.email || '',
              picture: firebaseUser.photoURL || '',
              role: isBootstrapAdmin ? 'admin' : 'user',
              batch: 'AI/Cyber Prep',
              planStatus: 'Free',
              expiryDate: 'N/A',
              createdAt: docSnap.exists() ? (docSnap.data()?.createdAt || new Date().toISOString()) : new Date().toISOString()
            }, { merge: true });
          }

          const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              setUserProfile(snapshot.data() as UserProfile);
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore Profile Sync Error:", err);
            setLoading(false);
          });

          return () => unsubscribeProfile();
        } catch (err) {
          console.error("Firebase Database Profile Initialization Error:", err);
          // Set standard fallback profile so that the client page still renders and does not freeze
          setUserProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || '',
            role: 'user',
            batch: 'AI/Cyber Prep',
            planStatus: 'Free',
            expiryDate: 'N/A'
          });
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      unsubscribeAuth();
    };
  }, []);

  const loginWithGoogle = async (credential: string) => {
    try {
      // 1. Authenticate with Next.js Backend Session API to verify @mmmut.ac.in
      const response = await axios.post('/api/auth/session', { credential });
      const { status } = response.data;
      
      if (status !== 'success') {
        throw new Error('Access denied by authentication server.');
      }

      // 2. Sign in locally on the Client SDK
      const authCredential = GoogleAuthProvider.credential(credential);
      await signInWithCredential(auth, authCredential);

    } catch (err: any) {
      console.error("Authentication Error:", err);
      // Pass the specific server error back to the UI
      throw new Error(err.response?.data?.error || err.message || "Failed to log in.");
    }
  };

  const logout = async () => {
    try {
      await axios.delete('/api/auth/session');
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
