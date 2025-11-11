-- Seed data for Sprint 1 testing - Payments and Contracts
-- This script creates realistic test data for payment flows

-- Insert additional test contracts with various expiry dates
INSERT INTO public.contracts (monday_contract_id, member_id, contract_type, start_date, end_date, monthly_fee, status) VALUES
-- Expiring soon (within 7 days)
('contract_006', (SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 'Premium', '2024-01-01', CURRENT_DATE + INTERVAL '3 days', 89.99, 'active'),
('contract_007', (SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 'Basic', '2024-02-01', CURRENT_DATE + INTERVAL '5 days', 49.99, 'active'),
('contract_008', (SELECT id FROM public.members WHERE monday_member_id = 'member_003'), 'VIP', '2024-01-15', CURRENT_DATE + INTERVAL '7 days', 129.99, 'active'),

-- Expiring in 2-4 weeks
('contract_009', (SELECT id FROM public.members WHERE monday_member_id = 'member_004'), 'Premium', '2024-03-01', CURRENT_DATE + INTERVAL '14 days', 89.99, 'active'),
('contract_010', (SELECT id FROM public.members WHERE monday_member_id = 'member_005'), 'Student', '2024-02-15', CURRENT_DATE + INTERVAL '21 days', 35.99, 'active'),

-- Already expired (for overdue testing)
('contract_011', (SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 'Premium', '2023-12-01', CURRENT_DATE - INTERVAL '5 days', 89.99, 'expired'),
('contract_012', (SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 'Basic', '2023-11-01', CURRENT_DATE - INTERVAL '15 days', 49.99, 'expired'),

-- Long-term contracts
('contract_013', (SELECT id FROM public.members WHERE monday_member_id = 'member_003'), 'Annual', '2024-01-01', '2024-12-31', 999.99, 'active'),
('contract_014', (SELECT id FROM public.members WHERE monday_member_id = 'member_004'), 'Quarterly', '2024-04-01', CURRENT_DATE + INTERVAL '90 days', 199.99, 'active')
ON CONFLICT (monday_contract_id) DO NOTHING;

-- Insert test payment records
INSERT INTO public.payments (
    member_id, 
    contract_id, 
    amount, 
    currency, 
    payment_type, 
    status, 
    payment_reference, 
    payment_link, 
    fiserv_payment_id, 
    due_date, 
    description,
    metadata
) VALUES
-- Recent payments (paid)
((SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_001'), 
 89.99, 'USD', 'membership', 'paid', 
 'PAY_001_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/001', 
 'FISERV_001_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE - INTERVAL '2 days', 
 'Premium membership payment - January 2024',
 '{"paid_via": "webhook_test", "stub_mode": true}'),

((SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_002'), 
 49.99, 'USD', 'membership', 'paid', 
 'PAY_002_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/002', 
 'FISERV_002_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE - INTERVAL '1 day', 
 'Basic membership payment - February 2024',
 '{"paid_via": "webhook_test", "stub_mode": true}'),

-- Pending payments (due soon)
((SELECT id FROM public.members WHERE monday_member_id = 'member_003'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_003'), 
 89.99, 'USD', 'membership', 'pending', 
 'PAY_003_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/003', 
 'FISERV_003_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE + INTERVAL '3 days', 
 'Premium membership renewal - March 2024',
 '{"stub_mode": true, "test_scenario": "expiring_soon"}'),

((SELECT id FROM public.members WHERE monday_member_id = 'member_004'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_004'), 
 129.99, 'USD', 'membership', 'pending', 
 'PAY_004_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/004', 
 'FISERV_004_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE + INTERVAL '5 days', 
 'VIP membership renewal - March 2024',
 '{"stub_mode": true, "test_scenario": "expiring_soon"}'),

-- Overdue payments
((SELECT id FROM public.members WHERE monday_member_id = 'member_005'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_005'), 
 49.99, 'USD', 'membership', 'pending', 
 'PAY_005_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/005', 
 'FISERV_005_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE - INTERVAL '7 days', 
 'Basic membership payment - Overdue',
 '{"stub_mode": true, "test_scenario": "overdue"}'),

((SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_011'), 
 89.99, 'USD', 'membership', 'pending', 
 'PAY_006_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/006', 
 'FISERV_006_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE - INTERVAL '15 days', 
 'Premium membership payment - Severely Overdue',
 '{"stub_mode": true, "test_scenario": "severely_overdue"}'),

-- Failed payments
((SELECT id FROM public.members WHERE monday_member_id = 'member_002'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_012'), 
 49.99, 'USD', 'membership', 'failed', 
 'PAY_007_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/007', 
 'FISERV_007_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE - INTERVAL '10 days', 
 'Basic membership payment - Failed',
 '{"stub_mode": true, "test_scenario": "failed_payment", "failure_reason": "insufficient_funds"}'),

-- Late fees
((SELECT id FROM public.members WHERE monday_member_id = 'member_003'), 
 (SELECT id FROM public.contracts WHERE monday_contract_id = 'contract_003'), 
 15.00, 'USD', 'late_fee', 'pending', 
 'PAY_008_' || EXTRACT(EPOCH FROM NOW())::text, 
 'https://stub-payment.com/pay/008', 
 'FISERV_008_' || EXTRACT(EPOCH FROM NOW())::text,
 CURRENT_DATE + INTERVAL '1 day', 
 'Late fee for overdue payment',
 '{"stub_mode": true, "test_scenario": "late_fee"}')

ON CONFLICT (payment_reference) DO NOTHING;

-- Insert test notifications
INSERT INTO public.notifications (
    member_id,
    payment_id,
    type,
    template_name,
    status,
    channel,
    recipient,
    subject,
    message_content,
    variables,
    sent_at,
    scheduled_for,
    metadata
) VALUES
-- Sent notifications
((SELECT id FROM public.members WHERE monday_member_id = 'member_001'), 
 (SELECT id FROM public.payments WHERE payment_reference LIKE 'PAY_001_%'), 
 'payment_confirmation', 'payment_confirmation', 'sent', 'email',
 'john.smith@email.com',
 'Payment Received - Premium Membership',
 'Hi John, thank you for your payment of $89.99 for your Premium membership. Your membership is now active until 2024-12-31.',
 '{"first_name": "John", "amount": "$89.99", "plan": "Premium", "end_date": "2024-12-31"}'::jsonb,
 CURRENT_DATE - INTERVAL '2 days',
 CURRENT_DATE - INTERVAL '2 days',
 '{"sent_via": "stub_email_service", "test_mode": true}'::jsonb),

-- Pending notifications (scheduled)
((SELECT id FROM public.members WHERE monday_member_id = 'member_003'), 
 (SELECT id FROM public.payments WHERE payment_reference LIKE 'PAY_003_%'), 
 'payment_reminder', 'payment_reminder_d3', 'pending', 'email',
 'mike.wilson@email.com',
 'Payment Due Soon - Premium Membership',
 'Hi Mike, your Premium membership payment of $89.99 is due in 3 days on ' || (CURRENT_DATE + INTERVAL '3 days')::text || '. Please pay online: https://stub-payment.com/pay/003',
 ('{"first_name": "Mike", "plan": "Premium", "amount": "$89.99", "due_date": "' || (CURRENT_DATE + INTERVAL '3 days')::text || '", "payment_link": "https://stub-payment.com/pay/003"}')::jsonb,
 NULL,
 CURRENT_DATE + INTERVAL '1 day',
 '{"scheduled_for": "d3_reminder", "test_mode": true}'::jsonb),

-- Overdue notifications
((SELECT id FROM public.members WHERE monday_member_id = 'member_005'), 
 (SELECT id FROM public.payments WHERE payment_reference LIKE 'PAY_005_%'), 
 'overdue_notice', 'overdue_notice_d1', 'sent', 'email',
 'david.brown@email.com',
 'Payment Overdue - Basic Membership',
 'Hi David, your Basic membership payment of $49.99 was due on ' || (CURRENT_DATE - INTERVAL '7 days')::text || ' and is now overdue. Please pay immediately: https://stub-payment.com/pay/005',
 ('{"first_name": "David", "plan": "Basic", "amount": "$49.99", "due_date": "' || (CURRENT_DATE - INTERVAL '7 days')::text || '", "payment_link": "https://stub-payment.com/pay/005"}')::jsonb,
 CURRENT_DATE - INTERVAL '1 day',
 CURRENT_DATE - INTERVAL '1 day',
 '{"sent_via": "stub_email_service", "test_mode": true}'::jsonb)

ON CONFLICT DO NOTHING;

-- Update contract statuses to match test scenarios
UPDATE public.contracts 
SET status = 'active' 
WHERE monday_contract_id IN ('contract_006', 'contract_007', 'contract_008', 'contract_009', 'contract_010', 'contract_013', 'contract_014');

UPDATE public.contracts 
SET status = 'expired' 
WHERE monday_contract_id IN ('contract_011', 'contract_012');

-- Add comments for test data documentation
COMMENT ON TABLE public.payments IS 'Payment tracking with test data for Sprint 1 - includes paid, pending, overdue, and failed payments';
COMMENT ON TABLE public.notifications IS 'Notification tracking with test data for Sprint 1 - includes sent and scheduled notifications';

-- Create a view for easy testing of payment flows
CREATE OR REPLACE VIEW public.payment_test_summary AS
SELECT 
    p.status,
    COUNT(*) as count,
    SUM(p.amount) as total_amount,
    AVG(p.amount) as average_amount
FROM public.payments p
WHERE p.metadata->>'stub_mode' = 'true'
GROUP BY p.status
ORDER BY p.status;

-- Create a view for easy testing of notification flows
CREATE OR REPLACE VIEW public.notification_test_summary AS
SELECT 
    n.type,
    n.status,
    COUNT(*) as count
FROM public.notifications n
WHERE n.metadata->>'test_mode' = 'true'
GROUP BY n.type, n.status
ORDER BY n.type, n.status;
