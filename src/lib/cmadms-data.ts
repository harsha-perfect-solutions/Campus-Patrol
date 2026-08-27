import type { AppRole } from "@/lib/auth";

export type MovementReason =
  | "Library"
  | "Laboratory"
  | "Medical"
  | "HOD Official Duty"
  | "Placement"
  | "NSS"
  | "NCC"
  | "Sports"
  | "Other";

export type PermissionStatus = "Pending" | "Approved" | "Rejected" | "Expired" | "Cancelled";

export type MovementPermissionRecord = {
  id: string;
  studentName: string;
  studentId: string;
  reason: MovementReason;
  date: string;
  validFrom: string;
  validUntil: string;
  status: PermissionStatus;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportStatus =
  | "Reported"
  | "Student Notified"
  | "Awaiting Explanation"
  | "Explanation Submitted"
  | "Under Review"
  | "Exonerated"
  | "Warning"
  | "Escalated"
  | "pending"
  | "review"
  | "resolved";

export type Student = {
  id: string;
  name: string;
  department: string;
  year: string;
  section: string;
  semester: number;
  status: "Active" | "Inactive";
};

export type ClassSlot = {
  subject: string;
  code: string;
  start: string;
  end: string;
  room: string;
  faculty: string;
  batch: string;
};

export type Permission = {
  reason: string;
  issuedBy: string;
  validUntil: string;
};

export type TimelineEvent = {
  time: string;
  title: string;
  detail?: string | undefined;
  tone: "info" | "violation" | "resolved" | "pending";
};

export type Report = {
  id: string;
  studentName: string;
  studentId: string;
  department: string;
  departmentHod: string;
  yearSection: string;
  className: string;
  scheduledTime: string;
  room: string;
  incidentTime: string;
  createdAt: string; // ISO or date string
  explanationDeadline: string; // ISO string = createdAt + 24 Hours
  location: string;
  remarks: string;
  evidence?: string | undefined;
  reportedBy: string;
  status: ReportStatus;
  explanation?: string | undefined;
  explanationSubmittedAt?: string | undefined;
  decision?: string | undefined;
  decisionBy?: string | undefined;
  decisionAt?: string | undefined;
  timeline: TimelineEvent[];
  semester: number;
  assignedCounselorId?: string | undefined;
  counselorRemarks?: string | undefined;
  counselorReviewedAt?: string | undefined;
  escalationReason?: string | undefined;
  escalatedAt?: string | undefined;
  resolutionNote?: string | undefined;
  resolvedBy?: string | undefined;
  resolvedAt?: string | undefined;
};

export type NotificationTargetRole = "faculty" | "student" | "hod" | "admin" | "all";

export type Notification = {
  id: string;
  recipientRole: NotificationTargetRole;
  recipientId?: string | undefined;
  department?: string | undefined;
  title: string;
  detail: string;
  time: string;
  tone: "violation" | "pending" | "resolved" | "info";
  read: boolean;
  relatedReportId?: string | undefined;
};

export type AuditLogRecord = {
  id: string;
  actor: string;
  actorRole: AppRole;
  action: string;
  target: string;
  targetId?: string | undefined;
  timestamp: string;
  metadata?: Record<string, any> | undefined;
};

export type SemesterRecord = {
  id: string;
  name: string;
  academicYear: string;
  semesterNumber: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export const faculty = {
  name: "Prof. Ravi Kumar",
  id: "FAC-CSE-114",
  role: "Faculty",
  department: "Computer Science & Engineering",
  initials: "RK",
};

export const hodByDepartment: Record<string, { name: string; email: string }> = {
  CSE: { name: "Dr. Anjali Rao", email: "hod.cse@cmadms.edu" },
  ECE: { name: "Dr. S. Venkat", email: "hod.ece@cmadms.edu" },
  MECH: { name: "Dr. P. K. Sharma", email: "hod.mech@cmadms.edu" },
  EEE: { name: "Dr. R. Ramakrishnan", email: "hod.eee@cmadms.edu" },
  CIVIL: { name: "Dr. M. K. Varma", email: "hod.civil@cmadms.edu" },
  IT: { name: "Dr. N. Swaminathan", email: "hod.it@cmadms.edu" },
  AIML: { name: "Dr. K. V. Sharma", email: "hod.aiml@cmadms.edu" },
};

export const seedSemesters: SemesterRecord[] = [
  {
    id: "sem-6",
    name: "Spring 2026",
    academicYear: "2025-2026",
    semesterNumber: 6,
    startDate: "2026-01-05",
    endDate: "2026-05-30",
    isActive: true,
  },
  {
    id: "sem-5",
    name: "Fall 2025",
    academicYear: "2025-2026",
    semesterNumber: 5,
    startDate: "2025-08-01",
    endDate: "2025-12-20",
    isActive: false,
  },
];

export const students: Student[] = [
  {
    id: "23CSE1012",
    name: "Ashok Dora",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    semester: 6,
    status: "Active",
  },
  {
    id: "23CSE1044",
    name: "Meera Nair",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    semester: 6,
    status: "Active",
  },
  {
    id: "23ECE2031",
    name: "Karthik Reddy",
    department: "ECE",
    year: "2nd Year",
    section: "Section B",
    semester: 4,
    status: "Active",
  },
  {
    id: "22MEC3007",
    name: "Sneha Patil",
    department: "MECH",
    year: "4th Year",
    section: "Section C",
    semester: 8,
    status: "Active",
  },
];

export const seedPermissions: MovementPermissionRecord[] = [
  {
    id: "PERM-101",
    studentName: "Meera Nair",
    studentId: "23CSE1044",
    reason: "Library",
    date: "2026-08-11",
    validFrom: "10:00 AM",
    validUntil: "11:30 AM",
    status: "Approved",
    approvedBy: "Dr. Anjali Rao",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "PERM-102",
    studentName: "Karthik Reddy",
    studentId: "23ECE2031",
    reason: "Medical",
    date: "2026-08-11",
    validFrom: "10:00 AM",
    validUntil: "10:45 AM",
    status: "Approved",
    approvedBy: "Dr. S. Venkat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const currentClassByStudent: Record<string, ClassSlot | null> = {
  "23CSE1012": {
    subject: "Data Structures",
    code: "CS-304",
    start: "10:00 AM",
    end: "11:00 AM",
    room: "Room C-204",
    faculty: "Prof. Ravi Kumar",
    batch: "CSE-A",
  },
  "23CSE1044": {
    subject: "Database Management",
    code: "CS-306",
    start: "10:00 AM",
    end: "11:00 AM",
    room: "Room B-102",
    faculty: "Dr. Anjali Rao",
    batch: "CSE-A",
  },
  "23ECE2031": {
    subject: "Signals & Systems",
    code: "EC-204",
    start: "10:00 AM",
    end: "11:00 AM",
    room: "Room E-110",
    faculty: "Dr. S. Venkat",
    batch: "ECE-B",
  },
  "23CSE1101": {
    subject: "Data Structures Lab",
    code: "CS-304L",
    start: "02:00 PM",
    end: "04:00 PM",
    room: "Lab C-204",
    faculty: "Prof. Ravi Kumar",
    batch: "CSE-A",
  },
  "23CSE1102": {
    subject: "Data Structures Lab",
    code: "CS-304L",
    start: "02:00 PM",
    end: "04:00 PM",
    room: "Lab C-204",
    faculty: "Prof. Ravi Kumar",
    batch: "CSE-A",
  },
  "23CSE1103": {
    subject: "Operating Systems",
    code: "CS-308",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room C-206",
    faculty: "Prof. Ravi Kumar",
    batch: "CSE-B",
  },
  "23CSE1104": {
    subject: "Operating Systems",
    code: "CS-308",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room C-206",
    faculty: "Prof. Ravi Kumar",
    batch: "CSE-B",
  },
  "23CSE1105": {
    subject: "Computer Networks",
    code: "CS-310",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room C-207",
    faculty: "Dr. Anjali Rao",
    batch: "CSE-C",
  },
  "23ECE2101": {
    subject: "Signals & Systems",
    code: "EC-301",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room E-201",
    faculty: "Dr. S. Venkat",
    batch: "ECE-A",
  },
  "23ECE2102": {
    subject: "Signals & Systems",
    code: "EC-301",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room E-201",
    faculty: "Dr. S. Venkat",
    batch: "ECE-A",
  },
  "23ECE2103": {
    subject: "Microprocessors",
    code: "EC-305",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room E-203",
    faculty: "Dr. S. Venkat",
    batch: "ECE-B",
  },
  "23ECE4777": {
    subject: "Signals & Systems",
    code: "EC-301",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room E-201",
    faculty: "Dr. S. Venkat",
    batch: "ECE-A",
  },
  "23EEE1101": {
    subject: "Power Systems",
    code: "EE-301",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room EE-201",
    faculty: "Dr. R. Ramakrishnan",
    batch: "EEE-A",
  },
  "23MECH1101": {
    subject: "Thermodynamics",
    code: "ME-301",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room M-201",
    faculty: "Dr. P. K. Sharma",
    batch: "MECH-A",
  },
  "24MECH0301": {
    subject: "Engineering Mechanics",
    code: "ME-201",
    start: "02:00 PM",
    end: "03:30 PM",
    room: "Room M-101",
    faculty: "Dr. P. K. Sharma",
    batch: "MECH-A",
  },
  "22MEC3007": null,
};

export const permissionByStudent: Record<string, Permission | undefined> = {
  "23CSE1044": {
    reason: "Library — reference book issue",
    issuedBy: "Dr. Anjali Rao",
    validUntil: "11:30 AM",
  },
  "23ECE2031": {
    reason: "Medical room visit",
    issuedBy: "Dr. S. Venkat",
    validUntil: "10:45 AM",
  },
};

export const locations = [
  "Main Corridor — Block C",
  "Library Corridor",
  "Canteen & Cafeteria",
  "Sports Ground",
  "Parking Area",
  "Administrative Block",
  "Hostel Gate",
];

export const timetable: Record<string, ClassSlot[]> = {
  Today: [
    {
      subject: "Data Structures",
      code: "CS-304",
      start: "09:00 AM",
      end: "10:00 AM",
      room: "Room C-204",
      faculty: faculty.name,
      batch: "CSE-A",
    },
    {
      subject: "Data Structures Lab",
      code: "CS-304L",
      start: "10:00 AM",
      end: "11:00 AM",
      room: "Room C-204",
      faculty: faculty.name,
      batch: "CSE-A",
    },
    {
      subject: "Database Management",
      code: "CS-306",
      start: "11:00 AM",
      end: "12:00 PM",
      room: "Room B-102",
      faculty: faculty.name,
      batch: "CSE-B",
    },
    {
      subject: "Operating Systems",
      code: "CS-308",
      start: "02:00 PM",
      end: "03:00 PM",
      room: "Room C-206",
      faculty: faculty.name,
      batch: "CSE-A",
    },
  ],
};

const now = new Date();
const deadlineDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

export const seedReports: Report[] = [
  {
    id: "V-20260810-101",
    studentName: "Ashok Dora",
    studentId: "23CSE1012",
    department: "CSE",
    departmentHod: "Dr. Anjali Rao",
    yearSection: "3rd Year • Section A",
    className: "Data Structures",
    scheduledTime: "10:00 AM — 11:00 AM",
    room: "Room C-204",
    incidentTime: "10:42 AM",
    createdAt: now.toISOString(),
    explanationDeadline: deadlineDate.toISOString(),
    location: "Main Corridor — Block C",
    remarks:
      "Student observed roaming near cafeteria during scheduled Data Structures session without gate pass.",
    reportedBy: "Prof. Ravi Kumar",
    status: "Awaiting Explanation",
    timeline: [
      {
        time: "10:42 AM",
        title: "Violation reported",
        detail: "Prof. Ravi Kumar",
        tone: "violation",
      },
      {
        time: "10:43 AM",
        title: "Student notified",
        detail: "24-hour explanation window opened",
        tone: "info",
      },
    ],
    semester: 6,
  },
  {
    id: "V-20260810-102",
    studentName: "Meera Nair",
    studentId: "23CSE1044",
    department: "CSE",
    departmentHod: "Dr. Anjali Rao",
    yearSection: "3rd Year • Section A",
    className: "Database Management",
    scheduledTime: "10:00 AM — 11:00 AM",
    room: "Room B-102",
    incidentTime: "10:15 AM",
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    explanationDeadline: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(),
    location: "Library Corridor",
    remarks: "Observed near library corridor.",
    explanation: "Sent by Lab Assistant to collect reference components for lab practical.",
    explanationSubmittedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    reportedBy: "Prof. Ravi Kumar",
    status: "Explanation Submitted",
    timeline: [
      {
        time: "08:15 AM",
        title: "Violation reported",
        detail: "Prof. Ravi Kumar",
        tone: "violation",
      },
      {
        time: "09:15 AM",
        title: "Explanation submitted",
        detail: "Library reference book collection",
        tone: "info",
      },
    ],
    semester: 6,
  },
  {
    id: "V-20260810-103",
    studentName: "Karthik Reddy",
    studentId: "23ECE2031",
    department: "ECE",
    departmentHod: "Dr. S. Venkat",
    yearSection: "2nd Year • Section B",
    className: "Signals & Systems",
    scheduledTime: "10:00 AM — 11:00 AM",
    room: "Room E-110",
    incidentTime: "10:30 AM",
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    explanationDeadline: new Date(now.getTime() + 21 * 60 * 60 * 1000).toISOString(),
    location: "Administrative Block",
    remarks: "Found near administrative block during lecture hour.",
    reportedBy: "Prof. Suresh",
    status: "Awaiting Explanation",
    timeline: [
      { time: "10:30 AM", title: "Violation reported", detail: "Prof. Suresh", tone: "violation" },
    ],
    semester: 4,
  },
];

export const seedNotifications: Notification[] = [
  {
    id: "N-101",
    recipientRole: "student",
    recipientId: "23CSE1012",
    title: "Violation Reported",
    detail: "Case V-20260810-101 for Data Structures. Submit explanation within 24 hours.",
    time: "10:43 AM",
    tone: "violation",
    read: false,
    relatedReportId: "V-20260810-101",
  },
  {
    id: "N-102",
    recipientRole: "hod",
    title: "New Violation Case",
    detail: "Ashok Dora (23CSE1012) reported by Prof. Ravi Kumar.",
    time: "10:42 AM",
    tone: "pending",
    read: false,
    relatedReportId: "V-20260810-101",
  },
  {
    id: "N-103",
    recipientRole: "faculty",
    title: "Report Submitted",
    detail: "Case V-20260810-101 recorded successfully.",
    time: "10:42 AM",
    tone: "info",
    read: true,
    relatedReportId: "V-20260810-101",
  },
];

export const seedAuditLogs: AuditLogRecord[] = [
  {
    id: "AUD-101",
    actor: "Prof. Ravi Kumar",
    actorRole: "faculty",
    action: "VERIFY_STUDENT",
    target: "Student 23CSE1012",
    targetId: "23CSE1012",
    timestamp: "2026-08-11T10:41:00Z",
  },
  {
    id: "AUD-102",
    actor: "Prof. Ravi Kumar",
    actorRole: "faculty",
    action: "CREATE_VIOLATION_REPORT",
    target: "Report V-20260810-101",
    targetId: "V-20260810-101",
    timestamp: "2026-08-11T10:42:00Z",
  },
];
