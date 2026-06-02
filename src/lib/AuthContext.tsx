import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  picture?: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: UserProfile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userProfile: null, 
  loading: true,
  login: async () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Security: Disable Right Click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Security: Disable F12 and DevTools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Load session from localStorage
    try {
      const stored = localStorage.getItem('user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setUserProfile(parsed);
      }
    } catch (err) {
      console.error("Error reading session:", err);
    } finally {
      setLoading(false);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const login = async (credential: string) => {
    try {
      // Decode JWT token directly in client (pure browser JavaScript, no server requirement)
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const adminEmails = ['majorguru09@gmail.com'];
      const userObj: UserProfile = {
        uid: payload.sub || Date.now().toString(),
        name: payload.name || 'Student',
        email: payload.email || '',
        picture: payload.picture || '',
        role: adminEmails.includes(payload.email || '') ? 'admin' : 'user'
      };

      setUser(userObj);
      setUserProfile(userObj);
      localStorage.setItem('user_session', JSON.stringify(userObj));
    } catch (err) {
      console.error("JWT Decode error:", err);
      throw new Error("Failed to authenticate Google credentials.");
    }
  };

  const logout = () => {
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem('user_session');
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
