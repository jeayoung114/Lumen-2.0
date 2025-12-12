# LUMEN V2.3: The Digital Visual Cortex

Lumen is a mobile neural prosthetic designed to act as a digital visual cortex for the visually impaired. It leverages Google's Gemini Multimodal Live API to provide real-time environmental understanding, safety alerts, document reading, and navigation assistance through a seamless voice-controlled interface.

## 🧠 Quad-System Architecture

The application is organized into four intuitive modes, each serving a specific cognitive or physical function:

### 🔵 System 1: Describe (Cognition)
*   **Role:** General awareness and conversation.
*   **Tech:** `gemini-2.5-flash-native-audio-preview` (Streaming).
*   **Behavior:** Default mode. Streams real-time video and audio to the AI, allowing the user to ask questions like "What is in front of me?" or "Is this fruit fresh?".

### 🟢 System 2: Guardian (Safety)
*   **Role:** Immediate physical safety and reflex.
*   **Tech:** Client-side Canvas Heuristic Motion Detection (RGB Pixel Difference).
*   **Behavior:** Runs locally for zero latency. Detects approaching obstacles or sudden movements in the camera feed. Provides dynamic audio feedback (pitch/volume rises with proximity).
*   **Note:** Can run in the background while other modes are active.

### 🟣 System 3: Read (Analysis)
*   **Role:** High-fidelity document interpretation.
*   **Tech:** `gemini-2.5-flash` (Static Request).
*   **Behavior:** Uses a dedicated viewfinder to capture high-resolution images. Strictly performs OCR (Optical Character Recognition) to read menus, signs, or books without hallucinating scene descriptions.

### 🟠 System 4: Navigate (Wayfinding)
*   **Role:** Point A to Point B guidance.
*   **Tech:** Google Maps JavaScript API + Live Vision Analysis.
*   **Behavior:** Hybrid interface.
    *   **Macro:** Google Maps visual overlay for GPS positioning.
    *   **Micro:** AI Vision analysis to identify immediate path hazards (e.g., "Turn left at the white post").

---

## 🛠️ Technical Stack

*   **Frontend:** React 19, TypeScript, Vite.
*   **Styling:** Tailwind CSS.
*   **AI Model:** Google Gemini 2.5 Flash (Native Audio Preview).
*   **Audio Pipeline:**
    *   Input: `AudioWorkletProcessor` (16kHz PCM encoding).
    *   Output: PCM Stream Decoding (24kHz).
    *   Turn Detection: Server-side interruption handling.
*   **Mapping:** Google Maps JavaScript API (Geometry & Places libraries).
*   **Voice:** Web Speech API (Offline Wake Word) + Gemini Live Tools (Intent classification).

---

## 🎤 Voice Interaction & Commands

Lumen is designed for hands-free operation. It uses a dual-layer voice system: **Offline Wake Words** (browser-based) for activation, and **Online Intent Understanding** (Gemini) for complex actions.

### Wake Words (Offline)
Say these to start the session or switch modes immediately:
*   "Lumen start" / "Start session"
*   "Navigate" / "Take me to..."
*   "Read this" / "Read mode"
*   "Guardian on" / "Start Guardian"

### In-Session Commands (Online)
Once connected, you can speak naturally:

| Intent | Voice Command Examples | Action |
| :--- | :--- | :--- |
| **Safety** | "Start Guardian", "Enable Guardian" | Activates Motion Overlay & Audio cues. |
| **Cognition** | "Switch to Describe", "What do you see?" | Switches to Live Video Stream. |
| **Reading** | "Read this", "Scan document" | Switches to OCR mode. |
| **Travel** | "Navigate to...", "Where am I?" | Switches to Map/GPS mode. |
| **Termination** | "End session", "Stop listening" | Closes connection & microphone. |

---

## 🚀 Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   Google Cloud Project with **Gemini API** enabled.
*   Google Cloud Project with **Maps JavaScript API** enabled.

### Environment Variables
Create a `.env` file in the root directory. You generally need one API Key that has access to both Gemini and Google Maps (or ensure the key used has both permissions).

```env
API_KEY=your_google_api_key_here
```

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

---

## ⚠️ Troubleshooting

### "Requested entity was not found"
*   **Cause:** Your API Key does not have access to the specific model (`gemini-2.5-flash-native-audio-preview-09-2025`).
*   **Fix:** Ensure you are using a paid tier project or a valid AI Studio key. The app will prompt you to select a key via the AI Studio UI if the env var fails.

### "Google Maps Authentication Failed"
*   **Cause:** The `API_KEY` provided does not have the "Maps JavaScript API" enabled in the Google Cloud Console.
*   **Fallback:** Lumen will automatically switch to "Visual Navigation Only" mode, using GPS coordinates and Camera vision without the map tiles.

### "Microphone not found"
*   **Cause:** Browser permission denied or no input device detected.
*   **Fix:** Check browser permission settings (lock icon in URL bar) and ensure a microphone is connected.

### "Permission Denied" (Gemini Live)
*   **Cause:** Your key may not have access to Grounding (Google Search/Maps tools) within the Live API.
*   **Fix:** The app includes a fallback strategy. It will automatically retry the connection with "Basic Tools" (Vision only) if the advanced grounding connection fails.

---
