
-- PostgreSQL migrations for Dhanseva legal services
-- Created: 2025-10-27
-- Notes: This schema uses UUID primary keys, timestamptz for dates, and JSONB for flexible service-specific payloads.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- Users table: clients, lawyers, admins
CREATE TABLE IF NOT EXISTS users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	role text NOT NULL CHECK (role IN ('client','lawyer','admin')),
	full_name text NOT NULL,
	email text UNIQUE,
	phone text,
	password_hash text, -- optional, if using local auth
	profile jsonb DEFAULT '{}'::jsonb,
	is_active boolean DEFAULT true,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Specializations for lawyers (Civil, Criminal, Family, Consumer, Property, Corporate etc.)
CREATE TABLE IF NOT EXISTS specializations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	code text UNIQUE NOT NULL,
	name text NOT NULL,
	description text
);

-- Many-to-many mapping between lawyers (users) and specializations
CREATE TABLE IF NOT EXISTS lawyer_specializations (
	lawyer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	specialization_id uuid NOT NULL REFERENCES specializations(id) ON DELETE CASCADE,
	PRIMARY KEY (lawyer_id, specialization_id)
);

-- Core services catalogue (consultation, affidavit, POA, lease draft, will, NOC, notices, etc.)
CREATE TABLE IF NOT EXISTS services (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	code text UNIQUE NOT NULL,
	category text NOT NULL, -- e.g., 'personal', 'business', 'bank', 'gov', 'specialized'
	name text NOT NULL,
	description text,
	requires_payment boolean DEFAULT false,
	default_price numeric(12,2),
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Case / Request record created when a client submits a service form
CREATE TABLE IF NOT EXISTS cases (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	case_number text UNIQUE, -- optional human-friendly identifier
	client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	service_id uuid NOT NULL REFERENCES services(id),
	title text,
	description text,
	status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','assigned','scheduled','in_progress','completed','closed','cancelled')),
	assigned_lawyer_id uuid REFERENCES users(id),
	priority smallint DEFAULT 0,
	confidential boolean DEFAULT false,
	meta jsonb DEFAULT '{}'::jsonb, -- flexible metadata (jurisdiction, stamp duty state, etc)
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Generic service-specific payloads (Affidavit fields, POA fields, Lease details, Will details etc.)
CREATE TABLE IF NOT EXISTS service_payloads (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
	payload jsonb NOT NULL, -- structured data for the specific service
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Files / documents uploaded by users, linked to cases or standalone
CREATE TABLE IF NOT EXISTS documents (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
	uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
	original_name text,
	storage_key text, -- e.g., s3 key or local path
	storage_provider text DEFAULT 's3',
	mime_type text,
	size_bytes bigint,
	checksum text,
	metadata jsonb DEFAULT '{}'::jsonb,
	created_at timestamptz DEFAULT now()
);

-- File storage metadata (if additional info required)
CREATE TABLE IF NOT EXISTS file_storage (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	document_id uuid UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
	provider text NOT NULL,
	bucket text,
	key text,
	encrypted boolean DEFAULT true,
	created_at timestamptz DEFAULT now()
);

-- Appointments / Consultations scheduling
CREATE TABLE IF NOT EXISTS appointments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
	client_id uuid REFERENCES users(id) ON DELETE CASCADE,
	lawyer_id uuid REFERENCES users(id) ON DELETE SET NULL,
	mode text NOT NULL CHECK (mode IN ('video','phone','chat','in_person')),
	scheduled_at timestamptz NOT NULL,
	duration_minutes integer DEFAULT 30,
	timezone text,
	status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','rescheduled','completed','cancelled')),
	notes text,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Lawyer availability for routing/scheduling
CREATE TABLE IF NOT EXISTS lawyer_availability (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	lawyer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
	start_time time NOT NULL,
	end_time time NOT NULL,
	timezone text DEFAULT 'UTC',
	is_available boolean DEFAULT true,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
	payer_id uuid REFERENCES users(id) ON DELETE SET NULL,
	amount numeric(12,2) NOT NULL,
	currency text DEFAULT 'INR',
	provider text, -- e.g., 'razorpay'
	provider_payment_id text,
	status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','captured','failed','refunded')),
	meta jsonb DEFAULT '{}'::jsonb,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);

-- Routing assignments and logs (how a case was routed to a lawyer)
CREATE TABLE IF NOT EXISTS routing_assignments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
	assigned_lawyer_id uuid REFERENCES users(id),
	assigned_by uuid REFERENCES users(id), -- admin or system
	reason text,
	score numeric, -- routing score if any
	created_at timestamptz DEFAULT now()
);

-- Audit logs for sensitive actions
CREATE TABLE IF NOT EXISTS audit_logs (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES users(id),
	action text NOT NULL,
	details jsonb DEFAULT '{}'::jsonb,
	ip_address text,
	created_at timestamptz DEFAULT now()
);

-- Indexes to help queries
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_lawyer ON cases(assigned_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lawyer ON appointments(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);

-- Example seed data for common specializations and a few services (optional)
INSERT INTO specializations (id, code, name)
SELECT gen_random_uuid(), 'civil', 'Civil Law'
WHERE NOT EXISTS (SELECT 1 FROM specializations WHERE code = 'civil');

INSERT INTO specializations (id, code, name)
SELECT gen_random_uuid(), 'criminal', 'Criminal Law'
WHERE NOT EXISTS (SELECT 1 FROM specializations WHERE code = 'criminal');

INSERT INTO services (id, code, category, name, description, requires_payment)
SELECT gen_random_uuid(), 'consultation_basic', 'personal', 'Online Legal Consultation', 'Book a 1:1 consultation with a lawyer (video/phone/chat)', true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE code = 'consultation_basic');

-- End of migrations
