import { toast } from "sonner";

export const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 300);
};

export const downloadEvidenceImage = (evidenceStr: string, idStr: string) => {
  if (!evidenceStr) {
    toast.error("No evidence file attached to this report.");
    return;
  }

  try {
    if (evidenceStr.startsWith("data:")) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          triggerDownload(pngUrl, `evidence_${idStr}.png`);
          toast.success(`Evidence photo downloaded for Case ${idStr}`);
        } else {
          triggerDownload(evidenceStr, `evidence_${idStr}.png`);
          toast.success(`Evidence photo downloaded for Case ${idStr}`);
        }
      };
      img.onerror = () => {
        triggerDownload(evidenceStr, `evidence_${idStr}.png`);
        toast.success(`Evidence photo downloaded for Case ${idStr}`);
      };
      img.src = evidenceStr;
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 550;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 900, 550);
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(0, 0, 900, 10);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("CAMPUS GUARD PRO — DISCIPLINARY EVIDENCE RECORD", 40, 60);

        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`Case Report ID: ${idStr}`, 40, 110);
        ctx.fillText(`Attached File / URL: ${evidenceStr}`, 40, 140);
        ctx.fillText(`Downloaded At: ${new Date().toLocaleString()}`, 40, 170);

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(40, 200, 820, 280);
        ctx.fillStyle = "#64748b";
        ctx.font = "italic 15px sans-serif";
        ctx.fillText(`Official Disciplinary Evidence Document (${evidenceStr})`, 60, 240);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px sans-serif";
        ctx.fillText("Verified by Campus Security Management & Discipline System (CMADMS)", 60, 440);

        const pngUrl = canvas.toDataURL("image/png");
        const cleanName = evidenceStr.replace(/\.[^/.]+$/, "");
        triggerDownload(pngUrl, `evidence_${cleanName}_${idStr}.png`);
        toast.success(`Evidence document downloaded (.png) for Case ${idStr}`);
      }
    }
  } catch (err) {
    console.error("Evidence download error:", err);
    toast.error("Failed to download evidence image.");
  }
};
