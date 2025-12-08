import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from './components/Camera';
import { GuardianOverlay } from './components/GuardianOverlay';
import { NavigationMap } from './components/NavigationMap';
import { GeminiService } from './services/geminiService';
import { AudioService } from './services/audioService';
import { AppMode, SpeechRecognition } from './types';
import { MODE_COLORS, MODE_TEXT_COLORS } from './constants';
import { Shield, Eye, BookOpen, Navigation, Mic, StopCircle, Camera as CameraIcon, Power } from 'lucide-react';

// Initialize services outside component to persist
const geminiService = new GeminiService();
const audioService = new AudioService();

declare global {
  interface Window {
    google: any;
    gm_authFailure: () => void;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DESCRIBE);
  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [readResult, setReadResult] = useState<string | null>(null);
  const [isProcessingRead, setIsProcessingRead] = useState(false);
  
  // Track Google Maps Status Globally
  const [googleMapsError, setGoogleMapsError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSessionActiveRef = useRef(isSessionActive); // Ref for callbacks
  const modeRef = useRef(mode); // Ref for accessing mode in async callbacks

  // Update refs when state changes
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // --- Initialization ---

  // Load Google Maps Script
  useEffect(() => {
    // 1. Define global auth failure handler immediately
    window.gm_authFailure = () => {
        console.error("Google Maps Authentication Failed (Global Handler)");
        setGoogleMapsError(true);
    };

    const loadGoogleMaps = () => {
      if (document.getElementById('google-maps-script')) return;
      
      const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : '';

      if (!apiKey) {
        setGoogleMapsError(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
          console.error("Failed to load Google Maps script (Network Error)");
          setGoogleMapsError(true);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // --- Helpers ---
  
  const switchMode = useCallback((newMode: AppMode) => {
    setMode(newMode);
    modeRef.current = newMode; // Update ref immediately for any sync logic
    
    // Auto-enable Guardian system if switching to Guardian View via manual interaction
    // (Voice logic handles this explicitly separately)
    if (newMode === AppMode.GUARDIAN) {
        // We don't force enable here to allow viewing the tab without the overlay if desired,
        // but typically users want it on. Let's keep it manual or voice controlled for specific state.
    }

    // Provide Audio Feedback
    const msg = new SpeechSynthesisUtterance(`${newMode.toLowerCase()} mode`);
    window.speechSynthesis.speak(msg);
  }, []);

  const toggleGuardian = useCallback(() => {
    const newState = !isGuardianActive;
    setIsGuardianActive(newState);
    const msg = new SpeechSynthesisUtterance(`Guardian system ${newState ? 'on' : 'off'}`);
    window.speechSynthesis.speak(msg);
  }, [isGuardianActive]);

  // --- Handlers ---

  const startSession = async () => {
    try {
      setIsSessionActive(true);
      
      // 0. Get Location (Best effort) for Maps Grounding
      let location: {lat: number, lng: number} | undefined;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        console.log("Location obtained:", location);
      } catch (e) {
        console.warn("Could not get location for session:", e);
      }
      
      // 1. Audio Input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await audioService.initializeInput(stream, (pcmData) => {
        // Always stream audio regardless of mode to ensure voice commands (like "Switch mode") works
        geminiService.sendRealtimeAudio(pcmData);
      });

      // 2. Audio Output
      audioService.initializeOutput();

      // 3. Connect Live API
      await geminiService.connectLive(
        (base64Audio) => audioService.playAudioData(base64Audio),
        handleToolCall,
        () => audioService.stopAll(), // Handle interruption
        location
      );

      const msg = new SpeechSynthesisUtterance("Lumen Online.");
      window.speechSynthesis.speak(msg);

    } catch (e) {
      console.error("Failed to start session:", e);
      setIsSessionActive(false);
      const msg = new SpeechSynthesisUtterance("Connection failed.");
      window.speechSynthesis.speak(msg);
    }
  };

  const stopSession = async () => {
    setIsSessionActive(false);
    await geminiService.disconnect();
    await audioService.close();
    const msg = new SpeechSynthesisUtterance("Session Ended.");
    window.speechSynthesis.speak(msg);
  };

  const handleToolCall = async (name: string, args: any) => {
    console.log("Tool Called:", name, args);
    
    if (name === 'end_session') {
        stopSession();
        return "Session ending.";
    }

    if (name === 'change_mode') {
      const target = args.targetMode as AppMode;
      if (Object.values(AppMode).includes(target)) {
        switchMode(target);
        return `Switched to ${target} mode.`;
      }
    }
    
    if (name === 'set_guardian_state') {
        const active = args.active;
        setIsGuardianActive(active);
        return `Guardian system ${active ? 'activated' : 'deactivated'}.`;
    }

    return null;
  };

  const handleReadCapture = async () => {
    if (!videoRef.current || isProcessingRead) return;
    
    setIsProcessingRead(true);
    setReadResult(null);

    // Capture Frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);

    // Send to Gemini Static
    const text = await geminiService.readImage(base64);
    
    setReadResult(text);
    setIsProcessingRead(false);

    // Speak Result
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // --- Effects ---

  // Wake Word Listener (Offline Speech Recognition)
  useEffect(() => {
    if (isSessionActive) return; // Don't run wake word if session is active

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        console.log("Wake word detected:", transcript);

        const wakeWords = [
            "activate session", 
            "start session", 
            "open session", 
            "lumen start",
            "lumen wake up"
        ];

        let shouldStart = false;
        let newMode: AppMode | null = null;
        let guardianStateAction: boolean | null = null;

        // 1. Generic Start
        if (wakeWords.some(w => transcript.includes(w))) {
            shouldStart = true;
        }

        // 2. Mode Specific Commands
        
        // GUARDIAN
        if (transcript.includes("guardian")) {
            shouldStart = true;
            newMode = AppMode.GUARDIAN;
            
            // Check for explicit On/Off commands
            if (transcript.includes("on") || transcript.includes("start") || transcript.includes("enable") || transcript.includes("activate")) {
                guardianStateAction = true;
            } else if (transcript.includes("off") || transcript.includes("stop") || transcript.includes("disable") || transcript.includes("deactivate")) {
                guardianStateAction = false;
            } else {
                // Default to turning it on if just "Guardian Mode" is said, 
                // but let's just switch tab if vague.
                // However, user usually expects activation.
                // We'll leave it null unless explicit.
            }
        } 
        // READ
        else if (transcript.includes("read mode") || transcript.includes("read this")) {
            newMode = AppMode.READ;
            shouldStart = true;
        }
        // NAVIGATE
        else if (transcript.includes("navigate") || transcript.includes("navigation") || transcript.includes("take me to")) {
            newMode = AppMode.NAVIGATE;
            shouldStart = true;
        }
        // DESCRIBE / INSIGHT
        else if (transcript.includes("describe") || transcript.includes("insight") || transcript.includes("standard mode")) {
            newMode = AppMode.DESCRIBE;
            shouldStart = true;
        }

        if (shouldStart) {
            recognition.stop();
            
            if (guardianStateAction !== null) {
                setIsGuardianActive(guardianStateAction);
            }

            if (newMode) {
                switchMode(newMode);
            }
            startSession();
        }
    };

    recognition.onerror = (event: any) => {
        // console.log("Wake word error:", event.error);
    };

    recognition.onend = () => {
        // Auto-restart if we are still offline
        if (!isSessionActiveRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // Ignore start errors
            }
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error("Failed to start wake word listener:", e);
    }

    return () => {
        recognition.stop();
    };
  }, [isSessionActive, switchMode]); // Re-run when session state changes

  // Handle Video Frame Streaming
  const handleVideoFrame = useCallback((dataUrl: string) => {
    // Enable vision for Describe, Navigate AND Guardian modes (so user can ask questions while safe)
    if (isSessionActive && (mode === AppMode.DESCRIBE || mode === AppMode.NAVIGATE || mode === AppMode.GUARDIAN)) {
      geminiService.sendRealtimeVideo(dataUrl);
    }
  }, [isSessionActive, mode]);

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden relative">
      
      {/* 1. Camera View Layer (Visible in Describe, Navigate, and Guardian) */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${mode === AppMode.READ ? 'opacity-50' : 'opacity-100'}`}>
        <Camera 
            videoRef={videoRef} 
            isActive={true} 
            onFrame={handleVideoFrame}
        />
      </div>

      {/* 2. Guardian Overlay Layer (Persists based on isGuardianActive state) */}
      <GuardianOverlay 
        videoRef={videoRef} 
        active={isGuardianActive} 
      />

      {/* 3. Navigation Map Layer (Overlay) */}
      <NavigationMap 
        active={mode === AppMode.NAVIGATE} 
        mapError={googleMapsError} 
      />

      {/* 4. Mode Specific UI Overlays */}
      
      {/* GUARDIAN View specific controls */}
      {mode === AppMode.GUARDIAN && (
         <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            {/* Wrapper added to center content */}
             <div className="flex flex-col items-center pointer-events-auto">
                 <h2 className="text-green-500 font-bold text-2xl mb-4 animate-pulse">SYSTEM ACTIVE</h2>
                 {isGuardianActive ? (
                     <button 
                        onClick={toggleGuardian}
                        className="bg-red-600/90 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-red-500 transition-all flex items-center justify-center gap-2"
                     >
                         <Power size={24} />
                         DEACTIVATE
                     </button>
                 ) : (
                    <button 
                        onClick={toggleGuardian}
                        className="bg-green-600/90 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                     >
                         <Shield size={24} />
                         ACTIVATE
                     </button>
                 )}
                 <p className="mt-4 text-gray-400 max-w-xs mx-auto text-sm text-center">
                     Guardian runs in the background. Switch modes to multitask.
                 </p>
             </div>
         </div>
      )}

      {/* READ View specific controls */}
      {mode === AppMode.READ && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            {/* Viewfinder reticle */}
            <div className="w-64 h-80 border-2 border-white/50 rounded-lg mb-8 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-purple-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-purple-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-purple-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-purple-500 -mb-1 -mr-1"></div>
            </div>

            {readResult && (
                <div className="bg-black/80 p-6 rounded-xl max-w-sm mx-4 mb-4 pointer-events-auto overflow-y-auto max-h-60 border border-purple-500/30">
                    <p className="text-lg leading-relaxed">{readResult}</p>
                </div>
            )}
            
            <button 
                onClick={handleReadCapture}
                disabled={isProcessingRead}
                className="pointer-events-auto bg-purple-600 hover:bg-purple-500 text-white rounded-full p-6 shadow-lg transform active:scale-95 transition-all flex items-center gap-2"
            >
                {isProcessingRead ? (
                   <span className="animate-spin text-2xl">⏳</span>
                ) : (
                    <>
                    <CameraIcon size={32} />
                    <span className="font-bold text-lg">CAPTURE</span>
                    </>
                )}
            </button>
        </div>
      )}

      {/* 5. Main UI Header */}
      <header className="absolute top-0 left-0 right-0 p-4 z-30 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight text-white/90">LUMEN <span className="text-xs font-normal opacity-50">v2.3</span></h1>
            
            {/* Session Toggle */}
            <button 
                onClick={isSessionActive ? stopSession : startSession}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${isSessionActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
            >
                {isSessionActive ? <StopCircle size={20} /> : <Mic size={20} />}
                {isSessionActive ? "END SESSION" : "START"}
            </button>
        </div>
        
        {/* Active Mode Indicator */}
        <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${MODE_COLORS[mode] || 'bg-gray-500'} animate-pulse`} />
                <span className={`text-sm font-bold uppercase tracking-widest ${MODE_TEXT_COLORS[mode]}`}>
                    {mode} VIEW
                </span>
            </div>
            {isGuardianActive && (
                <div className="flex items-center gap-1.5 bg-green-900/50 px-3 py-1 rounded-full border border-green-500/30">
                    <Shield size={12} className="text-green-500 fill-green-500" />
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Guardian Active</span>
                </div>
            )}
        </div>
      </header>


      {/* 6. Mode Selector Footer */}
      <nav className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-2 pb-6 z-30">
        <div className="flex justify-around items-center max-w-md mx-auto">
            <ModeButton 
                active={mode === AppMode.GUARDIAN} 
                onClick={() => switchMode(AppMode.GUARDIAN)}
                icon={<Shield size={24} />}
                label="Guardian"
                color="text-green-500"
            />
            <ModeButton 
                active={mode === AppMode.DESCRIBE} 
                onClick={() => switchMode(AppMode.DESCRIBE)}
                icon={<Eye size={24} />}
                label="Describe"
                color="text-blue-500"
            />
            <ModeButton 
                active={mode === AppMode.READ} 
                onClick={() => switchMode(AppMode.READ)}
                icon={<BookOpen size={24} />}
                label="Read"
                color="text-purple-500"
            />
             <ModeButton 
                active={mode === AppMode.NAVIGATE} 
                onClick={() => switchMode(AppMode.NAVIGATE)}
                icon={<Navigation size={24} />}
                label="Navigate"
                color="text-orange-500"
            />
        </div>
      </nav>
    </div>
  );
}

const ModeButton = ({ active, onClick, icon, label, color }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${active ? 'bg-white/10' : 'opacity-50 hover:opacity-80'}`}
    >
        <div className={`${active ? color : 'text-white'}`}>
            {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase ${active ? color : 'text-gray-400'}`}>
            {label}
        </span>
    </button>
);