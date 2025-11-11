-- Create employee_login_credentials table
CREATE TABLE IF NOT EXISTS public.employee_login_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    employee_type TEXT NOT NULL CHECK (employee_type IN ('A', 'B')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_login_username ON public.employee_login_credentials (username);
CREATE INDEX IF NOT EXISTS idx_employee_login_employee_id ON public.employee_login_credentials (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_login_type ON public.employee_login_credentials (employee_type);
CREATE INDEX IF NOT EXISTS idx_employee_login_active ON public.employee_login_credentials (is_active);

-- Enable Row Level Security
ALTER TABLE public.employee_login_credentials ENABLE ROW LEVEL SECURITY;

-- Public read access policy
CREATE POLICY "Allow public read access to employee_login_credentials" ON public.employee_login_credentials FOR SELECT USING (true);

-- Public write access policy
CREATE POLICY "Allow public writes to employee_login_credentials" ON public.employee_login_credentials FOR ALL USING (true) WITH CHECK (true);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_employee_login_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_login_updated_at ON public.employee_login_credentials;
CREATE TRIGGER trg_employee_login_updated_at
BEFORE UPDATE ON public.employee_login_credentials
FOR EACH ROW
EXECUTE FUNCTION public.set_employee_login_updated_at();

-- Add comments
COMMENT ON TABLE public.employee_login_credentials IS 'Employee login credentials and access types';
COMMENT ON COLUMN public.employee_login_credentials.username IS 'Unique username for employee login';
COMMENT ON COLUMN public.employee_login_credentials.password_hash IS 'Hashed password for security';
COMMENT ON COLUMN public.employee_login_credentials.employee_type IS 'Access type: A (full access) or B (no payment access)';
COMMENT ON COLUMN public.employee_login_credentials.is_active IS 'Whether the login credentials are active';
COMMENT ON COLUMN public.employee_login_credentials.last_login IS 'Timestamp of last successful login';
