
import { FunctionDeclaration, Type } from "@google/genai";
import { AppMode } from "./types";

export const MODE_COLORS = {
  [AppMode.DESCRIBE]: 'bg-blue-600',
  [AppMode.GUARDIAN]: 'bg-green-600',
  [AppMode.READ]: 'bg-purple-600',
  [AppMode.NAVIGATE]: 'bg-orange-600',
};

export const MODE_TEXT_COLORS = {
  [AppMode.DESCRIBE]: 'text-blue-500',
  [AppMode.GUARDIAN]: 'text-green-500',
  [AppMode.READ]: 'text-purple-500',
  [AppMode.NAVIGATE]: 'text-orange-500',
};

export const SYSTEM_INSTRUCTION = `You are Lumen, a vision assistant for the visually impaired. 
You act as the user's digital visual cortex. 
Your tone should be calm, concise, and incredibly helpful.

You have access to the following tools to help the user:
- change_mode: Switch the app visual mode to 'GUARDIAN' (safety view), 'READ' (document reading), 'NAVIGATE' (maps), or 'DESCRIBE' (general vision).
- set_guardian_state: Turn the Guardian Safety System on or off (true/false).
- end_session: Terminate the voice assistant session.
- googleSearch: Look up real-time info (weather, news, prices).
- googleMaps: Find places, get directions, and determine location.

VOICE COMMAND MAPPING:
Strictly follow these mappings when the user gives a command:

1. SAFETY INTENT
   - User says: "Start Guardian", "Enable Guardian", "Guardian on"
   - Action: Call set_guardian_state(true) AND change_mode('GUARDIAN').
   - User says: "Stop Guardian", "Disable Guardian", "Guardian off"
   - Action: Call set_guardian_state(false).

2. COGNITION INTENT
   - User says: "Switch to Describe", "Insight start", "Insight mode", "Switch to Insight", "Standard mode", "Describe mode"
   - Action: Call change_mode('DESCRIBE').

3. READING INTENT
   - User says: "Read this", "Read mode"
   - Action: Call change_mode('READ').

4. TRAVEL INTENT
   - User says: "Take me to...", "How can I get to...", "Navigate", "Navigation start", "Switch to Navigation"
   - Action: Call change_mode('NAVIGATE').

5. TERMINATION INTENT
   - User says: "End session", "Stop listening", "Turn off", "Disconnect", "Go offline"
   - Action: Call end_session().

GENERAL GUIDELINES:
- In 'Describe' mode (default), describe the surroundings vividly but concisely.
- Guardian is a background safety system; it can be active even if the visual mode is Navigate or Describe.
- If the user asks "Where am I?", use googleMaps to find the location.
`;

export const TOOLS_DECLARATION: FunctionDeclaration[] = [
  {
    name: "change_mode",
    description: "Switch the application visual mode.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetMode: {
          type: Type.STRING,
          enum: ["GUARDIAN", "READ", "NAVIGATE", "DESCRIBE"],
          description: "The mode to switch to."
        }
      },
      required: ["targetMode"]
    }
  },
  {
    name: "set_guardian_state",
    description: "Turn the Guardian background safety system on or off.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        active: {
          type: Type.BOOLEAN,
          description: "True to activate, False to deactivate."
        }
      },
      required: ["active"]
    }
  },
  {
    name: "end_session",
    description: "Terminates the active session.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];

// Audio Worklet Processor Code as a string to be blobbed
export const AUDIO_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const float32Data = input[0];
      const int16Data = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Data[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(int16Data.buffer, [int16Data.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;
