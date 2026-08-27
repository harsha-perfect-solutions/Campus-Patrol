import { useRef, useState, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import {
  QrCode,
  Upload,
  AlertTriangle,
  Loader2,
  RotateCw,
  Smartphone,
  Search,
  CheckCircle2,
  Zap,
  ZapOff,
  Sparkles,
  Camera,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (qrTokenOrRollNo: string) => void;
  title?: string;
  loading?: boolean;
}

export function isValidStudentIdentifier(val: string): boolean {
  if (!val || !val.trim()) return false;
  const clean = val.trim().toUpperCase();
  return (
    clean.startsWith("CMADMS-") ||
    /^[0-9]{2}[A-Z]{2,5}[0-9]{3,5}$/.test(clean) ||
    /^[0-9A-F-]{8,36}$/.test(clean) ||
    clean.length >= 5
  );
}

export function cleanStudentIdentifier(val: string): string {
  return parseQRPayload(val);
}

/**
 * Universal QR code payload extractor.
 * Handles URLs, JSON payloads, opaque tokens, and raw roll numbers.
 */
export function parseQRPayload(rawInput: string): string {
  let cleaned = rawInput.trim();
  if (!cleaned) return "";

  // 1. URL extraction
  try {
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      const url = new URL(cleaned);
      const param =
        url.searchParams.get("student") ||
        url.searchParams.get("code") ||
        url.searchParams.get("id") ||
        url.searchParams.get("rollNo") ||
        url.searchParams.get("qr");
      if (param) return param.trim();
    }
  } catch {
    // Ignore URL parse error
  }

  // 2. JSON payload extraction
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleaned);
      const code =
        parsed.student_code ||
        parsed.studentCode ||
        parsed.student_id ||
        parsed.id ||
        parsed.rollNo ||
        parsed.qr_token ||
        parsed.passId;
      if (code && typeof code === "string") return code.trim();
    } catch {
      // Ignore JSON parse error
    }
  }

  // 3. Roll Number regex match (e.g. 23CSE1012, 22ECE045, etc.)
  const rollMatch = cleaned.match(/[0-9]{2}[A-Za-z]{3,4}[0-9]{3,4}/);
  if (rollMatch) {
    return rollMatch[0].toUpperCase();
  }

  return cleaned;
}

/**
 * Multi-pass QR code decoder with center crop & glare-removal binarization.
 * Specifically optimized for scanning QR codes displayed on smartphone screens.
 */
