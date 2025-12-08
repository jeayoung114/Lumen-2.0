
export enum AppMode {
  DESCRIBE = 'DESCRIBE', // Blue - Cognition (Default)
  GUARDIAN = 'GUARDIAN', // Green - Safety
  READ = 'READ',         // Purple - Analysis
  NAVIGATE = 'NAVIGATE'  // Orange - Wayfinding
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
}

export interface FunctionCallHandler {
  name: string;
  handler: (args: any) => Promise<any> | any;
}

// Web Speech API Types
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onstart: () => void;
}

// Map styles for Lumen
export const LUMEN_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  }
];
