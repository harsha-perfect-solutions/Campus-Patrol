-- CMADMS Timetable Schema & Seed
-- Run this against cmadms_db to add class schedule support

-- ============================================================
-- TABLE: class_schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS class_schedules (
  id           SERIAL PRIMARY KEY,
  student_code TEXT        NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  day_of_week  TEXT        NOT NULL,  -- 'Monday','Tuesday',...,'Friday'
  subject      TEXT        NOT NULL,
  subject_code TEXT        NOT NULL,
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  room         TEXT        NOT NULL,
  faculty_name TEXT        NOT NULL,
  batch        TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_student_day ON class_schedules (student_code, day_of_week);

-- ============================================================
-- SEED: CSE 3rd Year Section A  (23CSE1012, 23CSE1044, 23CSE1101, 23CSE1102)
-- ============================================================
INSERT INTO class_schedules (student_code, day_of_week, subject, subject_code, start_time, end_time, room, faculty_name, batch) VALUES
-- Monday
('23CSE1012','Monday','Data Structures','CS-304','09:00','10:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1012','Monday','Database Management','CS-306','10:00','11:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1012','Monday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1012','Monday','Computer Networks','CS-310','14:00','15:00','Room C-204','Dr. Anjali Rao','CSE-A'),
-- Tuesday
('23CSE1012','Tuesday','Data Structures Lab','CS-304L','09:00','11:00','Lab L-101','Prof. Ravi Kumar','CSE-A'),
('23CSE1012','Tuesday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1012','Tuesday','Compiler Design','CS-312','14:00','15:00','Room C-204','Dr. P. Mehta','CSE-A'),
-- Wednesday
('23CSE1012','Wednesday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1012','Wednesday','Computer Networks','CS-310','10:00','11:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1012','Wednesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-A'),
-- Thursday
('23CSE1012','Thursday','Compiler Design','CS-312','09:00','10:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1012','Thursday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1012','Thursday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
-- Friday
('23CSE1012','Friday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-A'),
('23CSE1012','Friday','Compiler Design','CS-312','11:00','12:00','Room C-204','Dr. P. Mehta','CSE-A'),

-- Copy same schedule for batch-mates in CSE-A
('23CSE1044','Monday','Data Structures','CS-304','09:00','10:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1044','Monday','Database Management','CS-306','10:00','11:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1044','Monday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1044','Monday','Computer Networks','CS-310','14:00','15:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1044','Tuesday','Data Structures Lab','CS-304L','09:00','11:00','Lab L-101','Prof. Ravi Kumar','CSE-A'),
('23CSE1044','Tuesday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1044','Tuesday','Compiler Design','CS-312','14:00','15:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1044','Wednesday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1044','Wednesday','Computer Networks','CS-310','10:00','11:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1044','Wednesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-A'),
('23CSE1044','Thursday','Compiler Design','CS-312','09:00','10:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1044','Thursday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1044','Thursday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1044','Friday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-A'),
('23CSE1044','Friday','Compiler Design','CS-312','11:00','12:00','Room C-204','Dr. P. Mehta','CSE-A'),

('23CSE1101','Monday','Data Structures','CS-304','09:00','10:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1101','Monday','Database Management','CS-306','10:00','11:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1101','Monday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1101','Monday','Computer Networks','CS-310','14:00','15:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1101','Tuesday','Data Structures Lab','CS-304L','09:00','11:00','Lab L-101','Prof. Ravi Kumar','CSE-A'),
('23CSE1101','Tuesday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1101','Tuesday','Compiler Design','CS-312','14:00','15:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1101','Wednesday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1101','Wednesday','Computer Networks','CS-310','10:00','11:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1101','Wednesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-A'),
('23CSE1101','Thursday','Compiler Design','CS-312','09:00','10:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1101','Thursday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1101','Thursday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1101','Friday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-A'),
('23CSE1101','Friday','Compiler Design','CS-312','11:00','12:00','Room C-204','Dr. P. Mehta','CSE-A'),

('23CSE1102','Monday','Data Structures','CS-304','09:00','10:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1102','Monday','Database Management','CS-306','10:00','11:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1102','Monday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1102','Monday','Computer Networks','CS-310','14:00','15:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1102','Tuesday','Data Structures Lab','CS-304L','09:00','11:00','Lab L-101','Prof. Ravi Kumar','CSE-A'),
('23CSE1102','Tuesday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1102','Tuesday','Compiler Design','CS-312','14:00','15:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1102','Wednesday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-A'),
('23CSE1102','Wednesday','Computer Networks','CS-310','10:00','11:00','Room C-204','Dr. Anjali Rao','CSE-A'),
('23CSE1102','Wednesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-A'),
('23CSE1102','Thursday','Compiler Design','CS-312','09:00','10:00','Room C-204','Dr. P. Mehta','CSE-A'),
('23CSE1102','Thursday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-A'),
('23CSE1102','Thursday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-A'),
('23CSE1102','Friday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-A'),
('23CSE1102','Friday','Compiler Design','CS-312','11:00','12:00','Room C-204','Dr. P. Mehta','CSE-A'),

-- ============================================================
-- CSE 3rd Year Section B (23CSE1103, 23CSE1104) — staggered schedule
-- ============================================================
('23CSE1103','Monday','Operating Systems','CS-308','09:00','10:00','Room C-206','Prof. Ravi Kumar','CSE-B'),
('23CSE1103','Monday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-B'),
('23CSE1103','Monday','Compiler Design','CS-312','11:00','12:00','Room C-205','Dr. P. Mehta','CSE-B'),
('23CSE1103','Monday','Database Management','CS-306','14:00','15:00','Room B-102','Dr. Anjali Rao','CSE-B'),
('23CSE1103','Tuesday','Operating Systems','CS-308','09:00','10:00','Room C-206','Prof. Ravi Kumar','CSE-B'),
('23CSE1103','Tuesday','Compiler Design','CS-312','10:00','11:00','Room C-205','Dr. P. Mehta','CSE-B'),
('23CSE1103','Tuesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-B'),
('23CSE1103','Wednesday','Data Structures','CS-304','09:00','10:00','Room C-204','Prof. Ravi Kumar','CSE-B'),
('23CSE1103','Wednesday','Computer Networks','CS-310','10:00','11:00','Room C-207','Dr. Anjali Rao','CSE-B'),
('23CSE1103','Wednesday','Data Structures Lab','CS-304L','14:00','16:00','Lab L-101','Prof. Ravi Kumar','CSE-B'),
('23CSE1103','Thursday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-B'),
('23CSE1103','Thursday','Computer Networks','CS-310','10:00','11:00','Room C-207','Dr. Anjali Rao','CSE-B'),
('23CSE1103','Thursday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-B'),
('23CSE1103','Friday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-B'),
('23CSE1103','Friday','Data Structures','CS-304','11:00','12:00','Room C-204','Prof. Ravi Kumar','CSE-B'),

('23CSE1104','Monday','Operating Systems','CS-308','09:00','10:00','Room C-206','Prof. Ravi Kumar','CSE-B'),
('23CSE1104','Monday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-B'),
('23CSE1104','Monday','Compiler Design','CS-312','11:00','12:00','Room C-205','Dr. P. Mehta','CSE-B'),
('23CSE1104','Monday','Database Management','CS-306','14:00','15:00','Room B-102','Dr. Anjali Rao','CSE-B'),
('23CSE1104','Tuesday','Operating Systems','CS-308','09:00','10:00','Room C-206','Prof. Ravi Kumar','CSE-B'),
('23CSE1104','Tuesday','Compiler Design','CS-312','10:00','11:00','Room C-205','Dr. P. Mehta','CSE-B'),
('23CSE1104','Tuesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-B'),
('23CSE1104','Wednesday','Data Structures','CS-304','09:00','10:00','Room C-204','Prof. Ravi Kumar','CSE-B'),
('23CSE1104','Wednesday','Computer Networks','CS-310','10:00','11:00','Room C-207','Dr. Anjali Rao','CSE-B'),
('23CSE1104','Wednesday','Data Structures Lab','CS-304L','14:00','16:00','Lab L-101','Prof. Ravi Kumar','CSE-B'),
('23CSE1104','Thursday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-B'),
('23CSE1104','Thursday','Computer Networks','CS-310','10:00','11:00','Room C-207','Dr. Anjali Rao','CSE-B'),
('23CSE1104','Thursday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-B'),
('23CSE1104','Friday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-B'),
('23CSE1104','Friday','Data Structures','CS-304','11:00','12:00','Room C-204','Prof. Ravi Kumar','CSE-B'),

-- ============================================================
-- CSE 3rd Year Section C (23CSE1105)
-- ============================================================
('23CSE1105','Monday','Computer Networks','CS-310','09:00','10:00','Room C-207','Dr. Anjali Rao','CSE-C'),
('23CSE1105','Monday','Compiler Design','CS-312','10:00','11:00','Room C-205','Dr. P. Mehta','CSE-C'),
('23CSE1105','Monday','Data Structures','CS-304','11:00','12:00','Room C-204','Prof. Ravi Kumar','CSE-C'),
('23CSE1105','Tuesday','Computer Networks Lab','CS-310L','09:00','11:00','Lab L-103','Dr. Anjali Rao','CSE-C'),
('23CSE1105','Tuesday','Operating Systems','CS-308','11:00','12:00','Room C-206','Prof. Ravi Kumar','CSE-C'),
('23CSE1105','Wednesday','Database Management','CS-306','09:00','10:00','Room B-102','Dr. Anjali Rao','CSE-C'),
('23CSE1105','Wednesday','Data Structures','CS-304','10:00','11:00','Room C-204','Prof. Ravi Kumar','CSE-C'),
('23CSE1105','Wednesday','DBMS Lab','CS-306L','14:00','16:00','Lab L-102','Dr. Anjali Rao','CSE-C'),
('23CSE1105','Thursday','Compiler Design','CS-312','09:00','10:00','Room C-205','Dr. P. Mehta','CSE-C'),
('23CSE1105','Thursday','Operating Systems','CS-308','10:00','11:00','Room C-206','Prof. Ravi Kumar','CSE-C'),
('23CSE1105','Thursday','Computer Networks','CS-310','11:00','12:00','Room C-207','Dr. Anjali Rao','CSE-C'),
('23CSE1105','Friday','Data Structures Lab','CS-304L','09:00','11:00','Lab L-101','Prof. Ravi Kumar','CSE-C'),
('23CSE1105','Friday','Database Management','CS-306','11:00','12:00','Room B-102','Dr. Anjali Rao','CSE-C'),

-- ============================================================
-- CSE 4th Year (22CSE2201, 22CSE2202)
-- ============================================================
('22CSE2201','Monday','Artificial Intelligence','CS-401','09:00','10:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2201','Monday','Cloud Computing','CS-403','10:00','11:00','Room C-302','Prof. Ravi Kumar','CSE-4A'),
('22CSE2201','Monday','Software Engineering','CS-405','11:00','12:00','Room C-303','Dr. P. Mehta','CSE-4A'),
('22CSE2201','Tuesday','AI Lab','CS-401L','09:00','11:00','Lab L-201','Dr. Anjali Rao','CSE-4A'),
('22CSE2201','Tuesday','Machine Learning','CS-407','11:00','12:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2201','Wednesday','Cloud Computing','CS-403','09:00','10:00','Room C-302','Prof. Ravi Kumar','CSE-4A'),
('22CSE2201','Wednesday','Software Engineering','CS-405','10:00','11:00','Room C-303','Dr. P. Mehta','CSE-4A'),
('22CSE2201','Thursday','Artificial Intelligence','CS-401','09:00','10:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2201','Thursday','Machine Learning','CS-407','10:00','11:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2201','Friday','Cloud Lab','CS-403L','09:00','11:00','Lab L-202','Prof. Ravi Kumar','CSE-4A'),

('22CSE2202','Monday','Artificial Intelligence','CS-401','09:00','10:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2202','Monday','Cloud Computing','CS-403','10:00','11:00','Room C-302','Prof. Ravi Kumar','CSE-4A'),
('22CSE2202','Monday','Software Engineering','CS-405','11:00','12:00','Room C-303','Dr. P. Mehta','CSE-4A'),
('22CSE2202','Tuesday','AI Lab','CS-401L','09:00','11:00','Lab L-201','Dr. Anjali Rao','CSE-4A'),
('22CSE2202','Tuesday','Machine Learning','CS-407','11:00','12:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2202','Wednesday','Cloud Computing','CS-403','09:00','10:00','Room C-302','Prof. Ravi Kumar','CSE-4A'),
('22CSE2202','Wednesday','Software Engineering','CS-405','10:00','11:00','Room C-303','Dr. P. Mehta','CSE-4A'),
('22CSE2202','Thursday','Artificial Intelligence','CS-401','09:00','10:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2202','Thursday','Machine Learning','CS-407','10:00','11:00','Room C-301','Dr. Anjali Rao','CSE-4A'),
('22CSE2202','Friday','Cloud Lab','CS-403L','09:00','11:00','Lab L-202','Prof. Ravi Kumar','CSE-4A'),

-- ============================================================
-- CSE 2nd Year (24CSE0301 Section A, 24CSE0302 Section B)
-- ============================================================
('24CSE0301','Monday','Discrete Mathematics','CS-201','09:00','10:00','Room C-101','Prof. Ravi Kumar','CSE-2A'),
('24CSE0301','Monday','Digital Logic Design','CS-203','10:00','11:00','Room C-102','Dr. S. Pillai','CSE-2A'),
('24CSE0301','Monday','Object Oriented Programming','CS-205','11:00','12:00','Room C-103','Dr. Anjali Rao','CSE-2A'),
('24CSE0301','Tuesday','OOP Lab','CS-205L','09:00','11:00','Lab L-104','Dr. Anjali Rao','CSE-2A'),
('24CSE0301','Tuesday','Discrete Mathematics','CS-201','11:00','12:00','Room C-101','Prof. Ravi Kumar','CSE-2A'),
('24CSE0301','Wednesday','Digital Logic Design','CS-203','09:00','10:00','Room C-102','Dr. S. Pillai','CSE-2A'),
('24CSE0301','Wednesday','Object Oriented Programming','CS-205','10:00','11:00','Room C-103','Dr. Anjali Rao','CSE-2A'),
('24CSE0301','Thursday','Discrete Mathematics','CS-201','09:00','10:00','Room C-101','Prof. Ravi Kumar','CSE-2A'),
('24CSE0301','Thursday','Digital Logic Design Lab','CS-203L','10:00','12:00','Lab L-105','Dr. S. Pillai','CSE-2A'),
('24CSE0301','Friday','Object Oriented Programming','CS-205','09:00','10:00','Room C-103','Dr. Anjali Rao','CSE-2A'),
('24CSE0301','Friday','Discrete Mathematics','CS-201','10:00','11:00','Room C-101','Prof. Ravi Kumar','CSE-2A'),

('24CSE0302','Monday','Object Oriented Programming','CS-205','09:00','10:00','Room C-103','Dr. Anjali Rao','CSE-2B'),
('24CSE0302','Monday','Discrete Mathematics','CS-201','10:00','11:00','Room C-101','Prof. Ravi Kumar','CSE-2B'),
('24CSE0302','Monday','Digital Logic Design','CS-203','11:00','12:00','Room C-102','Dr. S. Pillai','CSE-2B'),
('24CSE0302','Tuesday','Digital Logic Design Lab','CS-203L','09:00','11:00','Lab L-105','Dr. S. Pillai','CSE-2B'),
('24CSE0302','Tuesday','Object Oriented Programming','CS-205','11:00','12:00','Room C-103','Dr. Anjali Rao','CSE-2B'),
('24CSE0302','Wednesday','Discrete Mathematics','CS-201','09:00','10:00','Room C-101','Prof. Ravi Kumar','CSE-2B'),
('24CSE0302','Wednesday','OOP Lab','CS-205L','14:00','16:00','Lab L-104','Dr. Anjali Rao','CSE-2B'),
('24CSE0302','Thursday','Object Oriented Programming','CS-205','09:00','10:00','Room C-103','Dr. Anjali Rao','CSE-2B'),
('24CSE0302','Thursday','Digital Logic Design','CS-203','10:00','11:00','Room C-102','Dr. S. Pillai','CSE-2B'),
('24CSE0302','Friday','Discrete Mathematics','CS-201','09:00','10:00','Room C-101','Prof. Ravi Kumar','CSE-2B'),
('24CSE0302','Friday','Digital Logic Design','CS-203','10:00','11:00','Room C-102','Dr. S. Pillai','CSE-2B'),

-- ============================================================
-- ECE 3rd Year Section A (23ECE2101, 23ECE2102, 23ECE4777)
-- ============================================================
('23ECE2101','Monday','Signals & Systems','EC-301','09:00','10:00','Room E-201','Dr. S. Venkat','ECE-3A'),
('23ECE2101','Monday','Digital Signal Processing','EC-303','10:00','11:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Monday','Microprocessors','EC-305','11:00','12:00','Room E-203','Dr. S. Venkat','ECE-3A'),
('23ECE2101','Monday','VLSI Design','EC-307','14:00','15:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Tuesday','Signals Lab','EC-301L','09:00','11:00','Lab E-101','Dr. S. Venkat','ECE-3A'),
('23ECE2101','Tuesday','Digital Signal Processing','EC-303','11:00','12:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Wednesday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3A'),
('23ECE2101','Wednesday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Wednesday','Microprocessor Lab','EC-305L','14:00','16:00','Lab E-102','Dr. S. Venkat','ECE-3A'),
('23ECE2101','Thursday','Signals & Systems','EC-301','09:00','10:00','Room E-201','Dr. S. Venkat','ECE-3A'),
('23ECE2101','Thursday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Thursday','Digital Signal Processing','EC-303','11:00','12:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Friday','DSP Lab','EC-303L','09:00','11:00','Lab E-103','Dr. K. Ramesh','ECE-3A'),
('23ECE2101','Friday','Microprocessors','EC-305','11:00','12:00','Room E-203','Dr. S. Venkat','ECE-3A'),

('23ECE2102','Monday','Signals & Systems','EC-301','09:00','10:00','Room E-201','Dr. S. Venkat','ECE-3A'),
('23ECE2102','Monday','Digital Signal Processing','EC-303','10:00','11:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Monday','Microprocessors','EC-305','11:00','12:00','Room E-203','Dr. S. Venkat','ECE-3A'),
('23ECE2102','Monday','VLSI Design','EC-307','14:00','15:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Tuesday','Signals Lab','EC-301L','09:00','11:00','Lab E-101','Dr. S. Venkat','ECE-3A'),
('23ECE2102','Tuesday','Digital Signal Processing','EC-303','11:00','12:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Wednesday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3A'),
('23ECE2102','Wednesday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Wednesday','Microprocessor Lab','EC-305L','14:00','16:00','Lab E-102','Dr. S. Venkat','ECE-3A'),
('23ECE2102','Thursday','Signals & Systems','EC-301','09:00','10:00','Room E-201','Dr. S. Venkat','ECE-3A'),
('23ECE2102','Thursday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Thursday','Digital Signal Processing','EC-303','11:00','12:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Friday','DSP Lab','EC-303L','09:00','11:00','Lab E-103','Dr. K. Ramesh','ECE-3A'),
('23ECE2102','Friday','Microprocessors','EC-305','11:00','12:00','Room E-203','Dr. S. Venkat','ECE-3A'),

('23ECE4777','Monday','Signals & Systems','EC-301','09:00','10:00','Room E-201','Dr. S. Venkat','ECE-3A'),
('23ECE4777','Monday','Digital Signal Processing','EC-303','10:00','11:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE4777','Monday','Microprocessors','EC-305','11:00','12:00','Room E-203','Dr. S. Venkat','ECE-3A'),
('23ECE4777','Tuesday','Signals Lab','EC-301L','09:00','11:00','Lab E-101','Dr. S. Venkat','ECE-3A'),
('23ECE4777','Tuesday','Digital Signal Processing','EC-303','11:00','12:00','Room E-202','Dr. K. Ramesh','ECE-3A'),
('23ECE4777','Wednesday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3A'),
('23ECE4777','Wednesday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE4777','Thursday','Signals & Systems','EC-301','09:00','10:00','Room E-201','Dr. S. Venkat','ECE-3A'),
('23ECE4777','Thursday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3A'),
('23ECE4777','Friday','DSP Lab','EC-303L','09:00','11:00','Lab E-103','Dr. K. Ramesh','ECE-3A'),

-- ============================================================
-- ECE 3rd Year Section B (23ECE2031, 23ECE2103, 23ECE2104)
-- ============================================================
('23ECE2031','Monday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3B'),
('23ECE2031','Monday','Signals & Systems','EC-301','10:00','11:00','Room E-201','Dr. S. Venkat','ECE-3B'),
('23ECE2031','Monday','VLSI Design','EC-307','11:00','12:00','Room E-201','Dr. K. Ramesh','ECE-3B'),
('23ECE2031','Tuesday','Microprocessor Lab','EC-305L','09:00','11:00','Lab E-102','Dr. S. Venkat','ECE-3B'),
('23ECE2031','Tuesday','Signals & Systems','EC-301','11:00','12:00','Room E-201','Dr. S. Venkat','ECE-3B'),
('23ECE2031','Wednesday','Digital Signal Processing','EC-303','09:00','10:00','Room E-202','Dr. K. Ramesh','ECE-3B'),
('23ECE2031','Wednesday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3B'),
('23ECE2031','Thursday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3B'),
('23ECE2031','Thursday','Digital Signal Processing','EC-303','10:00','11:00','Room E-202','Dr. K. Ramesh','ECE-3B'),
('23ECE2031','Friday','Signals Lab','EC-301L','09:00','11:00','Lab E-101','Dr. S. Venkat','ECE-3B'),

('23ECE2103','Monday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3B'),
('23ECE2103','Monday','Signals & Systems','EC-301','10:00','11:00','Room E-201','Dr. S. Venkat','ECE-3B'),
('23ECE2103','Monday','VLSI Design','EC-307','11:00','12:00','Room E-201','Dr. K. Ramesh','ECE-3B'),
('23ECE2103','Tuesday','Microprocessor Lab','EC-305L','09:00','11:00','Lab E-102','Dr. S. Venkat','ECE-3B'),
('23ECE2103','Tuesday','Signals & Systems','EC-301','11:00','12:00','Room E-201','Dr. S. Venkat','ECE-3B'),
('23ECE2103','Wednesday','Digital Signal Processing','EC-303','09:00','10:00','Room E-202','Dr. K. Ramesh','ECE-3B'),
('23ECE2103','Wednesday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3B'),
('23ECE2103','Thursday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3B'),
('23ECE2103','Thursday','Digital Signal Processing','EC-303','10:00','11:00','Room E-202','Dr. K. Ramesh','ECE-3B'),
('23ECE2103','Friday','Signals Lab','EC-301L','09:00','11:00','Lab E-101','Dr. S. Venkat','ECE-3B'),

('23ECE2104','Monday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3B'),
('23ECE2104','Monday','Signals & Systems','EC-301','10:00','11:00','Room E-201','Dr. S. Venkat','ECE-3B'),
('23ECE2104','Monday','VLSI Design','EC-307','11:00','12:00','Room E-201','Dr. K. Ramesh','ECE-3B'),
('23ECE2104','Tuesday','Microprocessor Lab','EC-305L','09:00','11:00','Lab E-102','Dr. S. Venkat','ECE-3B'),
('23ECE2104','Tuesday','Signals & Systems','EC-301','11:00','12:00','Room E-201','Dr. S. Venkat','ECE-3B'),
('23ECE2104','Wednesday','Digital Signal Processing','EC-303','09:00','10:00','Room E-202','Dr. K. Ramesh','ECE-3B'),
('23ECE2104','Wednesday','VLSI Design','EC-307','10:00','11:00','Room E-201','Dr. K. Ramesh','ECE-3B'),
('23ECE2104','Thursday','Microprocessors','EC-305','09:00','10:00','Room E-203','Dr. S. Venkat','ECE-3B'),
('23ECE2104','Thursday','Digital Signal Processing','EC-303','10:00','11:00','Room E-202','Dr. K. Ramesh','ECE-3B'),
('23ECE2104','Friday','Signals Lab','EC-301L','09:00','11:00','Lab E-101','Dr. S. Venkat','ECE-3B'),

-- ECE 4th Year (22ECE3201)
('22ECE3201','Monday','Wireless Communications','EC-401','09:00','10:00','Room E-301','Dr. S. Venkat','ECE-4A'),
('22ECE3201','Monday','Embedded Systems','EC-403','10:00','11:00','Room E-302','Dr. K. Ramesh','ECE-4A'),
('22ECE3201','Tuesday','Embedded Lab','EC-403L','09:00','11:00','Lab E-201','Dr. K. Ramesh','ECE-4A'),
('22ECE3201','Wednesday','Wireless Communications','EC-401','09:00','10:00','Room E-301','Dr. S. Venkat','ECE-4A'),
('22ECE3201','Thursday','Embedded Systems','EC-403','09:00','10:00','Room E-302','Dr. K. Ramesh','ECE-4A'),
('22ECE3201','Friday','Wireless Lab','EC-401L','09:00','11:00','Lab E-202','Dr. S. Venkat','ECE-4A'),

-- ECE 2nd Year (24ECE0301)
('24ECE0301','Monday','Circuit Theory','EC-201','09:00','10:00','Room E-101','Dr. K. Ramesh','ECE-2A'),
('24ECE0301','Monday','Electronic Devices','EC-203','10:00','11:00','Room E-102','Dr. S. Venkat','ECE-2A'),
('24ECE0301','Tuesday','Circuit Lab','EC-201L','09:00','11:00','Lab E-104','Dr. K. Ramesh','ECE-2A'),
('24ECE0301','Wednesday','Electronic Devices','EC-203','09:00','10:00','Room E-102','Dr. S. Venkat','ECE-2A'),
('24ECE0301','Thursday','Circuit Theory','EC-201','09:00','10:00','Room E-101','Dr. K. Ramesh','ECE-2A'),
('24ECE0301','Friday','Electronic Devices Lab','EC-203L','09:00','11:00','Lab E-105','Dr. S. Venkat','ECE-2A'),

-- ============================================================
-- MECH 3rd Year (23MECH1101, 23MECH1102, 23MECH1103)
-- ============================================================
('23MECH1101','Monday','Thermodynamics','ME-301','09:00','10:00','Room M-201','Dr. P. K. Sharma','MECH-3A'),
('23MECH1101','Monday','Fluid Mechanics','ME-303','10:00','11:00','Room M-202','Prof. T. Nair','MECH-3A'),
('23MECH1101','Monday','Manufacturing Processes','ME-305','11:00','12:00','Room M-203','Dr. P. K. Sharma','MECH-3A'),
('23MECH1101','Tuesday','Fluid Lab','ME-303L','09:00','11:00','Lab M-101','Prof. T. Nair','MECH-3A'),
('23MECH1101','Tuesday','Thermodynamics','ME-301','11:00','12:00','Room M-201','Dr. P. K. Sharma','MECH-3A'),
('23MECH1101','Wednesday','Manufacturing Processes','ME-305','09:00','10:00','Room M-203','Dr. P. K. Sharma','MECH-3A'),
('23MECH1101','Wednesday','Fluid Mechanics','ME-303','10:00','11:00','Room M-202','Prof. T. Nair','MECH-3A'),
('23MECH1101','Thursday','Thermodynamics','ME-301','09:00','10:00','Room M-201','Dr. P. K. Sharma','MECH-3A'),
('23MECH1101','Thursday','Manufacturing Lab','ME-305L','10:00','12:00','Lab M-102','Dr. P. K. Sharma','MECH-3A'),
('23MECH1101','Friday','Fluid Mechanics','ME-303','09:00','10:00','Room M-202','Prof. T. Nair','MECH-3A'),

('23MECH1102','Monday','Thermodynamics','ME-301','09:00','10:00','Room M-201','Dr. P. K. Sharma','MECH-3A'),
('23MECH1102','Monday','Fluid Mechanics','ME-303','10:00','11:00','Room M-202','Prof. T. Nair','MECH-3A'),
('23MECH1102','Monday','Manufacturing Processes','ME-305','11:00','12:00','Room M-203','Dr. P. K. Sharma','MECH-3A'),
('23MECH1102','Tuesday','Fluid Lab','ME-303L','09:00','11:00','Lab M-101','Prof. T. Nair','MECH-3A'),
('23MECH1102','Tuesday','Thermodynamics','ME-301','11:00','12:00','Room M-201','Dr. P. K. Sharma','MECH-3A'),
('23MECH1102','Wednesday','Manufacturing Processes','ME-305','09:00','10:00','Room M-203','Dr. P. K. Sharma','MECH-3A'),
('23MECH1102','Wednesday','Fluid Mechanics','ME-303','10:00','11:00','Room M-202','Prof. T. Nair','MECH-3A'),
('23MECH1102','Thursday','Thermodynamics','ME-301','09:00','10:00','Room M-201','Dr. P. K. Sharma','MECH-3A'),
('23MECH1102','Thursday','Manufacturing Lab','ME-305L','10:00','12:00','Lab M-102','Dr. P. K. Sharma','MECH-3A'),
('23MECH1102','Friday','Fluid Mechanics','ME-303','09:00','10:00','Room M-202','Prof. T. Nair','MECH-3A'),

('23MECH1103','Monday','Manufacturing Processes','ME-305','09:00','10:00','Room M-203','Dr. P. K. Sharma','MECH-3B'),
('23MECH1103','Monday','Thermodynamics','ME-301','10:00','11:00','Room M-201','Dr. P. K. Sharma','MECH-3B'),
('23MECH1103','Monday','Fluid Mechanics','ME-303','11:00','12:00','Room M-202','Prof. T. Nair','MECH-3B'),
('23MECH1103','Tuesday','Manufacturing Lab','ME-305L','09:00','11:00','Lab M-102','Dr. P. K. Sharma','MECH-3B'),
('23MECH1103','Wednesday','Thermodynamics','ME-301','09:00','10:00','Room M-201','Dr. P. K. Sharma','MECH-3B'),
('23MECH1103','Thursday','Fluid Lab','ME-303L','09:00','11:00','Lab M-101','Prof. T. Nair','MECH-3B'),
('23MECH1103','Friday','Manufacturing Processes','ME-305','09:00','10:00','Room M-203','Dr. P. K. Sharma','MECH-3B'),

-- MECH 4th Year (22MECH2201)
('22MECH2201','Monday','CAD/CAM','ME-401','09:00','10:00','Room M-301','Dr. P. K. Sharma','MECH-4A'),
('22MECH2201','Monday','Heat Transfer','ME-403','10:00','11:00','Room M-302','Prof. T. Nair','MECH-4A'),
('22MECH2201','Tuesday','CAD Lab','ME-401L','09:00','11:00','Lab M-201','Dr. P. K. Sharma','MECH-4A'),
('22MECH2201','Wednesday','Heat Transfer','ME-403','09:00','10:00','Room M-302','Prof. T. Nair','MECH-4A'),
('22MECH2201','Thursday','CAD/CAM','ME-401','09:00','10:00','Room M-301','Dr. P. K. Sharma','MECH-4A'),
('22MECH2201','Friday','Heat Transfer Lab','ME-403L','09:00','11:00','Lab M-202','Prof. T. Nair','MECH-4A'),

-- MECH 2nd Year (24MECH0301)
('24MECH0301','Monday','Engineering Mechanics','ME-201','09:00','10:00','Room M-101','Dr. P. K. Sharma','MECH-2A'),
('24MECH0301','Monday','Material Science','ME-203','10:00','11:00','Room M-102','Prof. T. Nair','MECH-2A'),
('24MECH0301','Tuesday','Engineering Mechanics','ME-201','09:00','10:00','Room M-101','Dr. P. K. Sharma','MECH-2A'),
('24MECH0301','Wednesday','Material Science','ME-203','09:00','10:00','Room M-102','Prof. T. Nair','MECH-2A'),
('24MECH0301','Thursday','Mechanics Lab','ME-201L','09:00','11:00','Lab M-103','Dr. P. K. Sharma','MECH-2A'),
('24MECH0301','Friday','Material Science','ME-203','09:00','10:00','Room M-102','Prof. T. Nair','MECH-2A'),

-- ============================================================
-- CIVIL (23CIVIL1101, 23CIVIL1102, 22CIVIL2201)
-- ============================================================
('23CIVIL1101','Monday','Structural Analysis','CV-301','09:00','10:00','Room V-201','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1101','Monday','Geotechnical Engineering','CV-303','10:00','11:00','Room V-202','Prof. R. Krishnan','CIVIL-3A'),
('23CIVIL1101','Monday','Transportation Eng.','CV-305','11:00','12:00','Room V-203','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1101','Tuesday','Structural Lab','CV-301L','09:00','11:00','Lab V-101','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1101','Wednesday','Geotechnical Engineering','CV-303','09:00','10:00','Room V-202','Prof. R. Krishnan','CIVIL-3A'),
('23CIVIL1101','Wednesday','Structural Analysis','CV-301','10:00','11:00','Room V-201','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1101','Thursday','Transportation Eng.','CV-305','09:00','10:00','Room V-203','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1101','Thursday','Geotech Lab','CV-303L','10:00','12:00','Lab V-102','Prof. R. Krishnan','CIVIL-3A'),
('23CIVIL1101','Friday','Structural Analysis','CV-301','09:00','10:00','Room V-201','Dr. M. K. Varma','CIVIL-3A'),

('23CIVIL1102','Monday','Structural Analysis','CV-301','09:00','10:00','Room V-201','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1102','Monday','Geotechnical Engineering','CV-303','10:00','11:00','Room V-202','Prof. R. Krishnan','CIVIL-3A'),
('23CIVIL1102','Monday','Transportation Eng.','CV-305','11:00','12:00','Room V-203','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1102','Tuesday','Structural Lab','CV-301L','09:00','11:00','Lab V-101','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1102','Wednesday','Geotechnical Engineering','CV-303','09:00','10:00','Room V-202','Prof. R. Krishnan','CIVIL-3A'),
('23CIVIL1102','Wednesday','Structural Analysis','CV-301','10:00','11:00','Room V-201','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1102','Thursday','Transportation Eng.','CV-305','09:00','10:00','Room V-203','Dr. M. K. Varma','CIVIL-3A'),
('23CIVIL1102','Thursday','Geotech Lab','CV-303L','10:00','12:00','Lab V-102','Prof. R. Krishnan','CIVIL-3A'),
('23CIVIL1102','Friday','Structural Analysis','CV-301','09:00','10:00','Room V-201','Dr. M. K. Varma','CIVIL-3A'),

('22CIVIL2201','Monday','Foundation Engineering','CV-401','09:00','10:00','Room V-301','Dr. M. K. Varma','CIVIL-4A'),
('22CIVIL2201','Monday','Construction Management','CV-403','10:00','11:00','Room V-302','Prof. R. Krishnan','CIVIL-4A'),
('22CIVIL2201','Tuesday','Foundation Lab','CV-401L','09:00','11:00','Lab V-201','Dr. M. K. Varma','CIVIL-4A'),
('22CIVIL2201','Wednesday','Construction Management','CV-403','09:00','10:00','Room V-302','Prof. R. Krishnan','CIVIL-4A'),
('22CIVIL2201','Thursday','Foundation Engineering','CV-401','09:00','10:00','Room V-301','Dr. M. K. Varma','CIVIL-4A'),
('22CIVIL2201','Friday','Construction Lab','CV-403L','09:00','11:00','Lab V-202','Prof. R. Krishnan','CIVIL-4A'),

-- ============================================================
-- EEE (23EEE1101, 23EEE1102)
-- ============================================================
('23EEE1101','Monday','Power Systems','EE-301','09:00','10:00','Room EE-201','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Monday','Control Systems','EE-303','10:00','11:00','Room EE-202','Prof. V. Sundaram','EEE-3A'),
('23EEE1101','Monday','Electrical Machines','EE-305','11:00','12:00','Room EE-203','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Tuesday','Power Lab','EE-301L','09:00','11:00','Lab EE-101','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Tuesday','Control Systems','EE-303','11:00','12:00','Room EE-202','Prof. V. Sundaram','EEE-3A'),
('23EEE1101','Wednesday','Electrical Machines','EE-305','09:00','10:00','Room EE-203','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Wednesday','Power Systems','EE-301','10:00','11:00','Room EE-201','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Thursday','Control Lab','EE-303L','09:00','11:00','Lab EE-102','Prof. V. Sundaram','EEE-3A'),
('23EEE1101','Thursday','Electrical Machines','EE-305','11:00','12:00','Room EE-203','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Friday','Power Systems','EE-301','09:00','10:00','Room EE-201','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1101','Friday','Control Systems','EE-303','10:00','11:00','Room EE-202','Prof. V. Sundaram','EEE-3A'),

('23EEE1102','Monday','Power Systems','EE-301','09:00','10:00','Room EE-201','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Monday','Control Systems','EE-303','10:00','11:00','Room EE-202','Prof. V. Sundaram','EEE-3A'),
('23EEE1102','Monday','Electrical Machines','EE-305','11:00','12:00','Room EE-203','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Tuesday','Power Lab','EE-301L','09:00','11:00','Lab EE-101','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Tuesday','Control Systems','EE-303','11:00','12:00','Room EE-202','Prof. V. Sundaram','EEE-3A'),
('23EEE1102','Wednesday','Electrical Machines','EE-305','09:00','10:00','Room EE-203','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Wednesday','Power Systems','EE-301','10:00','11:00','Room EE-201','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Thursday','Control Lab','EE-303L','09:00','11:00','Lab EE-102','Prof. V. Sundaram','EEE-3A'),
('23EEE1102','Thursday','Electrical Machines','EE-305','11:00','12:00','Room EE-203','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Friday','Power Systems','EE-301','09:00','10:00','Room EE-201','Dr. R. Ramakrishnan','EEE-3A'),
('23EEE1102','Friday','Control Systems','EE-303','10:00','11:00','Room EE-202','Prof. V. Sundaram','EEE-3A')

ON CONFLICT DO NOTHING;
