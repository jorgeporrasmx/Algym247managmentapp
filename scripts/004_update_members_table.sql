-- Update members table with comprehensive fields
-- This script adds all the new fields required for the updated member form

-- First, let's add all the new columns to the existing members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS person TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS paternal_last_name TEXT,
ADD COLUMN IF NOT EXISTS maternal_last_name TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS primary_phone TEXT,
ADD COLUMN IF NOT EXISTS address_1 TEXT,
ADD COLUMN IF NOT EXISTS access_type TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS referred_member TEXT,
ADD COLUMN IF NOT EXISTS selected_plan TEXT,
ADD COLUMN IF NOT EXISTS employee TEXT,
ADD COLUMN IF NOT EXISTS member_id TEXT,
ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS direct_debit TEXT DEFAULT 'No domiciliado',
ADD COLUMN IF NOT EXISTS how_did_you_hear TEXT,
ADD COLUMN IF NOT EXISTS contract_link TEXT,
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_members_first_name ON public.members(first_name);
CREATE INDEX IF NOT EXISTS idx_members_last_name ON public.members(paternal_last_name);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(primary_phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_start_date ON public.members(start_date);
CREATE INDEX IF NOT EXISTS idx_members_expiration_date ON public.members(expiration_date);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_direct_debit ON public.members(direct_debit);
CREATE INDEX IF NOT EXISTS idx_members_employee ON public.members(employee);

-- Update existing sample data to include some of the new fields
UPDATE public.members 
SET 
    first_name = CASE 
        WHEN name = 'John Smith' THEN 'John'
        WHEN name = 'Sarah Johnson' THEN 'Sarah'
        WHEN name = 'Mike Wilson' THEN 'Mike'
        WHEN name = 'Emily Davis' THEN 'Emily'
        WHEN name = 'David Brown' THEN 'David'
        ELSE SPLIT_PART(name, ' ', 1)
    END,
    paternal_last_name = CASE 
        WHEN name = 'John Smith' THEN 'Smith'
        WHEN name = 'Sarah Johnson' THEN 'Johnson'
        WHEN name = 'Mike Wilson' THEN 'Wilson'
        WHEN name = 'Emily Davis' THEN 'Davis'
        WHEN name = 'David Brown' THEN 'Brown'
        ELSE SPLIT_PART(name, ' ', 2)
    END,
    primary_phone = phone,
    start_date = '2024-01-01',
    status = 'active',
    access_type = 'full',
    city = 'New York',
    state = 'NY',
    zip_code = '10001',
    selected_plan = 'Premium',
    monthly_amount = 89.99,
    expiration_date = '2024-12-31',
    direct_debit = 'No domiciliado',
    how_did_you_hear = 'Social Media',
    version = '1.0'
WHERE phone IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN public.members.person IS 'Person type or category';
COMMENT ON COLUMN public.members.start_date IS 'Member start date';
COMMENT ON COLUMN public.members.paternal_last_name IS 'Paternal last name';
COMMENT ON COLUMN public.members.maternal_last_name IS 'Maternal last name';
COMMENT ON COLUMN public.members.first_name IS 'First name';
COMMENT ON COLUMN public.members.date_of_birth IS 'Date of birth';
COMMENT ON COLUMN public.members.primary_phone IS 'Primary phone number';
COMMENT ON COLUMN public.members.address_1 IS 'Primary address';
COMMENT ON COLUMN public.members.access_type IS 'Type of gym access';
COMMENT ON COLUMN public.members.city IS 'City';
COMMENT ON COLUMN public.members.state IS 'State';
COMMENT ON COLUMN public.members.zip_code IS 'ZIP code';
COMMENT ON COLUMN public.members.secondary_phone IS 'Secondary phone number';
COMMENT ON COLUMN public.members.emergency_contact_name IS 'Emergency contact name';
COMMENT ON COLUMN public.members.emergency_contact_phone IS 'Emergency contact phone';
COMMENT ON COLUMN public.members.referred_member IS 'Member who referred this person';
COMMENT ON COLUMN public.members.selected_plan IS 'Selected membership plan';
COMMENT ON COLUMN public.members.employee IS 'Employee information (free text)';
COMMENT ON COLUMN public.members.member_id IS 'Custom member ID';
COMMENT ON COLUMN public.members.monthly_amount IS 'Monthly membership amount';
COMMENT ON COLUMN public.members.expiration_date IS 'Membership expiration date';
COMMENT ON COLUMN public.members.direct_debit IS 'Direct debit status: No domiciliado or Domiciliado';
COMMENT ON COLUMN public.members.how_did_you_hear IS 'How the member heard about the gym';
COMMENT ON COLUMN public.members.contract_link IS 'Link to member contract';
COMMENT ON COLUMN public.members.version IS 'Data version for tracking changes';
