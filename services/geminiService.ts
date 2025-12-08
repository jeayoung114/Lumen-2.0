import { GoogleGenAI, Modality, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, TOOLS_DECLARATION } from "../constants";

export class GeminiService {
  private client: GoogleGenAI;
  private session: any = null;
  
  constructor() {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      console.error("API_KEY is missing!");
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  // --- Live API (Describe Mode) ---

  async connectLive(
    onAudioData: (base64: string) => void,
    onToolCall: (name: string, args: any) => Promise<any>,
    onInterrupted: () => void,
    location?: { lat: number, lng: number }
  ) {
    // 1. Define Tool Sets
    const basicTools = [{ functionDeclarations: TOOLS_DECLARATION }];
    const groundingTools = [
        { googleSearch: {} },
        { googleMaps: {} }
    ];

    // 2. Helper to build config and connect
    // We wrap this in a Promise to handle the async nature of the 'onerror' callback during startup
    const attemptConnect = (useGrounding: boolean) => {
        return new Promise<void>(async (resolve, reject) => {
            let isConnected = false;

            // PREPARE SYSTEM INSTRUCTION
            // Explicitly telling the model the location in the prompt prevents "I don't have permission" hallucinations
            let finalSystemInstruction = SYSTEM_INSTRUCTION;
            if (location) {
                finalSystemInstruction += `\n\n[SYSTEM DATA] USER LOCATION: Latitude ${location.lat}, Longitude ${location.lng}. You have permission to use this location for navigation and queries.`;
            }

            const tools = useGrounding ? [...basicTools, ...groundingTools] : basicTools;
            const config: any = {
                responseModalities: [Modality.AUDIO],
                systemInstruction: finalSystemInstruction,
                tools: tools,
            };

            // Inject location for Grounding if available and requested
            // strictly using retrievalConfig for Maps grounding
            if (useGrounding && location) {
                config.toolConfig = {
                    retrievalConfig: {
                        latLng: {
                            latitude: location.lat,
                            longitude: location.lng
                        }
                    }
                };
            }

            try {
                this.session = await this.client.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: config,
                    callbacks: {
                        onopen: () => {
                            console.log(`Gemini Live Connected (Grounding: ${useGrounding})`);
                            isConnected = true;
                            resolve();
                        },
                        onmessage: async (message) => {
                            // Check for interruption signal
                            if (message.serverContent?.interrupted) {
                                onInterrupted();
                                return;
                            }

                            // Handle Audio
                            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (audioData) {
                                onAudioData(audioData);
                            }

                            // Handle Tool Calls
                            const toolCall = message.toolCall;
                            if (toolCall) {
                                for (const fc of toolCall.functionCalls) {
                                    const result = await onToolCall(fc.name, fc.args);
                                    // Send response back
                                    await this.session?.sendToolResponse({
                                        functionResponses: {
                                            id: fc.id,
                                            name: fc.name,
                                            response: { result: result || "OK" }
                                        }
                                    });
                                }
                            }
                        },
                        onclose: () => console.log("Gemini Live Closed"),
                        onerror: (err) => {
                            console.error("Gemini Live Error", err);
                            // If error occurs before connection is established, reject the promise to trigger fallback
                            if (!isConnected) {
                                reject(err);
                            }
                        },
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    };

    // 3. Try Connection with Fallback Strategy
    try {
        console.log("Attempting to connect with Grounding tools...");
        await attemptConnect(true);
    } catch (e: any) {
        console.warn("Connection with Grounding failed (Permission/Config issue). Falling back to basic tools.", e);
        
        // Ensure we clean up any partial session state
        await this.disconnect();

        try {
            await attemptConnect(false);
            console.log("Fallback successful: Connected with basic functionality.");
        } catch (retryError) {
            console.error("Fatal: Basic connection also failed.", retryError);
            throw retryError;
        }
    }
  }

  async sendRealtimeAudio(pcmData: ArrayBuffer) {
    if (!this.session) return;
    
    const base64Str = this.arrayBufferToBase64(pcmData);
    await this.session.sendRealtimeInput({
      media: {
        mimeType: 'audio/pcm;rate=16000',
        data: base64Str
      }
    });
  }

  async sendRealtimeVideo(base64Image: string) {
    if (!this.session) return;
    
    // session.sendRealtimeInput expects just the base64 data, not the data URL prefix
    const data = base64Image.split(',')[1];
    await this.session.sendRealtimeInput({
      media: {
        mimeType: 'image/jpeg',
        data: data
      }
    });
  }

  async disconnect() {
    if (this.session) {
      try {
          // Check if close method exists and call it
          if (typeof this.session.close === 'function') {
              await this.session.close();
          }
      } catch (e) {
          console.warn("Error closing session:", e);
      }
      this.session = null;
    }
  }

  // --- Static API (Read Mode) ---

  async readImage(base64Image: string): Promise<string> {
    try {
      const data = base64Image.split(',')[1];
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data } },
                { text: "Read the visible text in this image. If it's a book, read the title and summary. If it's a document, read the main content. Be precise." }
            ]
        }
      });
      return response.text || "No text detected.";
    } catch (e) {
      console.error("Read mode error:", e);
      return "Sorry, I couldn't read that.";
    }
  }

  // Helper
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}