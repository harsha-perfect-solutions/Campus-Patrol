-- ENUMS
CREATE TYPE public.app_role AS ENUM ('faculty','student','hod','admin');
CREATE TYPE public.violation_status AS ENUM ('reported','notified','awaiting_explanation','explanation_submitted','under_review','exonerated','warned','escalated');
CREATE TYPE public.permission_status AS ENUM ('pending','approved','rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  staff_code TEXT,
  student_code TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('faculty','hod','admin'))
$$;

CREATE OR REPLACE FUNCTION public.my_student_code()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT student_code FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, department, staff_code, student_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    NULLIF(NEW.raw_user_meta_data->>'staff_code',''),
    NULLIF(NEW.raw_user_meta_data->>'student_code','')
  );
  r := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'faculty')::public.app_role;
  IF r = 'admin' THEN r := 'faculty'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STUDENTS
CREATE TABLE public.students (
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
GRANT SELECT ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students readable by staff or self" ON public.students FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR student_code = public.my_student_code());

-- CLASS SLOTS
CREATE TABLE public.class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  code TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  room TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  faculty_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
GRANT SELECT ON public.class_slots TO authenticated;
GRANT ALL ON public.class_slots TO service_role;
ALTER TABLE public.class_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class slots readable" ON public.class_slots FOR SELECT TO authenticated USING (true);

-- MOVEMENT PERMISSIONS
CREATE TABLE public.movement_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL REFERENCES public.students(student_code) ON DELETE CASCADE,
  reason_type TEXT NOT NULL,
  details TEXT,
  issued_by TEXT NOT NULL,
  on_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from TIME NOT NULL,
  valid_until TIME NOT NULL,
  status public.permission_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movement_permissions TO authenticated;
GRANT INSERT, UPDATE ON public.movement_permissions TO authenticated;
GRANT ALL ON public.movement_permissions TO service_role;
ALTER TABLE public.movement_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions readable" ON public.movement_permissions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR student_code = public.my_student_code());
CREATE POLICY "staff manage permissions" ON public.movement_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update permissions" ON public.movement_permissions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- VIOLATIONS
CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  student_code TEXT NOT NULL REFERENCES public.students(student_code) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  semester INTEGER NOT NULL,
  class_subject TEXT,
  class_time TEXT,
  room TEXT,
  location_found TEXT NOT NULL,
  remarks TEXT NOT NULL DEFAULT '',
  evidence_url TEXT,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_by_name TEXT NOT NULL,
  status public.violation_status NOT NULL DEFAULT 'reported',
  decision TEXT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  explanation_deadline TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  incident_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.violations TO authenticated;
GRANT ALL ON public.violations TO service_role;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "violations read" ON public.violations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'hod') OR public.has_role(auth.uid(),'admin')
    OR reported_by = auth.uid()
    OR student_code = public.my_student_code()
  );
CREATE POLICY "faculty report violations" ON public.violations FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND reported_by = auth.uid());
CREATE POLICY "hod decides violations" ON public.violations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'hod') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'hod') OR public.has_role(auth.uid(),'admin'));

-- EXPLANATIONS
CREATE TABLE public.explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.explanations TO authenticated;
GRANT ALL ON public.explanations TO service_role;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "explanations read" ON public.explanations FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR student_code = public.my_student_code());
CREATE POLICY "student submits explanation" ON public.explanations FOR INSERT TO authenticated
  WITH CHECK (student_code = public.my_student_code());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL DEFAULT '',
  entity_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read staff" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'hod') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- DEMO DATA
INSERT INTO public.students (student_code, name, department, year, section, semester) VALUES
  ('23CSE1012','Ashok Dora','CSE','3rd Year','Section A',6),
  ('23CSE1044','Meera Nair','CSE','3rd Year','Section A',6),
  ('23ECE2031','Karthik Reddy','ECE','2nd Year','Section B',4),
  ('22MEC3007','Sneha Patil','MECH','4th Year','Section C',8);

INSERT INTO public.class_slots (subject, code, department, year, section, room, faculty_name, day_of_week, start_time, end_time) VALUES
  ('Data Structures','CS-304','CSE','3rd Year','Section A','Room C-204','Prof. Ravi Kumar',1,'09:00','10:00'),
  ('Data Structures','CS-304','CSE','3rd Year','Section A','Room C-204','Prof. Ravi Kumar',1,'10:00','11:00'),
  ('Operating Systems','CS-308','CSE','3rd Year','Section A','Room C-301','Prof. Ravi Kumar',1,'14:00','15:00'),
  ('Database Management','CS-306','CSE','3rd Year','Section A','Room B-102','Dr. Anjali Rao',2,'10:00','11:00'),
  ('Technical Seminar','CS-390','CSE','3rd Year','Section A','Seminar Hall 2','Prof. Ravi Kumar',2,'15:00','16:00'),
  ('Data Structures Lab','CS-304L','CSE','3rd Year','Section A','Lab C-1',
   'Prof. Ravi Kumar',3,'09:00','11:00'),
  ('Operating Systems','CS-308','CSE','3rd Year','Section A','Room C-301','Prof. Ravi Kumar',4,'11:00','12:00'),
  ('Database Management','CS-306','CSE','3rd Year','Section A','Room B-102','Dr. Anjali Rao',5,'09:00','10:00'),
  ('Signals & Systems','EC-204','ECE','2nd Year','Section B','Room E-110','Dr. S. Venkat',1,'10:00','11:00'),
  ('Signals & Systems','EC-204','ECE','2nd Year','Section B','Room E-110','Dr. S. Venkat',2,'10:00','11:00'),
  ('Signals & Systems','EC-204','ECE','2nd Year','Section B','Room E-110','Dr. S. Venkat',3,'10:00','11:00'),
  ('Signals & Systems','EC-204','ECE','2nd Year','Section B','Room E-110','Dr. S. Venkat',4,'10:00','11:00'),
  ('Signals & Systems','EC-204','ECE','2nd Year','Section B','Room E-110','Dr. S. Venkat',5,'10:00','11:00'),
  ('Thermodynamics','ME-402','MECH','4th Year','Section C','Room M-208','Dr. P. Iyer',1,'11:00','12:00'),
  ('Thermodynamics','ME-402','MECH','4th Year','Section C','Room M-208','Dr. P. Iyer',3,'11:00','12:00');

INSERT INTO public.movement_permissions (student_code, reason_type, details, issued_by, valid_from, valid_until) VALUES
  ('23CSE1044','Library','Reference book issue','Dr. Anjali Rao','09:00','23:50'),
  ('23ECE2031','Medical','Medical room visit','Dr. S. Venkat','09:00','23:50');
