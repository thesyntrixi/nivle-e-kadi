// scripts/add-staff-role.ts
// Run with: npm run db:add-staff

import { query, pool } from '../lib/db';

async function addStaffRole() {
  console.log('Adding staff role and staff_events table...\n');

  try {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin', 'check-in-staff'));
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS staff_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(staff_id, event_id)
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_staff_events_staff ON staff_events(staff_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_staff_events_event ON staff_events(event_id)
    `);

    console.log('✅ Staff role migration completed (users.role, staff_events)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addStaffRole();
