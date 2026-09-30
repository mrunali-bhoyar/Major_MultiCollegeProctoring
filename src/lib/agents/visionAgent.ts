import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export class VisionAgent {
    private faceDetector: FaceDetector | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private isMonitoring = false;
    private onFaceEvent: (event: 'NO_FACE' | 'MULTIPLE_FACES' | 'SINGLE_FACE') => void;
    private checkInterval = 2000;
    private intervalId: NodeJS.Timeout | null = null;

    constructor(onFaceEvent: (event: 'NO_FACE' | 'MULTIPLE_FACES' | 'SINGLE_FACE') => void) {
        this.onFaceEvent = onFaceEvent;
    }

    async initialize() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            this.faceDetector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO"
            });
        } catch (error) {
            console.error("Failed to initialize Vision Agent:", error);
        }
    }

    async start(videoElement: HTMLVideoElement) {
        if (!this.faceDetector) {
            await this.initialize();
        }
        
        if (this.isMonitoring || !this.faceDetector) return;

        this.videoElement = videoElement;
        this.isMonitoring = true;
        this.monitor();
    }

    private monitor() {
        if (!this.isMonitoring || !this.faceDetector || !this.videoElement) return;

        this.intervalId = setInterval(async () => {
            if (!this.isMonitoring || !this.faceDetector || !this.videoElement) return;
            
            // Make sure the video is playing and has data
            if (this.videoElement.readyState >= 2) {
                const startTimeMs = performance.now();
                const detections = this.faceDetector.detectForVideo(this.videoElement, startTimeMs).detections;

                if (detections.length === 0) {
                    this.onFaceEvent('NO_FACE');
                } else if (detections.length > 1) {
                    this.onFaceEvent('MULTIPLE_FACES');
                } else {
                    this.onFaceEvent('SINGLE_FACE');
                }
            }
        }, this.checkInterval);
    }

    stop() {
        this.isMonitoring = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
