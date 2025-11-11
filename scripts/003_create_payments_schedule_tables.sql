-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT DEFAULT 'credit_card',
    status TEXT DEFAULT 'completed',
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedule table
CREATE TABLE IF NOT EXISTS public.schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    instructor TEXT,
    class_type TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_capacity INTEGER DEFAULT 20,
    current_bookings INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table for class registrations
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES public.schedule(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public read access to schedule" ON public.schedule FOR SELECT USING (true);
CREATE POLICY "Allow public read access to bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow webhook writes to payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow webhook writes to schedule" ON public.schedule FOR ALL USING (true);
CREATE POLICY "Allow webhook writes to bookings" ON public.bookings FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_schedule_start_time ON public.schedule(start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_class_type ON public.schedule(class_type);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_id ON public.bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON public.bookings(member_id);

-- Insert sample schedule data
INSERT INTO public.schedule (class_name, instructor, class_type, start_time, end_time, max_capacity, description) VALUES
('Morning Yoga', 'Sarah Johnson', 'Yoga', NOW() + INTERVAL '1 day' + INTERVAL '8 hours', NOW() + INTERVAL '1 day' + INTERVAL '9 hours', 15, 'Gentle morning yoga session'),
('HIIT Training', 'Mike Wilson', 'Cardio', NOW() + INTERVAL '1 day' + INTERVAL '18 hours', NOW() + INTERVAL '1 day' + INTERVAL '19 hours', 20, 'High-intensity interval training'),
('Strength Training', 'David Brown', 'Strength', NOW() + INTERVAL '2 days' + INTERVAL '10 hours', NOW() + INTERVAL '2 days' + INTERVAL '11 hours', 12, 'Weight training session'),
('Zumba Dance', 'Lisa Garcia', 'Dance', NOW() + INTERVAL '2 days' + INTERVAL '19 hours', NOW() + INTERVAL '2 days' + INTERVAL '20 hours', 25, 'Fun dance fitness class'),
('Pilates', 'Emily Davis', 'Pilates', NOW() + INTERVAL '3 days' + INTERVAL '9 hours', NOW() + INTERVAL '3 days' + INTERVAL '10 hours', 10, 'Core strengthening pilates'),
('Boxing', 'James Miller', 'Combat', NOW() + INTERVAL '3 days' + INTERVAL '17 hours', NOW() + INTERVAL '3 days' + INTERVAL '18 hours', 15, 'Boxing and kickboxing training')
ON CONFLICT DO NOTHING;

-- Insert sample payments data
INSERT INTO public.payments (contract_id, member_id, amount, payment_date, payment_method, status, transaction_id) VALUES
((SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_001'), (SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 89.99, CURRENT_DATE - INTERVAL '5 days', 'credit_card', 'completed', 'txn_001'),
((SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_002'), (SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 49.99, CURRENT_DATE - INTERVAL '3 days', 'bank_transfer', 'completed', 'txn_002'),
((SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_004'), (SELECT id FROM public.members WHERE monday_member_id = 'member_004'), 129.99, CURRENT_DATE - INTERVAL '1 day', 'credit_card', 'completed', 'txn_003'),
((SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_005'), (SELECT id FROM public.members WHERE monday_member_id = 'member_005'), 49.99, CURRENT_DATE, 'cash', 'completed', 'txn_004')
ON CONFLICT DO NOTHING;

-- Insert sample bookings
INSERT INTO public.bookings (schedule_id, member_id, status) VALUES
((SELECT id FROM public.schedule WHERE class_name = 'Morning Yoga'), (SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 'confirmed'),
((SELECT id FROM public.schedule WHERE class_name = 'HIIT Training'), (SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 'confirmed'),
((SELECT id FROM public.schedule WHERE class_name = 'Strength Training'), (SELECT id FROM public.members WHERE monday_member_id = 'member_004'), 'confirmed'),
((SELECT id FROM public.schedule WHERE class_name = 'Zumba Dance'), (SELECT id FROM public.members WHERE monday_member_id = 'member_005'), 'confirmed')
ON CONFLICT DO NOTHING;

-- Update current_bookings count
UPDATE public.schedule SET current_bookings = (
    SELECT COUNT(*) FROM public.bookings 
    WHERE bookings.schedule_id = schedule.id AND bookings.status = 'confirmed'
);
