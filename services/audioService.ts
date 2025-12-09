import { AUDIO_WORKLET_CODE } from '../constants';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private inputContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private streamSource: MediaStreamAudioSourceNode | null = null;
  private inputStream: MediaStream | null = null; // Track stream to release mic
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime = 0;

  async initializeInput(stream: MediaStream, onData: (data: ArrayBuffer) => void) {
    this.inputStream = stream; // Store reference
    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await this.inputContext.audioWorklet.addModule(workletUrl);

    this.streamSource = this.inputContext.createMediaStreamSource(stream);
    this.workletNode = new AudioWorkletNode(this.inputContext, 'pcm-processor');

    this.workletNode.port.onmessage = (event) => {
      onData(event.data);
    };

    this.streamSource.connect(this.workletNode);
    this.workletNode.connect(this.inputContext.destination);
  }

  initializeOutput() {
    // If context exists and is running/suspended, reuse it.
    if (this.audioContext && this.audioContext.state !== 'closed') {
        return;
    }
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
  }

  async playAudioData(base64Data: string) {
    if (!this.audioContext) return;
    
    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Data);
      const audioBuffer = await this.pcmToAudioBuffer(arrayBuffer, this.audioContext);
      
      this.queueAudio(audioBuffer);
    } catch (error) {
      console.error("Error playing audio data:", error);
    }
  }

  stopAll() {
    if (this.activeSources.size > 0) {
        console.log("Interruption: Stopping active audio sources");
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        this.activeSources.clear();
    }
    
    // Reset cursor to current time so new audio starts immediately
    if (this.audioContext) {
        this.nextStartTime = this.audioContext.currentTime;
    }
  }

  private queueAudio(buffer: AudioBuffer) {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    // Ensure we don't schedule in the past
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.onended = () => {
        this.activeSources.delete(source);
    };

    source.start(this.nextStartTime);
    this.activeSources.add(source);

    this.nextStartTime += buffer.duration;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async pcmToAudioBuffer(pcmData: ArrayBuffer, context: AudioContext): Promise<AudioBuffer> {
    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    const buffer = context.createBuffer(1, float32Array.length, 24000);
    buffer.copyToChannel(float32Array, 0);
    return buffer;
  }

  async close() {
    this.stopAll();
    
    // Stop all tracks to release the microphone
    if (this.inputStream) {
        this.inputStream.getTracks().forEach(track => track.stop());
        this.inputStream = null;
    }

    if (this.inputContext) {
      if (this.inputContext.state !== 'closed') {
        await this.inputContext.close();
      }
      this.inputContext = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      this.audioContext = null;
    }
  }
}