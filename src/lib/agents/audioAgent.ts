export class AudioAgent {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private microphone: MediaStreamAudioSourceNode | null = null;
    private dataArray: Uint8Array | null = null;
    private isMonitoring = false;
    private onSuspiciousAudio: () => void;
    private threshold = 100; // Adjust volume threshold as needed (0-255)
    private checkInterval = 1000;
    private intervalId: NodeJS.Timeout | null = null;

    constructor(onSuspiciousAudio: () => void) {
        this.onSuspiciousAudio = onSuspiciousAudio;
    }

    async start(stream: MediaStream) {
        if (this.isMonitoring) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.microphone.connect(this.analyser);
            
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.isMonitoring = true;
            this.monitor();
        } catch (err) {
            console.error("Failed to initialize Audio Agent:", err);
        }
    }

    private monitor() {
        if (!this.isMonitoring || !this.analyser || !this.dataArray) return;

        this.intervalId = setInterval(() => {
            if (!this.isMonitoring || !this.analyser || !this.dataArray) return;
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const average = sum / this.dataArray.length;

            // If average volume exceeds threshold, trigger callback
            if (average > this.threshold) {
                this.onSuspiciousAudio();
            }
        }, this.checkInterval);
    }

    stop() {
        this.isMonitoring = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
