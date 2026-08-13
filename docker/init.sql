-- CMADMS PostgreSQL Docker Initialization Schema

CREATE TYPE app_role AS ENUM ('faculty','student','hod','admin');
CREATE TYPE violation_status AS ENUM ('reported','notified','awaiting_explanation','explanation_submitted','under_review','exonerated','warned','escalated');
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
  status permission_status NOT NULL DEFAULT 'approved',
  issued_by TEXT NOT NULL,
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
  scheduled_time TEXT NOT NULL,
  room TEXT NOT NULL,
  incident_time TEXT NOT NULL,
  location TEXT NOT NULL,
  remarks TEXT NOT NULL,
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

-- SEED INITIAL DEMO DATA
INSERT INTO students (student_code, name, department, year, section, semester, status)
VALUES 
  ('23CSE1012', 'Ashok Dora', 'CSE', '3rd Year', 'Section A', 6, 'Active'),
  ('23CSE1044', 'Meera Nair', 'CSE', '3rd Year', 'Section A', 6, 'Active'),
  ('23ECE2031', 'Karthik Reddy', 'ECE', '2nd Year', 'Section B', 4, 'Active')
ON CONFLICT DO NOTHING;
