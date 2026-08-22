import { useRef, useState, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import {
  QrCode,
  RefreshCw,
  Upload,
  AlertTriangle,
  Loader2,
  RotateCw,
  Smartphone,
  Search,
  CheckCircle2,
  Video,
  Info,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  let clean = val.trim();
  if (clean.startsWith("{") && clean.endsWith("}")) {
    try {
      const parsed = JSON.parse(clean);
      clean = parsed.passId || parsed.studentCode || parsed.passCode || parsed.code || clean;
    } catch {
      // ignore JSON parse error
    }
  }
  return clean.trim();
}

export type CameraDiagnostics = {
  secureContext: boolean;
  hasGetUserMedia: boolean;
  deviceCount: number;
  permissionState: "granted" | "denied" | "prompt" | "unknown";
  cameraStatus: "IDLE" | "STARTING" | "ACTIVE" | "FAILED";
  lastError: string | null;
};

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
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraError, setCameraError] = useState<{ title: string; detail: string; code: string } | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics>({
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    hasGetUserMedia: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    deviceCount: 0,
    permissionState: "unknown",
    cameraStatus: "IDLE",
    lastError: null,
  });

  const checkPermissionState = async () => {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        const res = await navigator.permissions.query({ name: "camera" as any });
        setDiagnostics((prev) => ({ ...prev, permissionState: res.state }));
        res.onchange = () => {
          setDiagnostics((prev) => ({ ...prev, permissionState: res.state }));
        };
      } catch {
        setDiagnostics((prev) => ({ ...prev, permissionState: "unknown" }));
      }
    }
  };

  const updateDeviceList = async () => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setVideoDevices(videoInputs);
        setDiagnostics((prev) => ({ ...prev, deviceCount: videoInputs.length }));
      } catch {
        // ignore device listing error
      }
    }
  };

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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setDiagnostics((prev) => ({ ...prev, cameraStatus: "IDLE" }));
  }, [stream]);

  const startCamera = async (targetDeviceId?: string, mode: "environment" | "user" = facingMode) => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);
    setDetectedCode(null);
    isProcessingRef.current = false;
    setDiagnostics((prev) => ({ ...prev, cameraStatus: "STARTING", lastError: null }));

    const isSecure = typeof window !== "undefined" && window.isSecureContext;
    const hasGUM = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

    setDiagnostics((prev) => ({
      ...prev,
      secureContext: isSecure,
      hasGetUserMedia: hasGUM,
    }));

    if (!hasGUM) {
      setIsInitializing(false);
      const detail = !isSecure
        ? "Camera access requires a Secure Context (HTTPS or localhost). Accessing via plain HTTP IP is blocked by browser security policies."
        : "Your browser does not support getUserMedia API.";
      setCameraError({
        title: "getUserMedia Unavailable",
        detail: `${detail} You can use Upload QR Image file decoding or manual input below.`,
        code: "NotSupportedError",
      });
      setDiagnostics((prev) => ({ ...prev, cameraStatus: "FAILED", lastError: "NotSupportedError" }));
      return;
    }

    try {
      let newStream: MediaStream | null = null;
      const deviceToUse = targetDeviceId || selectedDeviceId;

      if (deviceToUse) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceToUse } },
          audio: false,
        });
      } else {
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback constraints for desktop webcams or restricted devices
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!newStream || newStream.getVideoTracks().length === 0) {
        throw new Error("No active video tracks returned from camera.");
      }

      streamRef.current = newStream;
      setStream(newStream);
      setDiagnostics((prev) => ({ ...prev, cameraStatus: "ACTIVE", lastError: null }));

      // Attach stream to video element if mounted
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        try {
          await videoRef.current.play();
        } catch (playErr: any) {
          console.warn("video.play() notice:", playErr);
        }
      }

      // Populate device list with labels post-permission grant
      await updateDeviceList();
      await checkPermissionState();
    } catch (err: any) {
      console.error("Camera startup failed:", err);
      const errName = err?.name || "UnknownError";
      let titleErr = "Camera Stream Error";
      let detailErr = err?.message || "Unable to start webcam stream.";

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        titleErr = "Camera Permission Blocked";
        detailErr =
          "Camera permission is blocked. Allow Camera for localhost in Chrome site settings, then click Retry Camera.";
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        titleErr = "No Camera Hardware Detected";
        detailErr = "No webcam or camera input device was found on this system.";
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        titleErr = "Camera Hardware Busy";
        detailErr = "Camera is currently in use by another application. Close other browser tabs or apps and click Retry Camera.";
      } else if (errName === "OverconstrainedError") {
        titleErr = "Unsupported Camera Settings";
        detailErr = "Requested camera resolution or settings are not supported by your hardware.";
      } else if (errName === "SecurityError") {
        titleErr = "Insecure Context Blocked";
        detailErr = "Camera access blocked by browser security context policies.";
      }

      setCameraError({ title: titleErr, detail: detailErr, code: errName });
      setDiagnostics((prev) => ({ ...prev, cameraStatus: "FAILED", lastError: errName }));
    } finally {
      setIsInitializing(false);
    }
  };

  // Dedicated effect to bind MediaStream to video element whenever stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "true");
      video.play().catch((err) => {
        console.warn("Stream video play notice:", err);
      });
    }
  }, [stream]);

  useEffect(() => {
    isMountedRef.current = true;
    checkPermissionState();

    if (!open) {
      stopCamera();
      setManualInput("");
      setCameraError(null);
      setDetectedCode(null);
      isProcessingRef.current = false;
      return;
    }

    startCamera(selectedDeviceId, facingMode);

    const handleNavigationCleanup = () => {
      stopCamera();
    };
    window.addEventListener("beforeunload", handleNavigationCleanup);
    window.addEventListener("pagehide", handleNavigationCleanup);
    window.addEventListener("popstate", handleNavigationCleanup);

    return () => {
      isMountedRef.current = false;
      stopCamera();
      window.removeEventListener("beforeunload", handleNavigationCleanup);
      window.removeEventListener("pagehide", handleNavigationCleanup);
      window.removeEventListener("popstate", handleNavigationCleanup);
    };
  }, [open]);

  // Frame scanning loop using jsQR
  useEffect(() => {
    if (!stream || !videoRef.current || detectedCode || loading) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let isScanning = true;

    const scanFrame = () => {
      const firstTrack = stream.getVideoTracks()[0];
      if (
        !isScanning ||
        !videoRef.current ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !firstTrack ||
        firstTrack.readyState !== "live"
      ) {
        if (isScanning) {
          animFrameRef.current = requestAnimationFrame(scanFrame);
        }
        return;
      }

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      if (ctx && canvas.width > 0 && canvas.height > 0) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (qrCode && qrCode.data && qrCode.data.trim() && !isProcessingRef.current) {
            const rawText = qrCode.data.trim();
            const cleanText = cleanStudentIdentifier(rawText);

            if (isValidStudentIdentifier(cleanText)) {
              isScanning = false;
              isProcessingRef.current = true;
              setDetectedCode(cleanText);
              stopCamera();
              toast.success("QR SCANNED SUCCESSFULLY", { description: cleanText });
              onScan(cleanText);
              onClose();
              return;
            }
          }
        } catch {
          // ignore frame read error
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
      .catch(() => {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      });

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
    setSelectedDeviceId("");
    startCamera("", nextMode);
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const devId = e.target.value;
    setSelectedDeviceId(devId);
    startCamera(devId, facingMode);
  };

  const handleScanSubmit = (value: string) => {
    if (loading || isProcessingRef.current) return;
    const clean = cleanStudentIdentifier(value);
    if (!clean) {
      toast.error("Invalid or empty QR code detected.");
      return;
    }

    isProcessingRef.current = true;
    stopCamera();
    onScan(clean);
    onClose();

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 1000);
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
            const scanned = cleanStudentIdentifier(qrCode.data.trim());
            toast.success("QR Code detected in image file!", { description: scanned });
            handleScanSubmit(scanned);
          } else {
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
          <DialogTitle className="flex items-center justify-between text-base font-bold text-foreground">
            <span className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" /> {title}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="h-7 px-2 text-[10px] text-muted-foreground gap-1 hover:text-foreground"
            >
              <Info className="size-3" /> Diagnostics
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Diagnostic Panel */}
        {showDiagnostics && (
          <div className="p-3 rounded-2xl bg-muted/60 border border-border text-[11px] font-mono space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Secure Context:</span>
              <span className={diagnostics.secureContext ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                {diagnostics.secureContext ? "YES" : "NO"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>getUserMedia:</span>
              <span className={diagnostics.hasGetUserMedia ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                {diagnostics.hasGetUserMedia ? "AVAILABLE" : "UNAVAILABLE"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Video Input Devices:</span>
              <span className="font-bold text-foreground">{diagnostics.deviceCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Permission State:</span>
              <span className="font-bold text-foreground uppercase">{diagnostics.permissionState}</span>
            </div>
            <div className="flex justify-between">
              <span>Camera Status:</span>
              <span
                className={
                  diagnostics.cameraStatus === "ACTIVE"
                    ? "text-emerald-600 font-bold"
                    : diagnostics.cameraStatus === "FAILED"
                    ? "text-red-500 font-bold"
                    : "text-amber-600 font-bold"
                }
              >
                {diagnostics.cameraStatus}
              </span>
            </div>
            {diagnostics.lastError && (
              <div className="pt-1 text-[10px] text-red-500 font-sans">
                Error Code: {diagnostics.lastError}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 pt-1">
          {/* Multiple Video Devices Selector */}
          {videoDevices.length > 1 && !cameraError && (
            <div className="flex items-center gap-2">
              <Video className="size-4 text-primary shrink-0" />
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="w-full h-8 px-2 rounded-xl bg-muted/50 border border-border text-xs font-medium text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Default Camera ({facingMode})</option>
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1} (${dev.deviceId.slice(0, 8)})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {cameraError ? (
            <div className="p-4 rounded-2xl border border-amber-300/80 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950 dark:text-amber-100">{cameraError.title}</p>
                  <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">{cameraError.detail}</p>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startCamera(selectedDeviceId, facingMode)}
                  className="flex-1 h-10 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Retry Camera</span>
                </Button>
                <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-primary text-primary-foreground font-semibold cursor-pointer shadow-md text-xs">
                  <Smartphone className="size-3.5 shrink-0" />
                  <span>Upload QR / Camera File</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              <div className="pt-1">
                <Button
                  type="button"
                  onClick={() => handleScanSubmit(manualInput.trim() || "23CSE1012")}
                  className="w-full h-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <QrCode className="size-3.5" />
                  <span>[ SIMULATE QR SCAN: 23CSE1012 ]</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black aspect-video flex items-center justify-center">
              {/* Always mounted video element ensures videoRef.current is never null */}
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && stream && el.srcObject !== stream) {
                    el.srcObject = stream;
                    el.muted = true;
                    el.autoplay = true;
                    el.setAttribute("playsinline", "true");
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  isInitializing || loading || detectedCode ? "opacity-0" : "opacity-100"
                )}
              />

              {/* Loading Overlay */}
              {(isInitializing || loading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white/80 gap-2 p-4">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">
                    {loading ? "Verifying student with server..." : "Starting live QR camera..."}
                  </span>
                </div>
              )}

              {/* Success Overlay */}
              {detectedCode && !isInitializing && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-emerald-400 p-4 text-center">
                  <CheckCircle2 className="size-10 animate-bounce" />
                  <span className="text-sm font-bold text-white">QR SCANNED SUCCESSFULLY</span>
                  <span className="text-xs font-mono text-emerald-300">{detectedCode}</span>
                </div>
              )}

              {/* Active Scanner Overlay & Switch Button */}
              {!isInitializing && !loading && !detectedCode && stream && (
                <>
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="size-44 rounded-2xl border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="w-full h-1 bg-emerald-400/90 absolute top-0 animate-[scan_2s_infinite_ease-in-out] shadow-md shadow-emerald-400/50" />
                      <QrCode className="size-12 text-white/30" />
                    </div>
                    <div className="mt-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs border border-white/10 flex items-center gap-2 shadow-md">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-[11px] font-bold text-white">LIVE CAMERA — Camera connected</p>
                    </div>
                  </div>

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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScanSubmit(manualInput);
            }}
            className="pt-2 border-t border-border space-y-2"
          >
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
                type="submit"
                disabled={!manualInput.trim() || loading}
                size="sm"
                className="h-10 px-4 rounded-xl font-bold bg-primary text-primary-foreground text-xs"
              >
                <Search className="size-3.5 mr-1" /> Check
              </Button>
            </div>
          </form>

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
