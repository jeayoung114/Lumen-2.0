import React, { useEffect, useRef } from 'react';

interface CameraProps {
  onFrame?: (dataUrl: string) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
}

export const Camera: React.FC<CameraProps> = ({ onFrame, videoRef, isActive }) => {
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera if available
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false // Audio is handled separately
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, videoRef]);

  // Frame capture loop
  useEffect(() => {
    let intervalId: number;
    
    if (isActive && onFrame) {
      const captureFrame = () => {
        if (!videoRef.current) return;
        
        // Ensure video is playing and has dimensions
        if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth / 2; // Scale down for performance
        canvas.height = videoRef.current.videoHeight / 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          onFrame(canvas.toDataURL('image/jpeg', 0.6));
        }
      };
      
      intervalId = window.setInterval(captureFrame, 1000); // 1 FPS for Gemini Live frames is usually sufficient for context
    }

    return () => clearInterval(intervalId);
  }, [isActive, onFrame, videoRef]);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover opacity-80"
      />
    </div>
  );
};