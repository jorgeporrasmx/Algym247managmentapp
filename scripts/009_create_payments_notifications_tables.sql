-- Create payments table for payment tracking and Fiserv integration
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_type TEXT NOT NULL CHECK (payment_type IN ('membership', 'renewal', 'late_fee', 'penalty', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
    
    -- Fiserv integration fields
    fiserv_payment_id TEXT UNIQUE,
    payment_link TEXT,
    payment_reference TEXT UNIQUE,
    external_reference TEXT,
    
    -- Payment details
    due_date DATE,
    paid_date TIMESTAMP WITH TIME ZONE,
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'online')),
    
    -- Metadata
    description TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for dunning and communication tracking
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    
    -- Notification details
    type TEXT NOT NULL CHECK (type IN ('payment_reminder', 'expiry_warning', 'renewal_offer', 'overdue_notice', 'payment_confirmation', 'membership_expired')),
    template_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    
    -- Communication channels
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),
    recipient TEXT NOT NULL, -- email, phone number, etc.
    
    -- Message content
    subject TEXT,
    message_content TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Template variables used
    
    -- Delivery tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification templates table for reusable message templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment_reminder', 'expiry_warning', 'renewal_offer', 'overdue_notice', 'payment_confirmation', 'membership_expired')),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),
    
    -- Template content
    subject_template TEXT,
    message_template TEXT NOT NULL,
    variables TEXT[], -- Available template variables
    
    -- Template metadata
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_fiserv_id ON public.payments(fiserv_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(payment_reference);

CREATE INDEX IF NOT EXISTS idx_notifications_member_id ON public.notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_payment_id ON public.notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient);

CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON public.notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON public.notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON public.notification_templates(is_active);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching existing pattern)
CREATE POLICY "Allow public read access to payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public writes to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public writes to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to notification_templates" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "Allow public writes to notification_templates" ON public.notification_templates FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_payments_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_notifications_updated_at();

DROP TRIGGER IF EXISTS trg_notification_templates_updated_at ON public.notification_templates;
CREATE TRIGGER trg_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_notification_templates_updated_at();

-- Insert default notification templates
INSERT INTO public.notification_templates (name, type, channel, subject_template, message_template, variables, description) VALUES
('payment_reminder_d3', 'payment_reminder', 'email', 'Payment Due Soon - {plan} Membership', 'Hi {first_name}, your {plan} membership payment of {amount} is due in 3 days on {due_date}. Please pay online: {payment_link}', ARRAY['first_name', 'plan', 'amount', 'due_date', 'payment_link'], 'Payment reminder 3 days before due date'),
('payment_reminder_d1', 'payment_reminder', 'email', 'Payment Due Tomorrow - {plan} Membership', 'Hi {first_name}, your {plan} membership payment of {amount} is due tomorrow on {due_date}. Please pay online: {payment_link}', ARRAY['first_name', 'plan', 'amount', 'due_date', 'payment_link'], 'Payment reminder 1 day before due date'),
('expiry_warning_d5', 'expiry_warning', 'email', 'Membership Expiring Soon - {plan}', 'Hi {first_name}, your {plan} membership expires on {end_date}. Renew now to continue access: {payment_link}', ARRAY['first_name', 'plan', 'end_date', 'payment_link'], 'Membership expiry warning 5 days before'),
('overdue_notice_d1', 'overdue_notice', 'email', 'Payment Overdue - {plan} Membership', 'Hi {first_name}, your {plan} membership payment of {amount} was due on {due_date} and is now overdue. Please pay immediately: {payment_link}', ARRAY['first_name', 'plan', 'amount', 'due_date', 'payment_link'], 'Overdue payment notice 1 day after due date'),
('overdue_notice_d15', 'overdue_notice', 'email', 'Final Notice - Payment Overdue', 'Hi {first_name}, your {plan} membership payment of {amount} has been overdue for 15 days. Please pay immediately or your membership may be suspended: {payment_link}', ARRAY['first_name', 'plan', 'amount', 'due_date', 'payment_link'], 'Final overdue notice 15 days after due date'),
('payment_confirmation', 'payment_confirmation', 'email', 'Payment Received - {plan} Membership', 'Hi {first_name}, thank you for your payment of {amount} for your {plan} membership. Your membership is now active until {end_date}.', ARRAY['first_name', 'amount', 'plan', 'end_date'], 'Payment confirmation email'),
('membership_expired', 'membership_expired', 'email', 'Membership Expired - Renewal Required', 'Hi {first_name}, your {plan} membership expired on {end_date}. Renew now to restore access: {payment_link}', ARRAY['first_name', 'plan', 'end_date', 'payment_link'], 'Membership expired notification')
ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON TABLE public.payments IS 'Payment tracking and Fiserv integration';
COMMENT ON TABLE public.notifications IS 'Notification and dunning communication tracking';
COMMENT ON TABLE public.notification_templates IS 'Reusable notification message templates';

COMMENT ON COLUMN public.payments.fiserv_payment_id IS 'Fiserv payment identifier';
COMMENT ON COLUMN public.payments.payment_link IS 'Generated payment link URL';
COMMENT ON COLUMN public.payments.payment_reference IS 'Internal payment reference';
COMMENT ON COLUMN public.payments.external_reference IS 'External system reference';

COMMENT ON COLUMN public.notifications.template_name IS 'Name of the template used';
COMMENT ON COLUMN public.notifications.variables IS 'Template variables used in message';
COMMENT ON COLUMN public.notifications.scheduled_for IS 'When notification should be sent';
COMMENT ON COLUMN public.notifications.expires_at IS 'When notification expires if not sent';
