-- CMADMS PostgreSQL Docker Initialization Schema

CREATE TYPE app_role AS ENUM ('faculty','student','hod','admin');
CREATE TYPE violation_status AS ENUM ('reported','notified','awaiting_explanation','explanation_submitted','under_review','exonerated','warned','escalated','resolved','dismissed');
CREATE TYPE permission_status AS ENUM ('pending','approved','rejected');

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT '',
  staff_code TEXT,
  student_code TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- STUDENTS MASTER
CREATE TABLE IF NOT EXISTS students (
  student_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  semester INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MOVEMENT PERMISSIONS
CREATE TABLE IF NOT EXISTS movement_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from TIME NOT NULL,
  valid_until TIME NOT NULL,
  status permission_status NOT NULL DEFAULT 'pending',
  issued_by TEXT NOT NULL,
  exit_at TIMESTAMPTZ,
  entry_at TIMESTAMPTZ,
  checkpoint TEXT,
  verified_by TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revocation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VIOLATION REPORTS
CREATE TABLE IF NOT EXISTS violation_reports (
  id TEXT PRIMARY KEY,
  student_code TEXT NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year_section TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject_code TEXT,
  scheduled_time TEXT NOT NULL,
  room TEXT NOT NULL,
  scheduled_faculty TEXT,
  incident_time TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT NOT NULL,
  violation_type TEXT NOT NULL DEFAULT 'Unauthorized Class Movement',
  severity TEXT NOT NULL DEFAULT 'Medium',
  remarks TEXT NOT NULL,
  witness_notes TEXT,
  evidence TEXT,
  reported_by TEXT NOT NULL,
  status violation_status NOT NULL DEFAULT 'awaiting_explanation',
  explanation TEXT,
  explanation_submitted_at TIMESTAMPTZ,
  decision TEXT,
  decision_by TEXT,
  decision_at TIMESTAMPTZ,
  semester INTEGER NOT NULL DEFAULT 6,
  explanation_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_reports_student ON violation_reports(student_code);
CREATE INDEX IF NOT EXISTS idx_violation_reports_reported_by ON violation_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_violation_reports_type ON violation_reports(violation_type);
CREATE INDEX IF NOT EXISTS idx_violation_reports_severity ON violation_reports(severity);

-- CAMPUS EMERGENCY INCIDENTS & COORDINATION
CREATE TABLE IF NOT EXISTS emergency_incidents (
  id TEXT PRIMARY KEY,
  violation_report_id TEXT REFERENCES violation_reports(id) ON DELETE SET NULL,
  student_code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year_section TEXT NOT NULL,
  incident_category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Critical',
  location TEXT NOT NULL,
  room TEXT NOT NULL,
  subject TEXT NOT NULL,
  faculty_reporter TEXT NOT NULL,
  incident_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reported',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  responder_id TEXT,
  responder_name TEXT,
  responder_role TEXT,
  response_started_at TIMESTAMPTZ,
  controlled_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_remarks TEXT,
  response_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_incidents_status ON emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_dept ON emergency_incidents(department);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_student ON emergency_incidents(student_code);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  actor_role app_role NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INSTITUTIONAL MASTER TIMETABLE (CLASS SLOTS)
CREATE TABLE IF NOT EXISTS class_slots (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  code TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  room TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL DEFAULT 'user',
  recipient_id TEXT,
  department TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  related_id TEXT,
  related_type TEXT,
  related_report_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SEED INITIAL DEMO DATA
INSERT INTO students (student_code, name, department, year, section, semester, status)
VALUES 
  ('23CSE1012', 'Ashok Dora', 'CSE', '3rd Year', 'Section A', 6, 'Active'),
  ('23CSE1044', 'Meera Nair', 'CSE', '3rd Year', 'Section A', 6, 'Active'),
  ('23ECE2031', 'Karthik Reddy', 'ECE', '2nd Year', 'Section B', 4, 'Active')
ON CONFLICT DO NOTHING;