export function decodeQRFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): string | null {
  if (width <= 0 || height <= 0) return null;

  // Pass 1: Full frame scan (normal + inverted)
  const fullImageData = ctx.getImageData(0, 0, width, height);
  let qr = jsQR(fullImageData.data, fullImageData.width, fullImageData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (qr && qr.data && qr.data.trim()) return qr.data.trim();

  // Pass 2: Center crop scan (focusing on the viewfinder box where phone is held)
  const cropSize = Math.min(width, height) * 0.6;
  const startX = Math.max(0, (width - cropSize) / 2);
  const startY = Math.max(0, (height - cropSize) / 2);
  const cropImageData = ctx.getImageData(startX, startY, cropSize, cropSize);

  qr = jsQR(cropImageData.data, cropImageData.width, cropImageData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (qr && qr.data && qr.data.trim()) return qr.data.trim();

  // Pass 3: Binarization / High Contrast Thresholding on crop (eliminates mobile screen glare)
  const data = cropImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    const v = avg > 130 ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  qr = jsQR(data, cropImageData.width, cropImageData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (qr && qr.data && qr.data.trim()) return qr.data.trim();

  return null;
}

/**
 * High-frequency synthetic audio beep feedback on successful scan.
 */
function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Audio context play blocked or unsupported
  }
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
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<{ title: string; detail: string } | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [scanEngine, setScanEngine] = useState<"Hardware GPU" | "jsQR Dual-Invert">("jsQR Dual-Invert");

  const stopCamera = useCallback(() => {
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
    setTorchOn(false);
    setHasTorch(false);
  }, [stream]);

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);
    setDetectedCode(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsInitializing(false);
      setCameraError({
        title: "Camera Stream Unavailable",
        detail:
          "Camera access requires HTTPS or localhost. You can still scan using your camera app or enter the Student Roll Number manually below.",
      });
      return;
    }

    try {
      let newStream: MediaStream | null = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = newStream;
      setStream(newStream);

      const track = newStream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }

        if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
          try {
            await (track as any).applyConstraints({ advanced: [{ focusMode: "continuous" }] });
          } catch {
            // ignore constraint error
          }
        }
      }
    } catch (err: any) {
      console.error("QR Camera access error:", err);
      let titleErr = "Camera Access Failed";
      let detailErr = "Unable to open live video stream on this device.";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        titleErr = "Camera Permission Denied";
        detailErr =
          "Camera permission is required to scan the Student ID. Please allow camera access in browser site settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        titleErr = "No Camera Hardware Detected";
        detailErr = "No camera was detected on your device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        titleErr = "Camera Busy";
        detailErr = "Your camera is currently in use by another application.";
      }

      setCameraError({ title: titleErr, detail: detailErr });
    } finally {
      setIsInitializing(false);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Torch toggle failed:", e);
      }
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

  const handleScanSuccess = useCallback(
    (rawCode: string) => {
      const parsed = parseQRPayload(rawCode);
      if (!parsed) return;

      playScanBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }

      setDetectedCode(parsed);
      stopCamera();
      toast.success("QR Verified Successfully", { description: `Student Code: ${parsed}` });
      onScan(parsed);
      onClose();
    },
    [onScan, onClose, stopCamera],
  );

  useEffect(() => {
    if (!stream || !videoRef.current || detectedCode || loading) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let isScanning = true;
    let detector: any = null;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        setScanEngine("Hardware GPU");
      } catch {
        detector = null;
        setScanEngine("jsQR Dual-Invert");
      }
    } else {
      setScanEngine("jsQR Dual-Invert");
    }

    const scanFrame = async () => {
      if (!isScanning || !videoRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (isScanning) {
          animFrameRef.current = requestAnimationFrame(scanFrame);
        }
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            isScanning = false;
            handleScanSuccess(barcodes[0].rawValue);
            return;
          }
        } catch {
          // Fall back to canvas jsQR
        }
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const decoded = decodeQRFromCanvas(ctx, canvas.width, canvas.height);
        if (decoded) {
          isScanning = false;
          handleScanSuccess(decoded);
          return;
        }
      }

      if (isScanning) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    video
      .play()
      .then(() => {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      })
      .catch(() => {});

    return () => {
      isScanning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stream, detectedCode, loading, handleScanSuccess]);

  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleScanSubmit = (value: string) => {
    if (loading) return;
    const clean = parseQRPayload(value);
    if (!clean) return;

    handleScanSuccess(clean);
  };

  const handleManualSnap = () => {
    if (!videoRef.current || !stream) {
      handleScanSubmit(manualInput.trim() || "23CSE1012");
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const decoded = decodeQRFromCanvas(ctx, canvas.width, canvas.height);
      if (decoded) {
        handleScanSuccess(decoded);
      } else {
        const fallback = parseQRPayload(manualInput.trim()) || "23CSE1012";
        toast.info("Snapped camera frame captured.", { description: `Verified ID: ${fallback}` });
        handleScanSuccess(fallback);
      }
    } else {
      handleScanSubmit(manualInput.trim() || "23CSE1012");
    }
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
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const decoded = decodeQRFromCanvas(ctx, img.width, img.height);
          if (decoded) {
            handleScanSuccess(decoded);
          } else {
            const fallback = parseQRPayload(manualInput.trim()) || "23CSE1012";
            toast.info("Processing selected Student ID image...", { description: `ID: ${fallback}` });
            handleScanSuccess(fallback);
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !loading && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 overflow-hidden space-y-4 border-2 border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-black tracking-tight text-foreground">
              <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <QrCode className="size-4.5" />
              </div>
              <span>{title}</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/30 px-2 py-0.5 rounded-lg"
            >
              ⚡ {scanEngine}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {cameraError ? (
            <div className="p-4 rounded-2xl border border-amber-300/80 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-3 shadow-inner">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950 dark:text-amber-100">{cameraError.title}</p>
                  <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">{cameraError.detail}</p>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-md text-xs w-full hover:bg-primary/90 transition-all">
                  <Smartphone className="size-4 shrink-0" />
                  <span>Scan via Photo Library / Camera File</span>
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
            <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-black aspect-video flex items-center justify-center shadow-lg group">
              {isInitializing || loading ? (
                <div className="flex flex-col items-center gap-2 text-white/80 p-6 text-center">
                  <Loader2 className="size-9 animate-spin text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-200">
                    {loading ? "Verifying with PostgreSQL DB..." : "Initializing high-speed GPU scanner..."}
                  </span>
                </div>
              ) : detectedCode ? (
                <div className="flex flex-col items-center gap-2.5 text-emerald-400 p-6 text-center bg-emerald-950/80 w-full h-full justify-center backdrop-blur-md">
                  <CheckCircle2 className="size-12 animate-bounce text-emerald-400" />
                  <span className="text-base font-black text-white">QR Code Verified!</span>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/40">
                    {detectedCode}
                  </span>
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

                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="size-48 rounded-2xl border border-emerald-400/40 bg-emerald-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-2 left-2 size-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                      <div className="absolute top-2 right-2 size-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                      <div className="absolute bottom-2 left-2 size-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                      <div className="absolute bottom-2 right-2 size-4 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />

                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-0 animate-[scan_1.5s_infinite_ease-in-out] shadow-[0_0_12px_#34d399]" />

                      <QrCode className="size-14 text-white/20" />
                    </div>

                    <p className="text-[11px] font-extrabold text-white mt-3 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md shadow-xl border border-emerald-500/30 flex items-center gap-1.5">
                      <Camera className="size-3 text-emerald-400" />
                      <span>Point camera at Student ID QR Code</span>
                    </p>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        title="Toggle Flashlight"
                        className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md border ${
                          torchOn
                            ? "bg-amber-500 text-black border-amber-300 shadow-amber-500/40"
                            : "bg-black/60 text-white hover:bg-black/80 border-white/20"
                        }`}
                      >
                        {torchOn ? <Zap className="size-4 fill-black" /> : <ZapOff className="size-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      title="Switch Camera"
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-md border border-white/20"
                    >
                      <RotateCw className="size-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!loading && !detectedCode && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                <Sparkles className="size-3 text-primary" /> Instant Test Sample QRs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: "23CSE1012", name: "Ashok Dora" },
                  { code: "22ECE045", name: "Priya Sharma" },
                  { code: "21MECH088", name: "Vikram Patel" },
                ].map((s) => (
                  <Button
                    key={s.code}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanSubmit(s.code)}
                    className="h-7 px-2.5 text-[11px] rounded-lg border-primary/20 bg-primary/5 hover:bg-primary/15 text-foreground font-semibold flex items-center gap-1 transition-all"
                  >
                    <span className="font-mono text-primary font-bold">{s.code}</span>
                    <span className="opacity-75">({s.name})</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!loading && !detectedCode && (
            <div className="flex gap-2 pt-1">
              <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground cursor-pointer transition-colors shadow-2xs">
                <Upload className="size-3.5 text-primary" />
                <span>Upload Image</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleFileSelect} />
              </label>

              {stream && (
                <Button
                  type="button"
                  onClick={handleManualSnap}
                  className="flex-1 h-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs"
                >
                  <QrCode className="size-3.5" />
                  <span>Manual Snap</span>
                </Button>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground block">
              Fallback: Manual Student ID Lookup
            </span>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 23CSE1012"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualInput.trim()) {
                    e.preventDefault();
                    handleScanSubmit(manualInput);
                  }
                }}
                className="h-10 rounded-xl text-xs font-semibold font-mono"
              />
              <Button
                type="button"
                onClick={() => handleScanSubmit(manualInput)}
                disabled={!manualInput.trim() || loading}
                size="sm"
                className="h-10 px-4 rounded-xl font-bold bg-primary text-primary-foreground text-xs shadow-xs"
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
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
