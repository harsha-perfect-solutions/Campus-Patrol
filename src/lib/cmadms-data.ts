export type ReportStatus = "pending" | "review" | "resolved" | "escalated";

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
  detail?: string;
  tone: "info" | "violation" | "resolved" | "pending";
};

export type Report = {
  id: string;
  studentName: string;
  studentId: string;
  department: string;
  yearSection: string;
  className: string;
  scheduledTime: string;
  room: string;
  incidentTime: string;
  createdAt: string;
  location: string;
  remarks: string;
  evidence?: string;
  reportedBy: string;
  status: ReportStatus;
  explanation?: string;
  decision?: string;
  timeline: TimelineEvent[];
};

export type Notification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "violation" | "pending" | "resolved" | "info";
  read: boolean;
};

export const faculty = {
  name: "Prof. Ravi Kumar",
  id: "FAC-CSE-114",
  role: "Faculty",
  department: "Computer Science & Engineering",
  initials: "RK",
};

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

/** Current class per student (null = no class scheduled right now). */
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
  "22MEC3007": null,
};

/** Active movement permission per student (absent = unauthorized). */
export const permissionByStudent: Record<string, Permission | undefined> = {
  "23CSE1044": {
    reason: "Library — reference book issue",
    issuedBy: "Dr. Anjali Rao",
    validUntil: "10:50 AM",
  },
  "23ECE2031": {
    reason: "Medical room visit",
    issuedBy: "Dr. S. Venkat",
    validUntil: "10:40 AM",
  },
};

export const locations = [
  "Main Corridor — Block C",
  "Library",
  "Canteen",
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
      room: "Room C-301",
      faculty: faculty.name,
      batch: "CSE-A",
    },
  ],
  Mon: [
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
      subject: "Operating Systems",
      code: "CS-308",
      start: "02:00 PM",
      end: "03:00 PM",
      room: "Room C-301",
      faculty: faculty.name,
      batch: "CSE-A",
    },
  ],
  Tue: [
    {
      subject: "Database Management",
      code: "CS-306",
      start: "10:00 AM",
      end: "11:00 AM",
      room: "Room B-102",
      faculty: faculty.name,
      batch: "CSE-B",
    },
    {
      subject: "Technical Seminar",
      code: "CS-390",
      start: "03:00 PM",
      end: "04:00 PM",
      room: "Seminar Hall 2",
      faculty: faculty.name,
      batch: "CSE-A",
    },
  ],
  Wed: [
    {
      subject: "Data Structures Lab",
      code: "CS-304L",
      start: "09:00 AM",
      end: "11:00 AM",
      room: "Lab C-1",
      faculty: faculty.name,
      batch: "CSE-A",
    },
  ],
  Thu: [
    {
      subject: "Operating Systems",
      code: "CS-308",
      start: "11:00 AM",
      end: "12:00 PM",
      room: "Room C-301",
      faculty: faculty.name,
      batch: "CSE-B",
    },
    {
      subject: "Mentoring Hour",
      code: "—",
      start: "04:00 PM",
      end: "05:00 PM",
      room: "Staff Room 4",
      faculty: faculty.name,
      batch: "CSE-A",
    },
  ],
  Fri: [
    {
      subject: "Database Management",
      code: "CS-306",
      start: "09:00 AM",
      end: "10:00 AM",
      room: "Room B-102",
      faculty: faculty.name,
      batch: "CSE-B",
    },
  ],
};

