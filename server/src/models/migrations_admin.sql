-- Migrations for admin-related tables: bank_forwards and refunds

CREATE TABLE IF NOT EXISTS bank_forwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  forwarded_by uuid,
  recipients jsonb,
  message text,
  attachments jsonb,
  method text,
  status text DEFAULT 'queued',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid,
  admin_id uuid,
  amount integer,
  reason text,
  razorpay_refund_id text,
  status text,
  created_at timestamptz DEFAULT now()
);

-- Note: Audit logs table already exists in migrations.sql. If not, add it similarly.
