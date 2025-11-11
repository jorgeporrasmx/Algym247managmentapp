-- Update direct_debit field to use text options instead of boolean
-- This script updates the direct_debit field to use "No domiciliado" and "Domiciliado" options

-- First, add the new text column
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS direct_debit_new TEXT DEFAULT 'No domiciliado';

-- Update existing data: convert boolean to text
UPDATE public.members 
SET direct_debit_new = CASE 
    WHEN direct_debit = true THEN 'Domiciliado'
    WHEN direct_debit = false THEN 'No domiciliado'
    ELSE 'No domiciliado'
END
WHERE direct_debit IS NOT NULL;

-- Drop the old boolean column
ALTER TABLE public.members DROP COLUMN IF EXISTS direct_debit;

-- Rename the new column to the original name
ALTER TABLE public.members RENAME COLUMN direct_debit_new TO direct_debit;

-- Create index for the new field
CREATE INDEX IF NOT EXISTS idx_members_direct_debit ON public.members(direct_debit);

-- Add comment to document the field
COMMENT ON COLUMN public.members.direct_debit IS 'Direct debit status: No domiciliado or Domiciliado';
