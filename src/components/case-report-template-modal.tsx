import { useState, useMemo } from "react";
import {
  Printer,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Eye,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Report } from "@/lib/cmadms-data";
import { useAuth } from "@/lib/auth";
import {
  sampleCaseReportTemplate,
  blankCaseReportTemplate,
  generateCaseReportHtml,
  printCaseReport,
} from "@/lib/case-report-template-html";

interface CaseReportTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports?: Report[];
  defaultReport?: Report;
}

export function CaseReportTemplateModal({
  open,
  onOpenChange,
  reports = [],
  defaultReport,
}: CaseReportTemplateModalProps) {
  const { profile } = useAuth();
  const activeFacultyName = profile?.full_name || "Prof. Ravi Kumar";

  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("sample");

  // Determine active report data for preview
  const currentReport: Report = useMemo(() => {
    if (defaultReport) return defaultReport;
    if (selectedTemplateKey === "sample") return sampleCaseReportTemplate;
    if (selectedTemplateKey === "blank") return blankCaseReportTemplate;
    const found = reports.find((r) => r.id === selectedTemplateKey);
    return found || sampleCaseReportTemplate;
  }, [selectedTemplateKey, reports, defaultReport]);

  const previewHtml = useMemo(() => {
    return generateCaseReportHtml(currentReport, {
      generatedBy: activeFacultyName,
      portalSubtitle: "Unauthorized Movement — Counselor Case Review & Actions",
    });
  }, [currentReport, activeFacultyName]);

  const handlePrint = () => {
    try {
      printCaseReport(currentReport, { generatedBy: activeFacultyName });
      toast.success(`Printing Case Report ${currentReport.id}...`);
    } catch (err: any) {
      toast.error(err.message || "Failed to open print dialog");
    }
  };



  const handleExportCsv = () => {
    try {
      const headers = [
        "Case Report ID",
        "Student Name",
        "Roll Number",
        "Department",
        "Year & Section",
        "Scheduled Class",
        "Class Time Slot",
        "Assigned Room",
        "Incident Time",
        "Observed Location",
        "Reported By",
        "Remarks",
        "Status",
        "Decision Note",
      ];
      const row = [
        `"${currentReport.id}"`,
        `"${currentReport.studentName}"`,
        `"${currentReport.studentId}"`,
        `"${currentReport.department}"`,
        `"${currentReport.yearSection}"`,
        `"${currentReport.className}"`,
        `"${currentReport.scheduledTime}"`,
        `"${currentReport.room}"`,
        `"${currentReport.incidentTime}"`,
        `"${currentReport.location}"`,
        `"${currentReport.reportedBy}"`,
        `"${(currentReport.remarks || "").replace(/"/g, '""')}"`,
        `"${currentReport.status}"`,
        `"${(currentReport.resolutionNote || currentReport.decision || "").replace(/"/g, '""')}"`,
      ];
      const csvContent = "\uFEFF" + headers.join(",") + "\n" + row.join(",") + "\n";
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `case_report_${currentReport.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded case_report_${currentReport.id}.csv`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export CSV");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden border-border bg-card">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-semibold">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Official Case Report Template
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Standardized CMADMS academic discipline &amp; student movement audit document.
              </DialogDescription>
            </div>
          </div>

          {!defaultReport && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Template Data:
              </span>
              <Select value={selectedTemplateKey} onValueChange={setSelectedTemplateKey}>
                <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border w-[220px]">
                  <SelectValue placeholder="Select report data" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="sample" className="text-xs font-semibold text-primary">
                    ★ Reference Sample (RPT-982727)
                  </SelectItem>
                  <SelectItem value="blank" className="text-xs">
                    📄 Blank Template
                  </SelectItem>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      #{r.id} — {r.studentName} ({r.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Live Interactive Preview */}
        <div className="flex-1 bg-slate-900/10 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
          <div className="w-full h-full rounded-xl border border-border shadow-inner bg-white overflow-hidden">
            <iframe
              title="Case Report Preview"
              srcDoc={previewHtml}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>

        {/* Modal Footer / Action Toolbar */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span className="hidden sm:inline">
              Official CMADMS Faculty Academic Oversight Format (A4 &bull; Print Ready)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-border"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Button>


            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs px-4"
            >
              <Printer className="size-3.5" />
              <span>Print / Save as PDF</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
