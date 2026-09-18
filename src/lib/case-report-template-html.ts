import type { Report } from "@/lib/cmadms-data";

export const sampleCaseReportTemplate: Report = {
  id: "RPT-982727",
  studentName: "Ashok Dora",
  studentId: "23CSE1012",
  department: "CSE",
  departmentHod: "Dr. Anjali Rao",
  yearSection: "3rd Year • Section A",
  className: "Database Management Systems",
  scheduledTime: "10:00 — 11:00",
  room: "Room E-102",
  incidentTime: "10:39 am",
  location: "Corridor",
  remarks: "the student is at outside",
  evidence: undefined,
  reportedBy: "Dr. Rajesh Sharma",
  createdAt: "2026-09-10 05:09:42.801306+00",
  explanationDeadline: "2026-09-11 05:09:42.801306+00",
  status: "resolved",
  semester: 5,
  explanation: undefined,
  decision: "RESOLVED_BY_COUNSELOR",
  resolutionNote: "Case reviewed and resolved by Class Counselor.",
  resolvedBy: "Prof. Ravi Kumar",
  timeline: [
    {
      time: "10 Sept 2026, 10:39 am",
      title: "Violation Reported",
      detail: "Reported by Dr. Rajesh Sharma at Corridor",
      tone: "violation",
    },
    {
      time: "10 Sept 2026, 10:39 am",
      title: "Case Resolved by Counselor",
      detail: "Resolution Note: Case reviewed and resolved by Class Counselor.",
      tone: "resolved",
    },
  ],
};

export const blankCaseReportTemplate: Report = {
  id: "RPT-[ID_NUMBER]",
  studentName: "[Student Full Name]",
  studentId: "[Roll Number / ID]",
  department: "[Department e.g. CSE]",
  departmentHod: "[Department HOD Name]",
  yearSection: "[Year e.g. 3rd Year • Section A]",
  className: "[Course / Subject Name]",
  scheduledTime: "[Start Time — End Time]",
  room: "[Room / Lab Number]",
  incidentTime: "[Time of Incident]",
  location: "[Observed Location / Zone]",
  remarks: "[Faculty / Guard Observation Remarks]",
  evidence: undefined,
  reportedBy: "[Reporting Faculty Name]",
  createdAt: new Date().toISOString(),
  explanationDeadline: new Date(Date.now() + 86400000).toISOString(),
  status: "pending",
  semester: 1,
  explanation: undefined,
  decision: undefined,
  resolutionNote: undefined,
  timeline: [
    {
      time: "Today",
      title: "Violation Reported",
      detail: "Reported by Faculty at Observed Location",
      tone: "violation",
    },
  ],
};

export interface GenerateReportHtmlOptions {
  generatedBy?: string;
  generatedAt?: string;
  portalSubtitle?: string;
}

