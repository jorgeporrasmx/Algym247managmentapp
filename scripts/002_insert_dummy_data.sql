-- Insert dummy data for gym management system
-- This script adds sample members, contracts, and webhook logs for testing

-- Insert sample members
INSERT INTO public.members (
  monday_pulse_id,
  name,
  email,
  phone,
  membership_type,
  status,
  join_date,
  emergency_contact,
  notes
) VALUES
  ('pulse_001', 'John Smith', 'john.smith@email.com', '+1-555-0101', 'Premium', 'active', '2024-01-15', 'Jane Smith - 555-0102', 'Regular gym user, prefers morning workouts'),
  ('pulse_002', 'Sarah Johnson', 'sarah.j@email.com', '+1-555-0103', 'Basic', 'active', '2024-02-20', 'Mike Johnson - 555-0104', 'New member, interested in group classes'),
  ('pulse_003', 'Mike Davis', 'mike.davis@email.com', '+1-555-0105', 'Premium', 'active', '2024-01-08', 'Lisa Davis - 555-0106', 'Personal training client'),
  ('pulse_004', 'Emily Wilson', 'emily.w@email.com', '+1-555-0107', 'Student', 'active', '2024-03-01', 'Tom Wilson - 555-0108', 'College student, evening workouts'),
  ('pulse_005', 'David Brown', 'david.brown@email.com', '+1-555-0109', 'Basic', 'inactive', '2023-11-15', 'Mary Brown - 555-0110', 'On hold due to injury'),
  ('pulse_006', 'Lisa Garcia', 'lisa.garcia@email.com', '+1-555-0111', 'Premium', 'active', '2024-02-10', 'Carlos Garcia - 555-0112', 'Yoga enthusiast'),
  ('pulse_007', 'James Miller', 'james.miller@email.com', '+1-555-0113', 'Basic', 'active', '2024-03-15', 'Anna Miller - 555-0114', 'Weight training focus'),
  ('pulse_008', 'Amanda Taylor', 'amanda.t@email.com', '+1-555-0115', 'Student', 'active', '2024-01-25', 'Robert Taylor - 555-0116', 'Swimming and cardio'),
  ('pulse_009', 'Chris Anderson', 'chris.anderson@email.com', '+1-555-0117', 'Premium', 'pending', '2024-03-20', 'Kelly Anderson - 555-0118', 'New signup, orientation scheduled'),
  ('pulse_010', 'Jessica Martinez', 'jessica.m@email.com', '+1-555-0119', 'Basic', 'active', '2024-02-05', 'Luis Martinez - 555-0120', 'Group fitness classes');

-- Insert sample contracts
INSERT INTO public.contracts (
  monday_pulse_id,
  member_id,
  contract_type,
  start_date,
  end_date,
  monthly_fee,
  status,
  payment_method,
  auto_renewal,
  terms
) VALUES
  ('contract_001', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_001'), '12-month', '2024-01-15', '2025-01-15', 89.99, 'active', 'credit_card', true, 'Standard 12-month premium membership with full gym access'),
  ('contract_002', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_002'), 'month-to-month', '2024-02-20', NULL, 49.99, 'active', 'bank_transfer', false, 'Basic monthly membership with gym access'),
  ('contract_003', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_003'), '6-month', '2024-01-08', '2024-07-08', 79.99, 'active', 'credit_card', true, 'Premium 6-month with personal training sessions'),
  ('contract_004', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_004'), 'student', '2024-03-01', '2024-08-31', 29.99, 'active', 'cash', false, 'Student discount membership - semester rate'),
  ('contract_005', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_005'), 'month-to-month', '2023-11-15', NULL, 49.99, 'suspended', 'credit_card', false, 'Membership on hold due to medical reasons'),
  ('contract_006', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_006'), '12-month', '2024-02-10', '2025-02-10', 89.99, 'active', 'bank_transfer', true, 'Premium annual membership with yoga classes'),
  ('contract_007', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_007'), 'month-to-month', '2024-03-15', NULL, 49.99, 'active', 'credit_card', false, 'Basic membership with weight room access'),
  ('contract_008', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_008'), 'student', '2024-01-25', '2024-12-25', 29.99, 'active', 'bank_transfer', true, 'Student annual membership with pool access'),
  ('contract_009', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_009'), '3-month', '2024-03-20', '2024-06-20', 69.99, 'pending', 'credit_card', false, 'Trial premium membership - 3 months'),
  ('contract_010', (SELECT id FROM public.members WHERE monday_pulse_id = 'pulse_010'), 'month-to-month', '2024-02-05', NULL, 49.99, 'active', 'cash', false, 'Basic membership with group fitness classes');

-- Insert sample webhook logs
INSERT INTO public.webhook_log (
  monday_pulse_id,
  webhook_type,
  payload,
  processed_at,
  status,
  error_message
) VALUES
  ('pulse_001', 'pulse_created', '{"pulse_id": "pulse_001", "name": "John Smith", "email": "john.smith@email.com"}', NOW() - INTERVAL '5 days', 'success', NULL),
  ('pulse_002', 'pulse_created', '{"pulse_id": "pulse_002", "name": "Sarah Johnson", "email": "sarah.j@email.com"}', NOW() - INTERVAL '4 days', 'success', NULL),
  ('pulse_003', 'column_updated', '{"pulse_id": "pulse_003", "column": "status", "value": "active"}', NOW() - INTERVAL '3 days', 'success', NULL),
  ('pulse_004', 'pulse_created', '{"pulse_id": "pulse_004", "name": "Emily Wilson", "email": "emily.w@email.com"}', NOW() - INTERVAL '2 days', 'success', NULL),
  ('pulse_005', 'column_updated', '{"pulse_id": "pulse_005", "column": "status", "value": "inactive"}', NOW() - INTERVAL '1 day', 'success', NULL),
  ('pulse_006', 'pulse_created', '{"pulse_id": "pulse_006", "name": "Lisa Garcia", "email": "lisa.garcia@email.com"}', NOW() - INTERVAL '6 hours', 'success', NULL),
  ('pulse_007', 'column_updated', '{"pulse_id": "pulse_007", "column": "membership_type", "value": "Basic"}', NOW() - INTERVAL '3 hours', 'success', NULL),
  ('pulse_008', 'pulse_created', '{"pulse_id": "pulse_008", "name": "Amanda Taylor", "email": "amanda.t@email.com"}', NOW() - INTERVAL '2 hours', 'success', NULL),
  ('pulse_009', 'pulse_created', '{"pulse_id": "pulse_009", "name": "Chris Anderson", "email": "chris.anderson@email.com"}', NOW() - INTERVAL '1 hour', 'success', NULL),
  ('pulse_010', 'column_updated', '{"pulse_id": "pulse_010", "column": "phone", "value": "+1-555-0119"}', NOW() - INTERVAL '30 minutes', 'success', NULL);

-- Update statistics for better dashboard display
-- This ensures we have realistic data for the dashboard metrics
