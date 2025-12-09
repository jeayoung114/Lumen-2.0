import React, { useEffect, useRef, useState } from 'react';

interface GuardianOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  active: boolean;
}

export const GuardianOverlay: React.FC<GuardianOverlayProps> = ({ videoRef, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hazardLevel, setHazardLevel] = useState(0);
  const lastImageData = useRef<ImageData | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!active) {
      // If manually disabled, ensure we clean up if not already handled
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      setHazardLevel(0);
      return;
    }

    // Initialize Audio for Feedback
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    
    audioContextRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;

    const interval = setInterval(() => {
      detectMotion();
    }, 200); // 5fps check

    return () => {
      clearInterval(interval);
      try {
          if (oscRef.current) oscRef.current.stop();
      } catch (e) {
          // Ignore if already stopped
      }
      
      if (ctx.state !== 'closed') {
          ctx.close();
      }
      
      // Nullify ref if it matches current context
      if (audioContextRef.current === ctx) {
          audioContextRef.current = null;
      }
    };
  }, [active]);

  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || video.videoWidth === 0) return;

    canvas.width = 100; // Low res for speed
    canvas.height = 100;
    
    ctx.drawImage(video, 0, 0, 100, 100);
    const currentImageData = ctx.getImageData(0, 0, 100, 100);
    
    if (lastImageData.current) {
      let diff = 0;
      const data = currentImageData.data;
      const prev = lastImageData.current.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Pixel Diff Calculation
        const rDiff = Math.abs(data[i] - prev[i]);
        const gDiff = Math.abs(data[i + 1] - prev[i + 1]);
        const bDiff = Math.abs(data[i + 2] - prev[i + 2]);
        
        // Increased threshold to 180 (was 100) to ignore minor noise/lighting
        if (rDiff + gDiff + bDiff > 180) {
            diff++;
        }
      }
      
      const sensitivity = diff / (100 * 100); // % of pixels changed
      setHazardLevel(sensitivity);
      updateAudioFeedback(sensitivity);
    }
    
    lastImageData.current = currentImageData;
  };

  const updateAudioFeedback = (level: number) => {
    if (!audioContextRef.current || !oscRef.current || !gainRef.current) return;
    
    // Check if context is valid before using
    if (audioContextRef.current.state === 'closed') return;

    const now = audioContextRef.current.currentTime;
    
    // Increased threshold to 0.12 (was 0.05) - requires 12% of screen to move
    if (level > 0.12) { 
        const freq = 400 + (level * 2000); // Pitch rises with motion
        const vol = Math.min(level * 2, 0.5); // Volume rises
        
        oscRef.current.frequency.setTargetAtTime(freq, now, 0.1);
        gainRef.current.gain.setTargetAtTime(vol, now, 0.1);
    } else {
        gainRef.current.gain.setTargetAtTime(0, now, 0.2);
    }
  };

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      <canvas ref={canvasRef} className="hidden" />
      {/* Visual Hazard Indicator */}
      <div 
        className={`w-full h-full border-[12px] transition-colors duration-200 ${
            hazardLevel > 0.2 ? 'border-red-500 animate-pulse' : 
            hazardLevel > 0.12 ? 'border-yellow-500' : 'border-transparent'
        }`}
      />
      {hazardLevel > 0.2 && (
        <div className="absolute top-1/3 bg-red-600/90 text-white px-8 py-3 rounded-2xl font-bold text-2xl animate-bounce backdrop-blur-sm shadow-xl border border-white/20">
            HAZARD DETECTED
        </div>
      )}
    </div>
  );
};