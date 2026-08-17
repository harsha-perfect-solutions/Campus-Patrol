import React, { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standard-compliant SVG QR Code component.
 * Encodes values into real, scannable QR Codes using standard Reed-Solomon error correction.
 * Can be scanned by any smartphone camera app, Google Lens, or hardware scanner.
 */
export function QRCode({ value, size = 160, className = "" }: QRCodeProps) {
  const [svgString, setSvgString] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCodeLib.toString(
      value,
      {
        type: "svg",
        margin: 1,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      },
      (err, result) => {
        if (!err && result && isMounted) {
          setSvgString(result);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, [value]);

  return (
    <div
      className={`inline-block bg-white p-2 rounded-xl shadow-xs border border-slate-200 ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      {svgString ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgString }}
          style={{ width: size, height: size }}
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded-lg"
        >
          Generating QR...
        </div>
      )}
    </div>
  );
}
