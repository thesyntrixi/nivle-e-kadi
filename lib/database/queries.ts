// lib/database/queries.ts
// Common database query functions

import { query } from '../db';
import { User, Client, Event, Guest } from './types';

// ===== USER QUERIES =====
export async function getUserByEmail(email: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] as User | undefined;
}

export async function createUser(email: string, passwordHash: string) {
  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [email, passwordHash]
  );
  return result.rows[0] as User;
}

// ===== CLIENT QUERIES =====
export async function getClientsByUserId(userId: string) {
  const result = await query(
    'SELECT * FROM clients WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
    [userId]
  );
  return result.rows as Client[];
}

export async function getClientById(clientId: string) {
  const result = await query('SELECT * FROM clients WHERE id = $1', [clientId]);
  return result.rows[0] as Client | undefined;
}

export async function createClient(
  userId: string,
  name: string,
  phone: string,
  email?: string,
  companyName?: string
) {
  const result = await query(
    'INSERT INTO clients (user_id, name, phone, email, company_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, name, phone, email, companyName]
  );
  return result.rows[0] as Client;
}

export async function updateClient(clientId: string, data: Partial<Client>) {
  const fields = Object.keys(data)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  const values = [clientId, ...Object.values(data)];

  const result = await query(
    `UPDATE clients SET ${fields} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] as Client;
}

export async function deleteClient(clientId: string) {
  await query('UPDATE clients SET is_active = false WHERE id = $1', [clientId]);
}

// ===== EVENT QUERIES =====
export async function getEventsByClientId(clientId: string) {
  const result = await query(
    'SELECT * FROM events WHERE client_id = $1 ORDER BY date DESC',
    [clientId]
  );
  return result.rows as Event[];
}

export async function getEventById(eventId: string) {
  const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
  return result.rows[0] as Event | undefined;
}

export async function createEvent(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const result = await query(
    `INSERT INTO events (client_id, name, type, date, time, venue, location_link, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.client_id, data.name, data.type, data.date, data.time, data.venue, data.location_link, data.status]
  );
  return result.rows[0] as Event;
}

// ===== GUEST QUERIES =====
export async function getGuestsByEventId(eventId: string) {
  const result = await query(
    'SELECT * FROM guests WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  return result.rows as Guest[];
}

export async function createGuest(data: Omit<Guest, 'id' | 'created_at' | 'updated_at'>) {
  const result = await query(
    `INSERT INTO guests (event_id, name, phone, email, invitation_code, status) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.event_id, data.name, data.phone, data.email, data.invitation_code, data.status]
  );
  return result.rows[0] as Guest;
}

export async function updateGuestStatus(guestId: string, status: Guest['status']) {
  const result = await query(
    'UPDATE guests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, guestId]
  );
  return result.rows[0] as Guest;
}

// ===== ANALYTICS QUERIES =====
export async function getEventStats(eventId: string) {
  const result = await query(
    'SELECT * FROM event_stats WHERE id = $1',
    [eventId]
  );
  return result.rows[0];
}

export async function getClientOverview(clientId: string) {
  const result = await query(
    'SELECT * FROM client_overview WHERE id = $1',
    [clientId]
  );
  return result.rows[0];
}
