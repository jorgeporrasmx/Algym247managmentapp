-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monday_member_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monday_contract_id TEXT UNIQUE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    contract_type TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    monthly_fee DECIMAL(10,2),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_log table for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'received',
    error_message TEXT
);

-- Enable Row Level Security (RLS) - for future admin authentication
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a webhook-driven system)
-- Note: In production, you'd want proper authentication and more restrictive policies
CREATE POLICY "Allow public read access to members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public read access to contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Allow webhook writes to all tables" ON public.members FOR ALL USING (true);
CREATE POLICY "Allow webhook writes to contracts" ON public.contracts FOR ALL USING (true);
CREATE POLICY "Allow webhook writes to webhook_log" ON public.webhook_log FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_monday_id ON public.members(monday_member_id);
CREATE INDEX IF NOT EXISTS idx_contracts_monday_id ON public.contracts(monday_contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_member_id ON public.contracts(member_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_type ON public.webhook_log(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_log_processed_at ON public.webhook_log(processed_at);

-- Adding sample data for testing the dashboard
-- Insert sample members
INSERT INTO public.members (monday_member_id, name, email, phone, status) VALUES
('member_001', 'John Smith', 'john.smith@email.com', '+1-555-0101', 'active'),
('member_002', 'Sarah Johnson', 'sarah.johnson@email.com', '+1-555-0102', 'active'),
('member_003', 'Mike Wilson', 'mike.wilson@email.com', '+1-555-0103', 'inactive'),
('member_004', 'Emily Davis', 'emily.davis@email.com', '+1-555-0104', 'active'),
('member_005', 'David Brown', 'david.brown@email.com', '+1-555-0105', 'active')
ON CONFLICT (monday_member_id) DO NOTHING;

-- Insert sample contracts
INSERT INTO public.contracts (monday_contract_id, member_id, contract_type, start_date, end_date, monthly_fee, status) VALUES
('contract_001', (SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 'Premium', '2024-01-01', '2024-12-31', 89.99, 'active'),
('contract_002', (SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 'Basic', '2024-02-01', '2024-12-31', 49.99, 'active'),
('contract_003', (SELECT id FROM public.members WHERE monday_member_id = 'member_003'), 'Premium', '2023-12-01', '2024-11-30', 89.99, 'expired'),
('contract_004', (SELECT id FROM public.members WHERE monday_member_id = 'member_004'), 'VIP', '2024-03-01', '2025-02-28', 129.99, 'active'),
('contract_005', (SELECT id FROM public.members WHERE monday_member_id = 'member_005'), 'Basic', '2024-01-15', '2024-12-31', 49.99, 'active')
ON CONFLICT (monday_contract_id) DO NOTHING;
