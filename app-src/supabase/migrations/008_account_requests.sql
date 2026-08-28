-- Migration: 008_account_requests.sql
-- Description: Account registration requests from landing page and Approver user provisioning

CREATE TABLE IF NOT EXISTS public.account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'viewer' CHECK (requested_role IN ('viewer', 'asset_manager', 'approver')),
  department TEXT NOT NULL,
  designation TEXT,
  phone_number TEXT,
  employee_id TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_requests_status ON public.account_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_requests_email ON public.account_requests(email);

ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit account requests" ON public.account_requests;
CREATE POLICY "Anyone can submit account requests"
  ON public.account_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Approvers can view account requests" ON public.account_requests;
CREATE POLICY "Approvers can view account requests"
  ON public.account_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'approver'
    )
  );

DROP POLICY IF EXISTS "Approvers can update account requests" ON public.account_requests;
CREATE POLICY "Approvers can update account requests"
  ON public.account_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'approver'
    )
  );
