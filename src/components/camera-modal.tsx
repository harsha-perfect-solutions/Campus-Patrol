import { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, Check, Upload, AlertTriangle, Loader2, RotateCw, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string, fileName: string) => void;
}

export function CameraModal({ open, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<{ title: string; detail: string } | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);

    // Check navigator.mediaDevices support
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsInitializing(false);
      setCameraError({
        title: "Camera Stream Unavailable (Insecure Context)",
        detail: "Browsers require HTTPS or http://localhost for live webcam access. You can still take a photo using your device's native camera app or upload an existing file below.",
      });
      return;
    }

    let newStream: MediaStream | null = null;
    try {
      // 1st attempt: requested facing mode with HD resolution
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        // 2nd attempt: requested facing mode basic
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: mode } },
          });
        } catch {
          // 3rd attempt: any video stream available
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      streamRef.current = newStream;
      setStream(newStream);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let title = "Camera Access Failed";
      let detail = "Unable to open live video stream on this device.";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        title = "Camera Permission Denied";
        detail = "Camera access was denied by your browser. Please click the permissions icon in your browser URL bar, grant camera access, and click 'Retry Camera'.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        title = "No Camera Detected";
        detail = "No video capture hardware was found on your device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        title = "Camera Busy";
        detail = "Your camera is currently in use by another application (e.g. Zoom, Teams, or another browser tab). Please close it and retry.";
      } else if (err.message) {
        detail = `${err.name || "Error"}: ${err.message}`;
      }

      setCameraError({ title, detail });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCaptured(null);
      setCameraError(null);
      return;
    }

    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [open]);

  // Synchronize stream with video element whenever stream changes or component re-renders
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.log("Video element play catch:", err));
    }
  }, [stream]);

  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/png");
      setCaptured(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (!captured) return;
    const filename = `camera_photo_${Date.now()}.png`;
    onCapture(captured, filename);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onCapture(result, file.name);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Camera className="size-5 text-primary" /> Capture Incident Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {cameraError ? (
            <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-amber-950 dark:text-amber-100">{cameraError.title}</p>
                  <p className="opacity-90 text-[11px] leading-relaxed">{cameraError.detail}</p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {/* Primary CTA: Launch Mobile/Device Camera App Natively */}
                <label className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-md transition-all hover:bg-primary/90 text-xs w-full">
                  <Smartphone className="size-4 shrink-0" />
                  <span>Open Camera App (Snap Photo)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startCamera(facingMode)}
                    disabled={isInitializing}
                    className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 font-medium text-[11px]"
                  >
                    {isInitializing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Camera className="size-3.5" />
                    )}
                    <span>Retry Webcam</span>
                  </Button>

                  <label className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-medium cursor-pointer transition-colors text-[11px]">
                    <Upload className="size-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-amber-300/40 dark:border-amber-700/40">
                💡 <strong>Tip for live webcam:</strong> Access via <code>http://localhost:8082</code> on this PC, or use HTTPS.
              </p>
            </div>
          ) : captured ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border bg-black aspect-video relative">
                <img
                  src={captured}
                  alt="Captured evidence"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCaptured(null)}
                  className="flex-1 rounded-xl text-xs"
                >
                  <RefreshCw className="size-3.5 mr-1" /> Retake Photo
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConfirm}
                  className="flex-1 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  <Check className="size-3.5 mr-1" /> Attach This Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border bg-black aspect-video relative flex items-center justify-center">
                {isInitializing ? (
                  <div className="flex flex-col items-center gap-2 text-white/80">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <span className="text-xs font-medium">Connecting camera...</span>
                  </div>
                ) : (
                  <>
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && stream) {
                          el.srcObject = stream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                        }
                      }}
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Flip / Switch Button */}
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      title="Switch Camera (Front / Back)"
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors shadow-md border border-white/20"
                    >
                      <RotateCw className="size-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleTakeSnapshot}
                  disabled={isInitializing || !stream}
                  className="w-full h-10 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs gap-2"
                >
                  <Camera className="size-4" />
                  <span>Take Photo Snapshot</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground cursor-pointer transition-colors">
                    <Smartphone className="size-3.5 text-primary" />
                    <span>Camera App</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <label className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground cursor-pointer transition-colors">
                    <Upload className="size-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

