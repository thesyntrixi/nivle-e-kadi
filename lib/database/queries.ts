// lib/database/queries.ts
// Common database query functions

import { query } from '../db';
import { User, Client, Event, Guest, AssignedEvent, StaffEvent } from './types';

// ===== USER QUERIES =====
export async function getUserByEmail(email: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] as User | undefined;
}

export async function getUserWithRole(email: string) {
  const result = await query(
    'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] as Pick<User, 'id' | 'email' | 'role' | 'is_active' | 'created_at' | 'updated_at'> | undefined;
}

export async function getUserById(userId: string) {
  const result = await query(
    'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] as Pick<User, 'id' | 'email' | 'role' | 'is_active' | 'created_at' | 'updated_at'> | undefined;
}

export async function createUser(email: string, passwordHash: string, role: User['role'] = 'admin') {
  const result = await query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
    [email, passwordHash, role]
  );
  return result.rows[0] as User;
}

export async function createStaffUser(email: string, passwordHash: string) {
  return createUser(email, passwordHash, 'check-in-staff');
}

export async function deleteStaffUser(staffId: string) {
  await query(
    "DELETE FROM users WHERE id = $1 AND role = 'check-in-staff'",
    [staffId]
  );
}

export async function getAllStaff() {
  const result = await query(
    `SELECT u.id, u.email, u.created_at,
            COALESCE(
              json_agg(
                json_build_object('id', e.id, 'name', e.name, 'date', e.date)
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS events
     FROM users u
     LEFT JOIN staff_events se ON se.staff_id = u.id
     LEFT JOIN events e ON e.id = se.event_id
     WHERE u.role = 'check-in-staff' AND u.is_active = true
     GROUP BY u.id, u.email, u.created_at
     ORDER BY u.created_at DESC`
  );
  return result.rows as Array<{
    id: string;
    email: string;
    created_at: Date;
    events: Array<{ id: string; name: string; date: string }>;
  }>;
}

// ===== STAFF EVENT QUERIES =====
export async function getAssignedEvents(staffId: string) {
  const result = await query(
    `SELECT e.*,
            COUNT(g.id)::int AS total_guests,
            COUNT(CASE WHEN g.checked_in = true THEN 1 END)::int AS checked_in_count
     FROM staff_events se
     JOIN events e ON se.event_id = e.id
     LEFT JOIN guests g ON g.event_id = e.id
     WHERE se.staff_id = $1
     GROUP BY e.id
     ORDER BY e.date DESC`,
    [staffId]
  );
  return result.rows as AssignedEvent[];
}

export async function isStaffAssignedToEvent(staffId: string, eventId: string) {
  const result = await query(
    'SELECT 1 FROM staff_events WHERE staff_id = $1 AND event_id = $2',
    [staffId, eventId]
  );
  return result.rows.length > 0;
}

export async function assignEventToStaff(staffId: string, eventId: string) {
  const result = await query(
    `INSERT INTO staff_events (staff_id, event_id)
     VALUES ($1, $2)
     ON CONFLICT (staff_id, event_id) DO NOTHING
     RETURNING *`,
    [staffId, eventId]
  );
  return result.rows[0] as StaffEvent | undefined;
}

export async function removeEventFromStaff(staffId: string, eventId: string) {
  await query(
    'DELETE FROM staff_events WHERE staff_id = $1 AND event_id = $2',
    [staffId, eventId]
  );
}

export async function setStaffEvents(staffId: string, eventIds: string[]) {
  await query('DELETE FROM staff_events WHERE staff_id = $1', [staffId]);
  for (const eventId of eventIds) {
    await assignEventToStaff(staffId, eventId);
  }
}

export async function checkInGuestForEvent(code: string, eventId: string) {
  const result = await query(
    `SELECT g.id, g.name, g.invitation_code, g.checked_in, g.checked_in_at, e.name AS event_name
     FROM guests g
     JOIN events e ON g.event_id = e.id
     WHERE g.invitation_code = $1 AND g.event_id = $2`,
    [code, eventId]
  );

  if (result.rows.length === 0) {
    return { found: false as const };
  }

  const guest = result.rows[0];

  if (guest.checked_in) {
    return {
      found: true as const,
      alreadyCheckedIn: true as const,
      guest,
    };
  }

  const updateResult = await query(
    `UPDATE guests SET checked_in = TRUE, checked_in_at = NOW()
     WHERE invitation_code = $1 AND event_id = $2
     RETURNING id, name, invitation_code, checked_in, checked_in_at`,
    [code, eventId]
  );

  return {
    found: true as const,
    alreadyCheckedIn: false as const,
    guest: { ...updateResult.rows[0], event_name: guest.event_name },
  };
}

export async function getEventCheckinStats(eventId: string) {
  const statsResult = await query(
    `SELECT COUNT(*)::int AS total_guests,
            COUNT(CASE WHEN checked_in = true THEN 1 END)::int AS checked_in_count
     FROM guests WHERE event_id = $1`,
    [eventId]
  );

  const recentResult = await query(
    `SELECT name, checked_in_at
     FROM guests
     WHERE event_id = $1 AND checked_in = true AND checked_in_at IS NOT NULL
     ORDER BY checked_in_at DESC
     LIMIT 10`,
    [eventId]
  );

  return {
    ...statsResult.rows[0],
    recent_checkins: recentResult.rows as Array<{ name: string; checked_in_at: string }>,
  };
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
