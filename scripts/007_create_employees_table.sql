-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'terminated')),
    hire_date DATE,
    
    -- Personal Information
    paternal_last_name TEXT,
    maternal_last_name TEXT,
    first_name TEXT,
    date_of_birth DATE,
    email TEXT,
    primary_phone TEXT,
    
    -- Address Information
    address_1 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    secondary_phone TEXT,
    
    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    -- Employment Information
    department TEXT,
    employee_id TEXT UNIQUE,
    salary DECIMAL(10,2),
    access_level TEXT CHECK (access_level IN ('admin', 'manager', 'staff', 'limited')),
    manager TEXT,
    work_schedule TEXT CHECK (work_schedule IN ('full_time', 'part_time', 'contract', 'intern')),
    
    -- Additional Information
    skills TEXT,
    certifications TEXT,
    notes TEXT,
    version TEXT DEFAULT '1.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees (name);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees (email);
CREATE INDEX IF NOT EXISTS idx_employees_position ON public.employees (position);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees (status);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees (employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees (manager);

-- Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Public read access policy (match existing style)
CREATE POLICY "Allow public read access to employees" ON public.employees FOR SELECT USING (true);

-- Public write access for now (align with webhook-style openness used elsewhere)
CREATE POLICY "Allow public writes to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.set_employees_updated_at();

-- Insert sample employees data
INSERT INTO public.employees (
    name, position, status, hire_date, first_name, paternal_last_name, 
    email, primary_phone, department, employee_id, salary, access_level, 
    work_schedule, city, state
) VALUES
('John Manager', 'manager', 'active', '2024-01-15', 'John', 'Manager', 'john.manager@gym.com', '+1-555-1001', 'management', 'EMP001', 5500.00, 'manager', 'full_time', 'New York', 'NY'),
('Sarah Trainer', 'trainer', 'active', '2024-02-01', 'Sarah', 'Trainer', 'sarah.trainer@gym.com', '+1-555-1002', 'fitness', 'EMP002', 4200.00, 'staff', 'full_time', 'New York', 'NY'),
('Mike Receptionist', 'receptionist', 'active', '2024-01-20', 'Mike', 'Receptionist', 'mike.reception@gym.com', '+1-555-1003', 'front_desk', 'EMP003', 3200.00, 'staff', 'full_time', 'New York', 'NY'),
('Lisa Instructor', 'instructor', 'active', '2024-03-01', 'Lisa', 'Instructor', 'lisa.instructor@gym.com', '+1-555-1004', 'fitness', 'EMP004', 3800.00, 'staff', 'part_time', 'New York', 'NY'),
('David Maintenance', 'maintenance', 'active', '2024-01-10', 'David', 'Maintenance', 'david.maintenance@gym.com', '+1-555-1005', 'maintenance', 'EMP005', 3500.00, 'limited', 'full_time', 'New York', 'NY')
ON CONFLICT (employee_id) DO NOTHING;

-- Add comments to document the fields
COMMENT ON TABLE public.employees IS 'Employee information and management';
COMMENT ON COLUMN public.employees.name IS 'Full employee name';
COMMENT ON COLUMN public.employees.position IS 'Job position/title';
COMMENT ON COLUMN public.employees.status IS 'Employee status: active, inactive, pending, terminated';
COMMENT ON COLUMN public.employees.hire_date IS 'Date when employee was hired';
COMMENT ON COLUMN public.employees.department IS 'Department where employee works';
COMMENT ON COLUMN public.employees.employee_id IS 'Unique employee identifier';
COMMENT ON COLUMN public.employees.salary IS 'Monthly salary amount';
COMMENT ON COLUMN public.employees.access_level IS 'System access level: admin, manager, staff, limited';
COMMENT ON COLUMN public.employees.work_schedule IS 'Work schedule type: full_time, part_time, contract, intern';
COMMENT ON COLUMN public.employees.manager IS 'Direct manager name';
COMMENT ON COLUMN public.employees.skills IS 'Employee skills and competencies';
COMMENT ON COLUMN public.employees.certifications IS 'Professional certifications';
COMMENT ON COLUMN public.employees.notes IS 'Additional notes about the employee';
