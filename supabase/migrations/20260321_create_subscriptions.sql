-- Create newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the subscription form)
CREATE POLICY "Allow anonymous inserts" ON newsletter_subscriptions
    FOR INSERT WITH CHECK (true);

-- Only authenticated admins can view subscriptions
CREATE POLICY "Allow admin to view subscriptions" ON newsletter_subscriptions
    FOR SELECT USING (auth.role() = 'service_role');
