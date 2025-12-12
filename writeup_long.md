# Lumen: The Digital Visual Cortex  
### Bridging the Gap Between Sight and Sound

---

## 1. Introduction: The Problem of Latency vs. Intelligence

For the **2.2 billion people with vision impairment globally**, navigating the physical world is a constant negotiation between speed and information. Traditional assistive tools force a binary choice:  
- the **white cane** provides immediate, low-fidelity tactile feedback (fast but *“dumb”*),  
- early **AI vision apps** offered high-fidelity descriptions but required users to stop, take a photo, and wait for processing (smart but *slow*).

We built **Lumen** to eliminate this trade-off.

Lumen is a mobile neural prosthetic designed to act as a complete **Digital Visual Cortex**. It is not merely a screen reader—it is a multimodal AI system that mirrors the human brain’s layered processing architecture. By combining the **Google Gemini Live API** with **on-device heuristic algorithms**, Lumen delivers both immediate safety reflexes and deep cognitive understanding.

At its core is a **Quad-System Architecture**—**Guardian, Describe, Read, and Navigate**—organized to ensure a near-zero learning curve.

---

## 2. Core Philosophy: A Quad-System Architecture

The human visual system does not process a speeding car and a book of poetry the same way. One triggers reflex; the other triggers contemplation. Lumen mirrors this biological reality.

---

### System 1: Guardian — *The Reflex Layer*  
**Goal:** Immediate Physical Safety  

Guardian is an always-on safety layer that operates independently of conversational AI.

- **Technology:** Fully on-device canvas-based motion detection using RGB pixel differencing and blob analysis—no cloud, zero latency.
- **Experience:** While walking, Guardian detects sudden motion such as cyclists, opening doors, or approaching vehicles.
- **Feedback Loop:** Instead of speech, Guardian uses **audio-haptic signals**. As danger approaches, pitch, volume, and vibration intensity increase—bypassing language and triggering instinctive reactions.
- **Integration:** Guardian runs *on top* of all other modes, overriding audio if danger is detected.

---

### System 2: Describe — *The Cognitive Layer*  
**Goal:** Environmental Awareness & Conversation  

Describe mode acts as the user’s **Digital Eyes**.

- **Technology:** Continuous real-time audio/video streaming powered by `gemini-2.5-flash-native-audio-preview`.
- **Experience:** Fully conversational. Users can ask open-ended questions like *“What’s the vibe here?”* or *“Is there a bench nearby?”* while walking.
- **Contextual Intelligence:** Goes beyond labeling. For example, assessing freshness of fruit using visual texture and color.
- **Tool Calling:** Acts as a dispatcher—can trigger external tools like `search_google` for pricing or availability when asked.

---

### System 3: Read — *The Analytical Layer*  
**Goal:** High-Fidelity Precision  

Reading demands absolute accuracy—especially for medicine labels or legal documents.

- **Technology:** Switches from live video to high-resolution static capture using `gemini-2.5-flash`.
- **Experience:** Activated with “Read this.” A dedicated viewfinder captures a clean frame for deep OCR and semantic parsing.
- **Output:** Extracted text is read aloud using high-quality system TTS.

---

### System 4: Navigate — *The Wayfinding Layer*  
**Goal:** Point-to-Point Mobility  

Navigate solves the **“last meter” problem** that traditional GPS cannot.

- **Technology:** Fuses **Google Maps JavaScript API** (macro-routing) with live vision analysis (micro-guidance).
- **Macro Guidance:** Standard GPS instructions like “Turn left in 50 meters.”
- **Micro Guidance:** Vision-based cues such as *“Turn left at the white post”* or *“The entrance has two steps.”*
- **Interaction:** Natural commands like *“Where am I?”* or *“Navigate to the clinic”* transition seamlessly into guidance mode.

---

## 3. Technical Implementation & Innovation

### The Stack
- **Frontend:** React 19 + TypeScript (Vite)
- **Styling:** Tailwind CSS with a functional **Cyberpunk** design system—high-contrast neon on black improves partial-vision usability
- **AI:** Google GenAI SDK (`@google/genai`) using `gemini-2.5-flash` for optimal speed/cost balance

---

### The Audio Pipeline

Standard web audio introduces unacceptable latency. We engineered a custom pipeline:

- **Input:** AudioWorkletProcessor capturing 16kHz PCM off the main thread
- **Output:** Raw 24kHz PCM decoding for low-latency, high-fidelity speech
- **Spatial Audio:** Web Audio API positions sounds in 3D space—hazards on the left sound in the left ear

---

### Voice-First Control Architecture

Lumen is fully hands-free via a **Dual-Loop Recognition System**:

- **Local Loop:** Browser Speech API for instant offline commands (e.g., “Stop Guardian”)
- **Cloud Loop:** Gemini Live for complex natural-language intents
- **Barge-In:** User speech immediately interrupts AI output, mimicking natural conversation

---

## 4. User Experience & Design System

Each mode uses color-coding for clarity and accessibility:

- **Guardian (Safety):** Neon Green (alerts in Red)
- **Describe (Cognition):** Neon Blue
- **Read (Analysis):** Neon Purple
- **Navigate (Wayfinding):** Neon Orange

### Accessibility Features
- **Demo Shorts:** Story-style animated onboarding at launch
- **Session Control:** Explicit voice commands instantly cut camera and microphone feeds for privacy

---

## 5. Conclusion

Lumen is more than an object recognizer. By separating perception into **Guardian, Describe, Read, and Navigate**, it respects the layered nature of human vision.

It provides:
- reflexes to keep users safe,  
- intelligence to keep them informed,  
- precision to keep them independent,  
- guidance to take them anywhere.

Lumen proves that with the right architecture, AI can become a true extension of human senses.
