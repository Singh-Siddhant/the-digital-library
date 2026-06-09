'use client';

import React from 'react';
import { ExternalLink, X } from 'lucide-react';

interface YoutubeSecurePlayerProps {
  url: string;
  title: string;
  isPip?: boolean;
  onPipToggle?: () => void;
  onClose?: () => void;
}

export default function YoutubeSecurePlayer({ 
  url, 
  title, 
  isPip = false, 
  onPipToggle,
  onClose 
}: YoutubeSecurePlayerProps) {
  // Extract YouTube ID
  const getYoutubeId = (urlStr: string) => {
    if (!urlStr) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = urlStr.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeId(url);

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-red-500 font-bold text-xs uppercase font-mono">
        Invalid YouTube Stream URL
      </div>
    );
  }

  // Construct YouTube Embed URL with nocookie domain and parameters
  // autoplay=1 to auto play
  // controls=1 to keep original controls
  // rel=0 to disable related videos
  // modestbranding=1 to hide YouTube logo in the control bar
  // iv_load_policy=3 to hide video annotations
  // playsinline=1 for mobile browsers
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&fs=1&playsinline=1`;

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none">
      <div className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center">
        {/* Iframe with direct mouse pointer events and native YouTube controls */}
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />

        {/* PiP Mode Float Header Overlays */}
        {isPip && (
          <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
            {onPipToggle && (
              <button 
                type="button" 
                onClick={onPipToggle}
                title="Restore to Center"
                className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-all"
              >
                <ExternalLink size={12} />
              </button>
            )}
            {onClose && (
              <button 
                type="button" 
                onClick={onClose}
                title="Close Player"
                className="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-600 border border-red-500/20 flex items-center justify-center text-white cursor-pointer transition-all"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
