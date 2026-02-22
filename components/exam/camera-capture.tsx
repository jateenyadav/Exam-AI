"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useExamStore } from "@/lib/store/exam-store";

interface CameraCaptureProps {
  questionId: string;
  existingImage?: string;
  onCapture: (imageData: string) => void;
}

export function CameraCapture({ existingImage, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(existingImage || null);
  const setCameraActive = useExamStore((s) => s.setCameraActive);

  const startCamera = useCallback(async () => {
    try {
      setCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraActive(false);
      alert("Camera access is required to photograph your answer. Please allow camera access.");
    }
  }, [setCameraActive]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCameraActive(false);
  }, [stream, setCameraActive]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(imageData);
    onCapture(imageData);
    stopCamera();
  }, [onCapture, stopCamera]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setCameraActive(false);
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCapturedImage(result);
        onCapture(result);
      };
      reader.readAsDataURL(file);
    },
    [onCapture, setCameraActive]
  );

  const openFilePicker = useCallback(() => {
    setCameraActive(true);
    fileInputRef.current?.click();
    // Re-enable anti-cheat after a delay in case user cancels the picker
    // (no reliable "cancel" event on file inputs)
    setTimeout(() => {
      setCameraActive(false);
    }, 10000);
  }, [setCameraActive]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  return (
    <div className="space-y-3">
      {capturedImage ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <img
              src={capturedImage}
              alt="Captured answer"
              className="w-full max-h-80 object-contain"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-500 text-white">Answer Captured</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retake}>
              Retake Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCapturedImage(null);
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : isCameraOpen ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-80"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={capturePhoto} className="flex-1">
              Capture Photo
            </Button>
            <Button variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={startCamera}
            className="flex-1 h-20 flex-col gap-1"
          >
            <span className="text-2xl">📷</span>
            <span className="text-sm">Open Camera</span>
          </Button>
          <div className="flex-1">
            <button
              type="button"
              onClick={openFilePicker}
              className="flex h-20 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary/50 hover:bg-muted/50 transition-colors flex-col gap-1"
            >
              <span className="text-2xl">📁</span>
              <span className="text-sm text-muted-foreground">Upload Image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className || ""}`}>
      {children}
    </span>
  );
}