export function generateCaseReportHtml(
  report: Report,
  options?: GenerateReportHtmlOptions
): string {
  const generatedBy = options?.generatedBy || "Prof. Ravi Kumar";
  const generatedAt =
    options?.generatedAt ||
    new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  const portalSubtitle =
    options?.portalSubtitle || "Unauthorized Movement — Counselor Case Review & Actions";

  const isResolved =
    report.status === "resolved" ||
    report.status === "Exonerated" ||
    report.decision === "RESOLVED_BY_COUNSELOR" ||
    report.decision === "exonerated";
  const isEscalated =
    report.status === "Escalated" ||
    (report.status as string) === "escalated" ||
    (report.status as string) === "escalated_to_hod" ||
    Boolean(report.escalationReason);

  // Status badge config
  let statusBadgeTitle = "Under Investigation";
  let statusBadgeSub = "Active Window";
  let statusBadgeBg = "#fef3c7";
  let statusBadgeBorder = "#fde68a";
  let statusBadgeColor = "#b45309";
  let statusIconSvg = `<path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  if (isResolved) {
    statusBadgeTitle =
      report.decision === "RESOLVED_BY_COUNSELOR" || report.resolutionNote
        ? "Resolved by Counselor"
        : "Case Exonerated / Closed";
    statusBadgeSub = "Case Closed";
    statusBadgeBg = "#f0fdf4";
    statusBadgeBorder = "#bbf7d0";
    statusBadgeColor = "#16a34a";
    statusIconSvg = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4 12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (isEscalated) {
    statusBadgeTitle = "Escalated to HOD";
    statusBadgeSub = "Department Action Required";
    statusBadgeBg = "#fee2e2";
    statusBadgeBorder = "#fecaca";
    statusBadgeColor = "#dc2626";
    statusIconSvg = `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Timeline render
  const timelineItems =
    report.timeline && report.timeline.length > 0
      ? report.timeline
      : [
          {
            time: report.createdAt || "Incident Time",
            title: "Violation Reported",
            detail: `Reported by ${report.reportedBy} at ${report.location}`,
            tone: "violation" as const,
          },
        ];

  const timelineHtml = timelineItems
    .map((item, idx) => {
      const isViolation = item.tone === "violation";
      const isResolvedTone = item.tone === "resolved";
      const dotColor = isResolvedTone ? "#22c55e" : isViolation ? "#f97316" : "#3b82f6";
      const isLast = idx === timelineItems.length - 1;

      return `
      <div style="position:relative;display:flex;gap:12px;margin-bottom:${isLast ? "0" : "14px"};">
        ${
          !isLast
            ? `<div style="position:absolute;left:7px;top:18px;bottom:-14px;width:1.5px;background:#e2e8f0;"></div>`
            : ""
        }
        <div style="width:16px;height:16px;border-radius:50%;border:2.5px solid ${dotColor};background:#ffffff;margin-top:2px;flex-shrink:0;z-index:2;"></div>
        <div style="font-size:12px;">
          <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:1px;">${item.time}</div>
          <div style="font-weight:700;color:#0f172a;">${item.title}</div>
          ${item.detail ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${item.detail}</div>` : ""}
        </div>
      </div>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Case Report ${report.id} — CMADMS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
      line-height: 1.45;
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }
    .report-container {
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 28px;
      background: #ffffff;
    }
    /* HEADER */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 1.5px solid #2563eb;
      margin-bottom: 20px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-shield {
      width: 44px;
      height: 44px;
      background: #1d4ed8;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(29, 78, 216, 0.25);
    }
    .brand-text h1 {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
      line-height: 1.1;
    }
    .brand-text p {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
      line-height: 1.25;
    }
    .brand-right {
      text-align: right;
    }
    .brand-right .slogan {
      font-size: 11px;
      font-weight: 700;
      color: #1d4ed8;
      letter-spacing: 0.2px;
      border-top: 2px solid #2563eb;
      padding-top: 3px;
    }
    .brand-right .portal-name {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 3px;
    }

    /* TITLE BAR */
    .case-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
    }
    .case-title-left h2 {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .case-title-left .case-id {
      font-size: 24px;
      font-weight: 900;
      color: #1d4ed8;
      margin-left: 6px;
    }
    .case-title-left .case-subtitle {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      margin-top: 4px;
    }

    .case-title-right {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 12px;
      background: ${statusBadgeBg};
      border: 1px solid ${statusBadgeBorder};
      color: ${statusBadgeColor};
    }
    .status-badge svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .status-badge-title {
      font-size: 12px;
      font-weight: 800;
      line-height: 1.2;
    }
    .status-badge-sub {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.85;
    }

    .meta-box {
      font-size: 11px;
      color: #64748b;
      line-height: 1.35;
      text-align: right;
    }
    .meta-box strong {
      color: #0f172a;
      font-weight: 700;
      display: block;
    }

    /* SECTION CARDS */
    .section-card {
      border: 1px solid #dbeafe;
      border-radius: 12px;
      margin-bottom: 14px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      page-break-inside: avoid;
    }
    .section-header {
      background: #eff6ff;
      border-bottom: 1px solid #dbeafe;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1d4ed8;
    }
    .section-header svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    .section-header h3 {
      font-size: 13px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.1px;
    }
    .section-body {
      padding: 12px 16px;
    }

    /* GRID FACTS */
    .facts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 32px;
      row-gap: 8px;
    }
    .fact-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 5px;
    }
    .fact-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .fact-value {
      font-size: 12px;
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }

    /* CALLOUT BOXES */
    .callout-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #1e293b;
      line-height: 1.4;
    }
    .callout-box.muted {
      color: #64748b;
    }
    .callout-box.highlight-green {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #14532d;
    }

    /* TWO COLUMNS AT BOTTOM */
    .two-col-row {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    /* FOOTER */
    .report-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1.5px solid #2563eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10.5px;
      color: #64748b;
      line-height: 1.35;
    }
    .report-footer strong {
      color: #0f172a;
      font-weight: 800;
    }

    @media print {
      body {
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .report-container {
        padding: 0 !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">

    <!-- 1. TOP HEADER -->
    <div class="top-header">
      <div class="brand-left">
        <div class="logo-shield">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1>CMADMS</h1>
          <p>Campus Movement &amp; Administration<br/>Digital Management System</p>
        </div>
      </div>
      <div class="brand-right">
        <div class="slogan">Safe Campus • Responsible Tomorrow</div>
        <div class="portal-name">Faculty Portal • Academic Oversight</div>
      </div>
    </div>

    <!-- 2. CASE TITLE & SUMMARY -->
    <div class="case-title-row">
      <div class="case-title-left">
        <h2>CASE REPORT <span class="case-id">${report.id}</span></h2>
        <div class="case-subtitle">${portalSubtitle}</div>
      </div>
      <div class="case-title-right">
        <div class="status-badge">
          <svg viewBox="0 0 24 24" fill="none">
            ${statusIconSvg}
          </svg>
          <div>
            <div class="status-badge-title">${statusBadgeTitle}</div>
            <div class="status-badge-sub">${statusBadgeSub}</div>
          </div>
        </div>
        <div class="meta-box">
          <div>Report Generated</div>
          <strong>${generatedAt}</strong>
          <div style="margin-top:4px;">Generated By</div>
          <strong>${generatedBy}</strong>
          <div style="font-size:10px;">Faculty Portal</div>
        </div>
      </div>
    </div>

    <!-- 3. STUDENT INFORMATION -->
    <div class="section-card">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <h3>Student Information</h3>
      </div>
      <div class="section-body">
        <div class="facts-grid">
          <div class="fact-row">
            <span class="fact-label">Student Name</span>
            <span class="fact-value">${report.studentName || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Roll Number</span>
            <span class="fact-value">${report.studentId || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Department</span>
            <span class="fact-value">${report.department || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Year &amp; Section</span>
            <span class="fact-value">${report.yearSection || "—"}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. INCIDENT DETAILS -->
    <div class="section-card">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <h3>Incident Details</h3>
      </div>
      <div class="section-body">
        <div class="facts-grid">
          <div class="fact-row">
            <span class="fact-label">Incident Time</span>
            <span class="fact-value">${report.incidentTime || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Observed Location</span>
            <span class="fact-value">${report.location || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Reported By</span>
            <span class="fact-value">${report.reportedBy || "Faculty"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Report Date</span>
            <span class="fact-value" style="font-family:monospace;font-size:11px;">${report.createdAt || "—"}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. TIMETABLE SCHEDULE -->
    <div class="section-card">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2v4m8-4v4"/>
          <rect width="18" height="18" x="3" y="4" rx="2"/>
          <path d="M3 10h18"/>
          <circle cx="12" cy="14" r="2"/>
        </svg>
        <h3>Timetable Schedule</h3>
      </div>
      <div class="section-body">
        <div class="facts-grid">
          <div class="fact-row">
            <span class="fact-label">Scheduled Class</span>
            <span class="fact-value">${report.className || "No Class Scheduled"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Class Time Slot</span>
            <span class="fact-value">${report.scheduledTime || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Assigned Room</span>
            <span class="fact-value">${report.room || "—"}</span>
          </div>
          <div class="fact-row">
            <span class="fact-label">Classroom Attendance</span>
            <span class="fact-value" style="color:#dc2626;">Marked Absent</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. FACULTY REPORT REMARKS -->
    <div class="section-card">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
        <h3>Faculty Report Remarks</h3>
      </div>
      <div class="section-body">
        <div class="callout-box">
          "${report.remarks || "No additional remarks noted by reporting faculty."}"
        </div>
      </div>
    </div>

    <!-- 7. FACULTY INCIDENT EVIDENCE PHOTO / FILE -->
    <div class="section-card">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
        <h3>Faculty Incident Evidence Photo / File</h3>
      </div>
      <div class="section-body">
        ${
          report.evidence
            ? report.evidence.startsWith("data:")
              ? `<div style="text-align:center;padding:8px 0;"><img src="${report.evidence}" alt="Evidence Photo" style="max-height:240px;max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" /></div>`
              : `<div class="callout-box"><strong>Attached File Record:</strong> ${report.evidence}</div>`
            : `<div class="callout-box muted">No evidence photos attached by faculty to this incident report.</div>`
        }
      </div>
    </div>

    <!-- 8. STUDENT 24-HOUR EXPLANATION -->
    <div class="section-card">
      <div class="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Student 24-Hour Explanation &amp; Supporting Evidence</h3>
      </div>
      <div class="section-body">
        ${
          report.explanation
            ? `<div class="callout-box"><strong>Student Statement:</strong> "${report.explanation}"</div>`
            : `<div class="callout-box muted">Awaiting student explanation (24-hour response window active).</div>`
        }
      </div>
    </div>

    <!-- 9. AUDIT TIMELINE & COUNSELOR RESOLUTION -->
    <div class="two-col-row">
      <!-- Left: Timeline -->
      <div class="section-card" style="margin-bottom:0;">
        <div class="section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
          <h3>Case Audit Timeline</h3>
        </div>
        <div class="section-body">
          ${timelineHtml}
        </div>
      </div>

      <!-- Right: Counselor Resolution / Decision -->
      <div class="section-card" style="margin-bottom:0;">
        <div class="section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <h3>Counselor Case Resolution &amp; Decision</h3>
        </div>
        <div class="section-body">
          <div class="callout-box highlight-green">
            <div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:11px;color:#16a34a;margin-bottom:4px;letter-spacing:0.3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              ${
                report.decision && report.decision !== "RESOLVED_BY_COUNSELOR"
                  ? `DECISION: ${String(report.decision).toUpperCase()}`
                  : "DECISION RECORDED BY COUNSELOR"
              }
            </div>
            <div style="font-size:12px;font-weight:600;color:#0f172a;line-height:1.4;">
              ${report.resolutionNote || "Case reviewed and resolved by Class Counselor."}
            </div>
            ${
              report.resolvedBy
                ? `<div style="font-size:10.5px;color:#475569;margin-top:6px;border-top:1px solid #bbf7d0;padding-top:4px;"><strong>Resolved by:</strong> ${report.resolvedBy}</div>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>

    <!-- 10. FOOTER -->
    <div class="report-footer">
      <div>
        <strong>CMADMS</strong><br/>
        Campus Movement &amp; Administration Digital Management System<br/>
        &copy; 2026 CMADMS. All rights reserved.
      </div>
      <div style="text-align:right;">
        Generated on: ${generatedAt}<br/>
        <strong>Page 1 of 1</strong>
      </div>
    </div>

  </div>

  <script>
    window.onload = function() {
      // Automatic trigger if launched directly with ?print=true
      if (window.location.search.indexOf('print=true') !== -1) {
        window.print();
      }
    };
  </script>
</body>
</html>`;
}

/**
 * Trigger instant print popup for a given report
 */
export function printCaseReport(report: Report, options?: GenerateReportHtmlOptions) {
  const html = generateCaseReportHtml(report, options);
  const printWin = window.open("", "_blank", "width=900,height=800");
  if (!printWin) {
    throw new Error("Popup blocked! Please allow popups to print/export the Case Report.");
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch (e) {
      console.error("Print invocation error:", e);
    }
  }, 250);
}

/**
 * Trigger direct file download of the case report template as standalone HTML
 */
export function downloadCaseReportHtml(
  report: Report,
  options?: GenerateReportHtmlOptions,
  filename?: string
) {
  const html = generateCaseReportHtml(report, options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `case_report_${report.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