export const seedReports: Report[] = [
  {
    id: "V-20260810-001",
    studentName: "Ashok Dora",
    studentId: "23CSE1012",
    department: "CSE",
    yearSection: "3rd Year • Section A",
    className: "Data Structures",
    scheduledTime: "10:00 AM — 11:00 AM",
    room: "Room C-204",
    incidentTime: "10:42 AM",
    createdAt: "10 Aug 2026, 10:42 AM",
    location: "Main Corridor — Block C",
    remarks: "Student found in the corridor without a movement pass during scheduled class hours.",
    reportedBy: faculty.name,
    status: "review",
    explanation: "I went to collect a lab record from the department office and lost track of time.",
    timeline: [
      { time: "10:42 AM", title: "Violation reported", detail: faculty.name, tone: "violation" },
      { time: "10:43 AM", title: "Student notified", tone: "info" },
      { time: "11:15 AM", title: "Student explanation submitted", tone: "pending" },
      { time: "12:30 PM", title: "HOD reviewing case", tone: "info" },
    ],
  },
  {
    id: "V-20260810-002",
    studentName: "Karthik Reddy",
    studentId: "23ECE2031",
    department: "ECE",
    yearSection: "2nd Year • Section B",
    className: "Signals & Systems",
    scheduledTime: "10:00 AM — 11:00 AM",
    room: "Room E-110",
    incidentTime: "10:18 AM",
    createdAt: "10 Aug 2026, 10:18 AM",
    location: "Canteen",
    remarks: "Observed in the canteen during an active lecture slot.",
    reportedBy: faculty.name,
    status: "pending",
    timeline: [
      { time: "10:18 AM", title: "Violation reported", detail: faculty.name, tone: "violation" },
      { time: "10:19 AM", title: "Student notified", tone: "info" },
    ],
  },
  {
    id: "V-20260809-014",
    studentName: "Sneha Patil",
    studentId: "22MEC3007",
    department: "MECH",
    yearSection: "4th Year • Section C",
    className: "Thermodynamics",
    scheduledTime: "11:00 AM — 12:00 PM",
    room: "Room M-208",
    incidentTime: "11:22 AM",
    createdAt: "09 Aug 2026, 11:22 AM",
    location: "Parking Area",
    remarks: "Left the academic block without an approved pass.",
    reportedBy: faculty.name,
    status: "resolved",
    explanation: "I had a family emergency and informed the class representative.",
    decision: "Warning issued. Attendance for the session marked absent.",
    timeline: [
      { time: "11:22 AM", title: "Violation reported", detail: faculty.name, tone: "violation" },
      { time: "11:24 AM", title: "Student notified", tone: "info" },
      { time: "12:05 PM", title: "Student explanation submitted", tone: "pending" },
      { time: "02:30 PM", title: "HOD reviewed case", tone: "info" },
      { time: "02:35 PM", title: "Decision: Warning issued", tone: "resolved" },
    ],
  },
  {
    id: "V-20260808-009",
    studentName: "Meera Nair",
    studentId: "23CSE1044",
    department: "CSE",
    yearSection: "3rd Year • Section A",
    className: "Database Management",
    scheduledTime: "02:00 PM — 03:00 PM",
    room: "Room B-102",
    incidentTime: "02:11 PM",
    createdAt: "08 Aug 2026, 02:11 PM",
    location: "Hostel Gate",
    remarks: "Repeated unauthorized movement during afternoon sessions.",
    reportedBy: faculty.name,
    status: "escalated",
    explanation: "I was unwell and going back to the hostel.",
    timeline: [
      { time: "02:11 PM", title: "Violation reported", detail: faculty.name, tone: "violation" },
      { time: "02:12 PM", title: "Student notified", tone: "info" },
      { time: "03:40 PM", title: "Student explanation submitted", tone: "pending" },
      { time: "04:10 PM", title: "Escalated to HOD — third instance", tone: "violation" },
    ],
  },
  {
    id: "V-20260807-021",
    studentName: "Ashok Dora",
    studentId: "23CSE1012",
    department: "CSE",
    yearSection: "3rd Year • Section A",
    className: "Operating Systems",
    scheduledTime: "02:00 PM — 03:00 PM",
    room: "Room C-301",
    incidentTime: "02:26 PM",
    createdAt: "07 Aug 2026, 02:26 PM",
    location: "Library",
    remarks: "Found in the library reading room during class hours.",
    reportedBy: faculty.name,
    status: "resolved",
    decision: "Explanation accepted — permission was issued but not recorded.",
    timeline: [
      { time: "02:26 PM", title: "Violation reported", detail: faculty.name, tone: "violation" },
      { time: "03:00 PM", title: "Student explanation submitted", tone: "pending" },
      { time: "04:15 PM", title: "Decision: Closed without penalty", tone: "resolved" },
    ],
  },
];

export const seedNotifications: Notification[] = [
  {
    id: "N-1",
    title: "HOD reviewed violation V-20260810-001",
    detail: "The case is now under review with the department head.",
    time: "2 minutes ago",
    tone: "violation",
    read: false,
  },
  {
    id: "N-2",
    title: "Student submitted explanation for V-20260808-009",
    detail: "Meera Nair responded to the reported unauthorized movement.",
    time: "15 minutes ago",
    tone: "pending",
    read: false,
  },
  {
    id: "N-3",
    title: "Violation V-20260809-014 has been resolved",
    detail: "A warning was issued and the case is closed.",
    time: "1 hour ago",
    tone: "resolved",
    read: true,
  },
  {
    id: "N-4",
    title: "Timetable updated for CSE-A",
    detail: "Operating Systems moved to Room C-301 from today.",
    time: "Yesterday",
    tone: "info",
    read: true,
  },
];

export const statusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  review: "Under Review",
  resolved: "Resolved",
  escalated: "Escalated",
};
