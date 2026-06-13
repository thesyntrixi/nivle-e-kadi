-- NIVLE E-Kadi Database Schema
-- PostgreSQL
-- Last updated: 2026-06-13

-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ===== CLIENTS TABLE =====
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  company_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- ===== EVENTS TABLE =====
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Wedding', 'Birthday', 'Conference', 'Corporate', 'Other')),
  date DATE NOT NULL,
  time TIME,
  venue VARCHAR(255),
  location_link VARCHAR(500),
  card_template_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Completed')),
  guest_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);

-- ===== GUESTS TABLE =====
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  invitation_code VARCHAR(20) UNIQUE NOT NULL,
  qr_code_url VARCHAR(500),
  personalized_card_url VARCHAR(500),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Delivered', 'Opened', 'Failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_invitation_code ON guests(invitation_code);

-- ===== MESSAGES TABLE (WhatsApp/SMS Logs) =====
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('WhatsApp', 'SMS')),
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Delivered', 'Failed')),
  external_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  delivery_status_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_guest_id ON messages(guest_id);
CREATE INDEX idx_messages_event_id ON messages(event_id);
CREATE INDEX idx_messages_status ON messages(status);

-- ===== CARD TEMPLATES TABLE =====
CREATE TABLE IF NOT EXISTS card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(20) CHECK (file_type IN ('PNG', 'JPG', 'PDF')),
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_templates_event_id ON card_templates(event_id);

-- ===== REPORTS TABLE =====
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_guests INT DEFAULT 0,
  sent INT DEFAULT 0,
  delivered INT DEFAULT 0,
  opened INT DEFAULT 0,
  failed INT DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_event_id ON reports(event_id);

-- ===== VIEWS FOR ANALYTICS =====

-- Event Statistics View
DROP VIEW IF EXISTS event_stats CASCADE;
CREATE VIEW event_stats AS
SELECT
  e.id,
  e.name,
  e.type,
  e.date,
  COUNT(DISTINCT g.id) as total_guests,
  COUNT(CASE WHEN g.status = 'Sent' THEN 1 END) as sent_count,
  COUNT(CASE WHEN g.status = 'Delivered' THEN 1 END) as delivered_count,
  COUNT(CASE WHEN g.status = 'Opened' THEN 1 END) as opened_count,
  COUNT(CASE WHEN g.status = 'Failed' THEN 1 END) as failed_count,
  ROUND(
    (COUNT(CASE WHEN g.status = 'Delivered' THEN 1 END)::NUMERIC / NULLIF(COUNT(DISTINCT g.id), 0)) * 100, 
    2
  ) as delivery_rate
FROM events e
LEFT JOIN guests g ON e.id = g.event_id
GROUP BY e.id, e.name, e.type, e.date;

-- Client Overview View
DROP VIEW IF EXISTS client_overview CASCADE;
CREATE VIEW client_overview AS
SELECT
  c.id,
  c.name,
  COUNT(DISTINCT e.id) as total_events,
  COUNT(DISTINCT g.id) as total_guests,
  COUNT(CASE WHEN e.status = 'Active' THEN 1 END) as active_events,
  COUNT(CASE WHEN e.status = 'Completed' THEN 1 END) as completed_events
FROM clients c
LEFT JOIN events e ON c.id = e.client_id
LEFT JOIN guests g ON e.id = g.event_id
GROUP BY c.id, c.name;
