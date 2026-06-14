// lib/database/types.ts

export type UserRole = 'admin' | 'check-in-staff';

export type User = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type Event = {
  id: string;
  client_id: string;
  name: string;
  type: 'Wedding' | 'Birthday' | 'Conference' | 'Corporate' | 'Other';
  date: Date;
  time: string | null;
  venue: string | null;
  location_link: string | null;
  card_template_url: string | null;
  status: 'Draft' | 'Active' | 'Completed';
  guest_count: number;
  created_at: Date;
  updated_at: Date;
};

export type Guest = {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  email: string | null;
  invitation_code: string;
  qr_code_url: string | null;
  personalized_card_url: string | null;
  sent_at: Date | null;
  delivered_at: Date | null;
  opened_at: Date | null;
  status: 'Pending' | 'Sent' | 'Delivered' | 'Opened' | 'Failed';
  checked_in?: boolean;
  checked_in_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type Message = {
  id: string;
  guest_id: string;
  event_id: string;
  message_type: 'WhatsApp' | 'SMS';
  content: string;
  status: 'Pending' | 'Sent' | 'Delivered' | 'Failed';
  external_message_id: string | null;
  sent_at: Date | null;
  delivery_status_checked_at: Date | null;
  created_at: Date;
};

export type CardTemplate = {
  id: string;
  event_id: string;
  original_file_name: string;
  file_url: string;
  file_type: 'PNG' | 'JPG' | 'PDF';
  width: number | null;
  height: number | null;
  created_at: Date;
};

export type Report = {
  id: string;
  event_id: string;
  total_guests: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  generated_at: Date;
};

export type EventStats = {
  id: string;
  name: string;
  type: string;
  date: Date;
  total_guests: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  failed_count: number;
  delivery_rate: number;
};

export type StaffEvent = {
  id: string;
  staff_id: string;
  event_id: string;
  assigned_at: Date;
};

export type AssignedEvent = Event & {
  total_guests: number;
  checked_in_count: number;
};

export type ClientOverview = {
  id: string;
  name: string;
  total_events: number;
  total_guests: number;
  active_events: number;
  completed_events: number;
};
