'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="immersive-bg min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
