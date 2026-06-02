import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { BookOpen, Loader2 } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const initializeGSI = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: "81698641442-pcv9bppntupqj023geikkaoo1coveho9.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "filled_blue", size: "large", width: 340, shape: "pill" }
        );
      } else {
        setTimeout(initializeGSI, 200);
      }
    };
    initializeGSI();
  }, []);

  const handleCredentialResponse = async (response: any) => {
    setLoading(true);
    setError('');
    try {
      await login(response.credential);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="immersive-bg min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-10 text-center relative z-10"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl mx-auto flex items-center justify-center mb-8 neon-glow-cyan">
          <BookOpen className="text-white w-7 h-7" />
        </div>
        
        <h1 className="text-3xl font-display font-bold mb-3 text-white tracking-tight">Student Login</h1>
        <p className="text-slate-500 mb-10 text-sm">Sign in to access your saved resources and job updates.</p>
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg mb-8">
            {error}
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center min-h-[56px] w-full">
          {loading ? (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider py-4">
              <Loader2 className="animate-spin" size={18} />
              Authenticating Student...
            </div>
          ) : (
            <div id="googleBtn" />
          )}
        </div>
        
        <div className="mt-12 flex items-center gap-4 text-slate-700">
          <div className="flex-grow h-px bg-white/5" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Secure Node</span>
          <div className="flex-grow h-px bg-white/5" />
        </div>
      </motion.div>
    </div>
  );
}
