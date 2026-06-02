import type { Metadata } from 'next';
import { AuthProvider } from './lib/AuthContext';
import './globals.css';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'The Digital Library - MMMUT Academic Archive',
  description: 'Access secure, uncompromisable academic study resources, PYQs, and dynamic placement updates restricted to college students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#05060B] text-slate-200 antialiased font-sans flex flex-col selection:bg-cyan-500/30">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}
