# Lumen: The Digital Visual Cortex
### Bridging the Gap Between Sight and Sound

## Project Description
Lumen is a mobile neural prosthetic acting as a "Digital Visual Cortex" for the visually impaired. It bridges the gap between fast, low-fidelity tools (white canes) and slow, high-fidelity apps (OCR) by leveraging the **Google Gemini Live API** for continuous, real-time multimodal understanding.

The app features a **Quad-System Architecture**:
*   **Guardian**: Zero-latency, on-device motion detection for physical safety.
*   **Describe**: Real-time conversational AI for environmental awareness.
*   **Read**: High-precision text extraction for documents.
*   **Navigate**: AI-assisted wayfinding fusing GPS and vision.

**Crucially, Lumen prioritizes hands-free autonomy.** Recognizing that blind users cannot fumble with touchscreens while moving, we implemented robust **Voice-Based Mode Switching**. Users seamlessly transition between safety reflexes and deep cognition using natural commands like "Start Guardian" or "Read this," ensuring total control without lifting a finger.

## How We Built It
We developed Lumen entirely within **Google AI Studio**, leveraging its "Vibe Coding" capabilities to rapidly prototype the complex integration of **React 19** and the **Google GenAI SDK**.

To solve critical latency challenges, we employed a hybrid approach:
1.  **Gemini Live**: Handles complex video and audio reasoning in the cloud.
2.  **On-Device Heuristics**: Runs pixel-difference algorithms locally for instant, offline obstacle detection.
3.  **AudioWorklets**: Manages raw PCM streaming for near-human response times.
4.  **Dual-Loop Voice Control**: Combines local Web Speech API wake-word detection with cloud-based intent understanding.

## Impact
For the 2.2 billion visually impaired people, Lumen transforms the smartphone from a passive device into an active sensory organ, offering the safety to explore, the autonomy to read, and the dignity to navigate the world independently.

## Links
*   **AI Studio App**: [https://ai.studio/apps/drive/1K-_Xps2iiyqsebo8WNBYQ6pj4ehVvA6j?fullscreenApplet=true]
