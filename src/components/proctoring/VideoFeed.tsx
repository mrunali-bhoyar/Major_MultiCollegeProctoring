
"use client";

import React, { useEffect, useRef } from 'react';
import { CameraOff } from 'lucide-react';

interface VideoFeedProps {
  isMonitoring: boolean;
  suspicionScore: number;
  hasCameraPermission: boolean | null;
  stream: MediaStream | null;
}

const VideoFeed = ({ isMonitoring, suspicionScore, hasCameraPermission, stream }: VideoFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && videoEl.onloadedmetadata === null) {
      videoEl.onloadedmetadata = () => {
        if (videoRef.current && canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      };
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isMonitoring) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const boxColor = suspicionScore < 30 ? '#00C9B7' : suspicionScore < 70 ? '#ffc107' : '#FF6B6B';
      const boxX = canvas.width * 0.25 + (Math.random() - 0.5) * 20;
      const boxY = canvas.height * 0.15 + (Math.random() - 0.5) * 20;
      const boxWidth = canvas.width * 0.5;
      const boxHeight = canvas.height * 0.7;

      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      const text = `Suspicion: ${suspicionScore}%`;
      ctx.font = 'bold 16px "Inter", sans-serif';
      const textMetrics = ctx.measureText(text);

      // Draw a semi-transparent background for the text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(boxX - 4, boxY - 10 - 16, textMetrics.width + 8, 24);

      // Draw the text itself in white for high contrast
      ctx.fillStyle = 'white';
      ctx.fillText(text, boxX, boxY - 10);

      const lookAwayFactor = (suspicionScore - 20) / 80; 
      const isLookingAway = Math.random() < lookAwayFactor;
      
      const targetX = isLookingAway ? canvas.width * Math.random() : boxX + boxWidth / 2 + (Math.random() - 0.5) * 50;
      const targetY = isLookingAway ? canvas.height * Math.random() : boxY + boxHeight / 2 + (Math.random() - 0.5) * 50;
      
      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth / 2, boxY + boxHeight / 3);
      ctx.lineTo(targetX, targetY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if(ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

  }, [isMonitoring, suspicionScore]);

  return (
    <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden ring-2 ring-border">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      {hasCameraPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
          <CameraOff className="w-16 h-16 text-destructive" />
          <h2 className="mt-4 text-xl font-bold">Camera Access Denied</h2>
          <p className="mt-1 text-sm text-muted-foreground">Please enable camera access in your browser to continue.</p>
        </div>
      )}
       {hasCameraPermission === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
            <p>Requesting camera access...</p>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;
