-- BlckBx Partnerships Portal - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Create the partners table
CREATE TABLE IF NOT EXISTS partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_name VARCHAR(255) NOT NULL,
    lifestyle_category VARCHAR(100) NOT NULL DEFAULT 'Other',
    contact_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    contact_number VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    opportunity_type VARCHAR(50) NOT NULL DEFAULT 'Everyday',
    partnership_link TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'lead',
    
    -- Negotiation checkboxes
    contacted BOOLEAN DEFAULT FALSE,
    call_booked BOOLEAN DEFAULT FALSE,
    call_had BOOLEAN DEFAULT FALSE,
    contract_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    signed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_created_at ON partners(created_at);
CREATE INDEX IF NOT EXISTS idx_partners_lifestyle_category ON partners(lifestyle_category);

-- Enable Row Level Security (RLS)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust based on your auth needs)
-- For development/internal use - allows all operations
CREATE POLICY "Allow all operations" ON partners
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- If you want to restrict to authenticated users only, use this instead:
-- CREATE POLICY "Allow authenticated users" ON partners
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-update the updated_at column
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for weekly statistics
CREATE OR REPLACE VIEW weekly_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'lead' AND created_at >= NOW() - INTERVAL '7 days') as new_leads,
    COUNT(*) FILTER (WHERE status = 'negotiation') as in_negotiation,
    COUNT(*) FILTER (WHERE status = 'signed' AND signed_at >= NOW() - INTERVAL '7 days') as signed_this_week,
    COUNT(*) FILTER (WHERE contacted = true AND updated_at >= NOW() - INTERVAL '7 days') as contacted,
    COUNT(*) FILTER (WHERE call_booked = true AND updated_at >= NOW() - INTERVAL '7 days') as calls_booked,
    COUNT(*) FILTER (WHERE call_had = true AND updated_at >= NOW() - INTERVAL '7 days') as calls_had,
    COUNT(*) FILTER (WHERE contract_sent = true AND updated_at >= NOW() - INTERVAL '7 days') as contracts_sent,
    COALESCE(
        AVG(EXTRACT(DAY FROM (signed_at - created_at))) FILTER (WHERE signed_at IS NOT NULL),
        0
    )::INTEGER as avg_days_to_sign
FROM partners;

-- Create a view for pipeline statistics
CREATE OR REPLACE VIEW pipeline_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'lead') as leads,
    COUNT(*) FILTER (WHERE status = 'negotiation') as negotiation,
    COUNT(*) FILTER (WHERE status = 'signed') as signed,
    COUNT(*) as total
FROM partners;

-- Insert some sample data (optional - remove in production)
INSERT INTO partners (partner_name, lifestyle_category, contact_name, position, contact_number, email, opportunity_type, partnership_link, status, contacted, call_booked, call_had, contract_sent, created_at) VALUES
('Soho House', 'Entertainment', 'James Wilson', 'Partnership Director', '+44 7700 900123', 'james@sohohouse.com', 'Big Ticket', 'https://sohohouse.com', 'lead', false, false, false, false, NOW() - INTERVAL '5 days'),
('Blacklane', 'Travel', 'Sophie Miller', 'B2B Manager', '+44 7700 900456', 'sophie@blacklane.com', 'Everyday', 'https://blacklane.com', 'negotiation', true, true, true, false, NOW() - INTERVAL '14 days'),
('The Dorchester', 'Travel', 'Marcus Brown', 'GM', '+44 7700 900789', 'marcus@dorchestercollection.com', 'Big Ticket', 'https://dorchestercollection.com', 'signed', true, true, true, true, NOW() - INTERVAL '30 days'),
('Harrods', 'Retail', 'Emma Thompson', 'Partnerships Lead', '+44 7700 900111', 'emma@harrods.com', 'Big Ticket', 'https://harrods.com', 'negotiation', true, true, false, false, NOW() - INTERVAL '10 days'),
('Quintessentially', 'Other', 'Oliver Scott', 'CEO', '+44 7700 900222', 'oliver@quintessentially.com', 'Big Ticket', 'https://quintessentially.com', 'lead', false, false, false, false, NOW() - INTERVAL '2 days');

-- Update the signed partner with signed_at timestamp
UPDATE partners SET signed_at = NOW() - INTERVAL '2 days' WHERE partner_name = 'The Dorchester';
