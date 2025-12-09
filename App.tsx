

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from './components/Camera';
import { GuardianOverlay } from './components/GuardianOverlay';
import { NavigationMap } from './components/NavigationMap';
import { GeminiService } from './services/geminiService';
import { AudioService } from './services/audioService';
import { AppMode, SpeechRecognition } from './types';
import { MODE_COLORS, MODE_TEXT_COLORS } from './constants';
import { Shield, Eye, BookOpen, Navigation, Mic, StopCircle, Camera as CameraIcon, Power, Info, X } from 'lucide-react';

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

// --- Intro Overlay Component ---
const IntroOverlay = ({ onDismiss }: { onDismiss: () => void }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
    <div className="max-w-md w-full bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl my-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome to Lumen</h1>
        <p className="text-gray-400 text-sm uppercase tracking-widest">V2.3 Digital Visual Cortex</p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="bg-green-500/20 p-3 rounded-lg text-green-500"><Shield size={24} /></div>
          <div>
            <h3 className="font-bold text-green-400 text-lg">Guardian</h3>
            <p className="text-xs text-gray-400 leading-tight">Safety & hazard detection. Runs in background.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="bg-blue-500/20 p-3 rounded-lg text-blue-500"><Eye size={24} /></div>
            <div>
            <h3 className="font-bold text-blue-400 text-lg">Describe</h3>
            <p className="text-xs text-gray-400 leading-tight">General vision. Ask "What do you see?"</p>
            </div>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="bg-purple-500/20 p-3 rounded-lg text-purple-500"><BookOpen size={24} /></div>
            <div>
            <h3 className="font-bold text-purple-400 text-lg">Read</h3>
            <p className="text-xs text-gray-400 leading-tight">High-fidelity document reading & OCR.</p>
            </div>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="bg-orange-500/20 p-3 rounded-lg text-orange-500"><Navigation size={24} /></div>
            <div>
            <h3 className="font-bold text-orange-400 text-lg">Navigate</h3>
            <p className="text-xs text-gray-400 leading-tight">Maps & AI visual wayfinding.</p>
            </div>
        </div>
      </div>

      {/* Voice Wake Words Table */}
      <div className="mb-6 bg-white/5 rounded-xl border border-white/5 p-4">
        <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-wider text-center opacity-70">Voice Wake Words</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
            <div className="text-center">
                <p className="text-white font-bold bg-white/10 rounded px-2 py-1 inline-block mb-1">"Lumen Start"</p>
                <p className="text-gray-500">Activate Session</p>
            </div>
            <div className="text-center">
                <p className="text-red-400 font-bold bg-red-900/20 rounded px-2 py-1 inline-block mb-1">"Stop"</p>
                <p className="text-gray-500">Interrupt / Silence</p>
            </div>
            <div className="text-center">
                <p className="text-purple-400 font-bold bg-purple-900/20 rounded px-2 py-1 inline-block mb-1">"Read This"</p>
                <p className="text-gray-500">Read Mode</p>
            </div>
            <div className="text-center">
                <p className="text-purple-300 font-bold bg-purple-800/20 rounded px-2 py-1 inline-block mb-1">"Capture"</p>
                <p className="text-gray-500">Scan Text (Read Mode)</p>
            </div>
            <div className="text-center">
                <p className="text-green-400 font-bold bg-green-900/20 rounded px-2 py-1 inline-block mb-1">"Start Guardian"</p>
                <p className="text-gray-500">Safety Mode</p>
            </div>
             <div className="text-center">
                <p className="text-orange-400 font-bold bg-orange-900/20 rounded px-2 py-1 inline-block mb-1">"Navigate"</p>
                <p className="text-gray-500">Navigation Mode</p>
            </div>
        </div>
      </div>

      <button 
        onClick={onDismiss}
        className="w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-gray-200 transition-colors shadow-lg active:scale-95 transform duration-150"
      >
        GET STARTED
      </button>
    </div>
  </div>
);

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DESCRIBE);
  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [readResult, setReadResult] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessingRead, setIsProcessingRead] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  
  // Ref to track if speech was interrupted during async operations
  const isSpeechInterrupted = useRef(false);
  
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
  
  const switchMode = useCallback((newMode: AppMode, suppressFeedback = false) => {
    setShowIntro(false);
    setMode(newMode);
    modeRef.current = newMode; // Update ref immediately for any sync logic
    
    // Auto-enable Guardian system if switching to Guardian View via manual interaction
    // (Voice logic handles this explicitly separately)
    if (newMode === AppMode.GUARDIAN) {
        // We don't force enable here to allow viewing the tab without the overlay if desired,
        // but typically users want it on. Let's keep it manual or voice controlled for specific state.
    }

    // Provide Audio Feedback
    if (!suppressFeedback) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(`${newMode.toLowerCase()} mode`);
        window.speechSynthesis.speak(msg);
    }
  }, []);

  const toggleGuardian = useCallback(() => {
    const newState = !isGuardianActive;
    setIsGuardianActive(newState);
    
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(`Guardian system ${newState ? 'on' : 'off'}`);
    window.speechSynthesis.speak(msg);
  }, [isGuardianActive]);

  const handleCloseCapture = useCallback(() => {
    setCapturedImage(null);
    setReadResult(null);
    window.speechSynthesis.cancel();
  }, []);

  // --- Handlers ---

  const startSession = async () => {
    setShowIntro(false);
    
    // Ensure API Key is selected if running in AI Studio environment
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
    }

    try {
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
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
            throw new Error("Microphone not found");
        }
        throw err;
      }

      setIsSessionActive(true);

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

      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance("Lumen Online.");
      window.speechSynthesis.speak(msg);

    } catch (e: any) {
      console.error("Failed to start session:", e);
      setIsSessionActive(false);
      
      const errorMessage = e.message || e.toString();
      
      if (errorMessage.includes("Microphone not found")) {
         window.speechSynthesis.cancel();
         const msg = new SpeechSynthesisUtterance("Microphone not found. Please check your system settings.");
         window.speechSynthesis.speak(msg);
      } else if (errorMessage.includes("Requested entity was not found")) {
         window.speechSynthesis.cancel();
         const msg = new SpeechSynthesisUtterance("Model not available. Please check your key.");
         window.speechSynthesis.speak(msg);
         
         if (window.aistudio) {
             console.log("Opening API Key Selection Dialog...");
             await window.aistudio.openSelectKey();
         }
      } else {
         window.speechSynthesis.cancel();
         const msg = new SpeechSynthesisUtterance("Connection failed. Please try again.");
         window.speechSynthesis.speak(msg);
      }
    }
  };

  const stopSession = async () => {
    setIsSessionActive(false);
    await geminiService.disconnect();
    await audioService.close();
    
    window.speechSynthesis.cancel();
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
      const rawMode = args.targetMode || '';
      // Ensure we match the Enum regardless of case (e.g., 'navigate' -> 'NAVIGATE')
      const target = rawMode.toUpperCase() as AppMode;
      
      if (Object.values(AppMode).includes(target)) {
        switchMode(target, true); // Suppress TTS because AI will speak
        
        // If switching to READ mode, we stop the live session so "Capture" can take over
        if (target === AppMode.READ) {
            stopSession();
            return "Read mode active. Say capture to scan.";
        }
        
        return `Switched to ${target} mode.`;
      }
    }
    
    if (name === 'set_guardian_state') {
        // Robust boolean conversion to handle strings or booleans
        const isActive = String(args.active).toLowerCase() === 'true';
        setIsGuardianActive(isActive);
        return `Guardian system ${isActive ? 'activated' : 'deactivated'}.`;
    }

    return null;
  };

  const handleReadCapture = async () => {
    if (!videoRef.current || isProcessingRead) return;
    
    // Reset interrupt flag
    isSpeechInterrupted.current = false;

    // Immediate Feedback
    window.speechSynthesis.cancel();
    const feedback = new SpeechSynthesisUtterance("Capturing. Scanning text.");
    window.speechSynthesis.speak(feedback);

    setIsProcessingRead(true);
    setReadResult(null);
    setCapturedImage(null);

    // Capture Frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // Show the captured image immediately
    setCapturedImage(base64);

    try {
        // Send to Gemini Static (OCR)
        const text = await geminiService.readImage(base64);

        // Check for interruption during OCR wait
        if (isSpeechInterrupted.current) {
            console.log("Read interrupted by user command.");
            setIsProcessingRead(false);
            handleCloseCapture();
            return;
        }

        setReadResult(text);
        
        // Speak Result immediately
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Auto-close when done reading (or when cancelled by Stop command)
        utterance.onend = () => {
            handleCloseCapture();
        };

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("OCR Error", e);
        const errUtterance = new SpeechSynthesisUtterance("Sorry, I could not read that.");
        window.speechSynthesis.speak(errUtterance);
    } finally {
        setIsProcessingRead(false);
    }
  };

  // --- Effects ---

  // Ref for accessing capture function in useEffect without stale closure
  const handleReadCaptureRef = useRef(handleReadCapture);
  const setShowIntroRef = useRef(setShowIntro);
  useEffect(() => {
    handleReadCaptureRef.current = handleReadCapture;
    setShowIntroRef.current = setShowIntro;
  }, [handleReadCapture, setShowIntro]);

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

        // IMMEDIATE INTERRUPT for any command-like utterance
        // This ensures TTS stops if the user is giving a command while it's reading.
        const allCommands = ["stop", "capture", "navigate", "read", "guardian", "lumen", "activate", "start", "describe", "insight", "deactivate", "disable", "off"];
        if (allCommands.some(cmd => transcript.includes(cmd))) {
             window.speechSynthesis.cancel();
             isSpeechInterrupted.current = true; // Mark interruption for async processes
        }

        // 0. STOP Command (Stand-alone interrupt)
        if (transcript.includes("stop") || transcript.includes("stop reading") || transcript.includes("shut up")) {
            // Already cancelled above.
            // Explicitly return to ensure no other mode logic runs (unless it's "Stop Guardian")
            if (!transcript.includes("guardian")) {
                return;
            }
        }

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

        // 1. Check for "Capture" specifically in Read Mode
        // This triggers OCR *instead* of starting the Live Voice Session
        if (transcript.includes("capture")) {
            if (modeRef.current === AppMode.READ) {
                console.log("Wake word: Executing Read Capture (No Session)");
                recognition.stop(); 
                setShowIntroRef.current(false); 
                handleReadCaptureRef.current();
                return; // Exit early
            }
        }

        // 2. Generic Start
        if (wakeWords.some(w => transcript.includes(w))) {
            shouldStart = true;
        }

        // 3. Mode Specific Commands (Combined with Start)
        
        // GUARDIAN CHECK
        if (transcript.includes("guardian")) {
            // Priority: DEACTIVATION
            // If the user wants to turn OFF guardian, we do NOT want to start a session or switch modes.
            if (transcript.includes("off") || transcript.includes("stop") || transcript.includes("disable") || transcript.includes("deactivate")) {
                 console.log("Wake word: Guardian Deactivation");
                 recognition.stop();
                 setIsGuardianActive(false);
                 
                 // Feedback
                 window.speechSynthesis.cancel();
                 const msg = new SpeechSynthesisUtterance("Guardian system deactivated");
                 window.speechSynthesis.speak(msg);
                 
                 return; // EXIT EARLY: Do NOT start session or switch mode
            }

            // Otherwise, it's Activation or Navigation
            shouldStart = true;
            newMode = AppMode.GUARDIAN;
            
            if (transcript.includes("on") || transcript.includes("start") || transcript.includes("enable") || transcript.includes("activate")) {
                guardianStateAction = true;
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
            
            // If switching to Read Mode, play normal feedback since we won't start session
            if (newMode === AppMode.READ) {
                switchMode(newMode, false);
            } else if (newMode) {
                // If switching to other modes, suppress feedback (let Lumen Online speak)
                switchMode(newMode, true);
            }
            
            if (guardianStateAction !== null) {
                setIsGuardianActive(guardianStateAction);
            }

            // Small delay to allow state updates to settle before starting session
            // ONLY start session if NOT in Read Mode
            if (newMode !== AppMode.READ) {
                setTimeout(() => {
                    startSession();
                }, 100);
            }
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
      
      {/* Intro Overlay */}
      {showIntro && <IntroOverlay onDismiss={() => setShowIntro(false)} />}

      {/* 1. Camera View Layer (Visible in Describe, Navigate, and Guardian) */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${mode === AppMode.READ ? 'opacity-50' : 'opacity-100'}`}>
        <Camera 
            videoRef={videoRef} 
            isActive={!showIntro} 
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

            {/* Captured Image Popup with Result */}
            {capturedImage && (
                 <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-200 pointer-events-auto">
                     <button 
                        onClick={handleCloseCapture}
                        className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/40 text-white z-50"
                     >
                         <X size={24} />
                     </button>
                     
                     <img 
                        src={capturedImage} 
                        alt="Captured" 
                        className="max-w-full max-h-[50vh] object-contain rounded-lg border border-purple-500/50 mb-4 shadow-2xl" 
                     />
                     
                     <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[30vh]">
                         {isProcessingRead ? (
                             <div className="flex items-center gap-3 text-purple-400 animate-pulse">
                                 <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                                 <span className="font-mono">Processing OCR...</span>
                             </div>
                         ) : (
                             <p className="text-white text-lg leading-relaxed">{readResult || "No text detected."}</p>
                         )}
                     </div>
                 </div>
            )}
            
            {!capturedImage && (
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
            )}
        </div>
      )}

      {/* 5. Main UI Header */}
      <header className="absolute top-0 left-0 right-0 p-4 z-30 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight text-white/90">LUMEN <span className="text-xs font-normal opacity-50">v2.3</span></h1>
            
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowIntro(true)}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Show Instructions"
                >
                    <Info size={20} className="text-white" />
                </button>
                {/* Session Toggle */}
                <button 
                    onClick={isSessionActive ? stopSession : startSession}
                    disabled={mode === AppMode.READ}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
                        mode === AppMode.READ 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50' 
                            : isSessionActive 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-white text-black hover:bg-gray-200'
                    }`}
                >
                    {isSessionActive ? <StopCircle size={20} /> : <Mic size={20} />}
                    {mode === AppMode.READ ? "OFFLINE" : (isSessionActive ? "END SESSION" : "START")}
                </button>
            </div>
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
                onClick={() => { switchMode(AppMode.GUARDIAN); if(!isSessionActive) startSession(); }}
                icon={<Shield size={24} />}
                label="Guardian"
                color="text-green-500"
            />
            <ModeButton 
                active={mode === AppMode.DESCRIBE} 
                onClick={() => { switchMode(AppMode.DESCRIBE); if(!isSessionActive) startSession(); }}
                icon={<Eye size={24} />}
                label="Describe"
                color="text-blue-500"
            />
            <ModeButton 
                active={mode === AppMode.READ} 
                onClick={() => { switchMode(AppMode.READ); stopSession(); }}
                icon={<BookOpen size={24} />}
                label="Read"
                color="text-purple-500"
            />
             <ModeButton 
                active={mode === AppMode.NAVIGATE} 
                onClick={() => { switchMode(AppMode.NAVIGATE); if(!isSessionActive) startSession(); }}
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
