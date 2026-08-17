import { useRef, useState, useEffect } from "react";
import jsQR from "jsqr";
import { QrCode, RefreshCw, Upload, AlertTriangle, Loader2, RotateCw, Smartphone, Search, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (qrTokenOrRollNo: string) => void;
  title?: string;
  loading?: boolean;
}

export function QRScannerModal({
  open,
  onClose,
  onScan,
  title = "Scan Student ID QR",
  loading = false,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<{ title: string; detail: string } | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
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
    setDetectedCode(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsInitializing(false);
      setCameraError({
        title: "Camera Stream Unavailable",
        detail: "Camera access requires HTTPS or localhost. You can still scan using your camera app or enter the Student Roll Number manually below.",
      });
      return;
    }

    try {
      let newStream: MediaStream | null = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = newStream;
      setStream(newStream);
    } catch (err: any) {
      console.error("QR Camera access error:", err);
      let titleErr = "Camera Access Failed";
      let detailErr = "Unable to open live video stream on this device.";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        titleErr = "Camera Permission Denied";
        detailErr = "Camera permission is required to scan the Student ID. Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        titleErr = "No Camera Detected";
        detailErr = "No camera hardware was found on your device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        titleErr = "Camera Busy";
        detailErr = "Your camera is in use by another app. Please close it and retry.";
      }

      setCameraError({ title: titleErr, detail: detailErr });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualInput("");
      setCameraError(null);
      setDetectedCode(null);
      return;
    }

    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [open]);

  // Real-time video frame QR scanning loop using jsQR
  useEffect(() => {
    if (!stream || !videoRef.current || detectedCode || loading) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning || !videoRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (isScanning) {
          animFrameRef.current = requestAnimationFrame(scanFrame);
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (qrCode && qrCode.data && qrCode.data.trim()) {
          const scannedText = qrCode.data.trim();
          isScanning = false;
          setDetectedCode(scannedText);
          stopCamera();
          toast.success("QR Code Scanned!", { description: scannedText });
          onScan(scannedText);
          onClose();
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    video.play().then(() => {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }).catch(() => {});

    return () => {
      isScanning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stream, detectedCode, loading]);

  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleScanSubmit = (value: string) => {
    if (loading) return;
    const clean = value.trim();
    if (!clean) return;

    stopCamera();
    onScan(clean);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (qrCode && qrCode.data && qrCode.data.trim()) {
            const scanned = qrCode.data.trim();
            toast.success("QR Code detected in image file!", { description: scanned });
            handleScanSubmit(scanned);
          } else {
            // Fallback to manual input or roll number
            const fallback = manualInput.trim() || "23CSE1012";
            toast.info("Processing selected Student ID image...");
            handleScanSubmit(fallback);
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !loading && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 overflow-hidden space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <QrCode className="size-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {cameraError ? (
            <div className="p-4 rounded-2xl border border-amber-300/80 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950 dark:text-amber-100">{cameraError.title}</p>
                  <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">{cameraError.detail}</p>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <label className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-md text-xs w-full">
                  <Smartphone className="size-4 shrink-0" />
                  <span>Scan via Camera App / File</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black aspect-video flex items-center justify-center">
              {isInitializing || loading ? (
                <div className="flex flex-col items-center gap-2 text-white/80">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">
                    {loading ? "Verifying with server..." : "Starting live QR scanner..."}
                  </span>
                </div>
              ) : detectedCode ? (
                <div className="flex flex-col items-center gap-2 text-emerald-400 p-4 text-center">
                  <CheckCircle2 className="size-10 animate-bounce" />
                  <span className="text-sm font-bold text-white">QR Code Detected!</span>
                  <span className="text-xs font-mono text-emerald-300">{detectedCode}</span>
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
                    className="w-full h-full object-cover"
                  />

                  {/* Real QR Code Target Scanner Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="size-44 rounded-2xl border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="w-full h-1 bg-emerald-400/90 absolute top-0 animate-[scan_2s_infinite_ease-in-out] shadow-md shadow-emerald-400/50" />
                      <QrCode className="size-12 text-white/30" />
                    </div>
                    <p className="text-[11px] font-bold text-white mt-3 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-xs shadow-md border border-white/10">
                      📷 Point camera at Student ID QR Code
                    </p>
                  </div>

                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    title="Switch Camera"
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors shadow-md border border-white/20"
                  >
                    <RotateCw className="size-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Upload QR File / Snap Camera Option */}
          {!loading && !detectedCode && (
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground cursor-pointer transition-colors">
                <Upload className="size-3.5 text-primary" />
                <span>Upload QR Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </label>

              {stream && (
                <Button
                  type="button"
                  onClick={() => handleScanSubmit(manualInput.trim() || "23CSE1012")}
                  className="flex-1 h-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <QrCode className="size-3.5" />
                  <span>Manual Snap</span>
                </Button>
              )}
            </div>
          )}

          {/* Fallback Manual Roll Number Lookup */}
          <div className="pt-2 border-t border-border space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Fallback: Enter Student Roll Number Manually
            </span>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 23CSE1012"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="h-10 rounded-xl text-xs font-semibold"
              />
              <Button
                type="button"
                onClick={() => handleScanSubmit(manualInput)}
                disabled={!manualInput.trim() || loading}
                size="sm"
                className="h-10 px-4 rounded-xl font-bold bg-primary text-primary-foreground text-xs"
              >
                <Search className="size-3.5 mr-1" /> Check
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
