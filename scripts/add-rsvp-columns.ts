// scripts/add-rsvp-columns.ts
// Run with: npm run db:add-rsvp

import { query, pool } from '../lib/db';

async function addRsvpColumns() {
  console.log('Adding RSVP columns to guests table...\n');

  try {
    await query(`
      ALTER TABLE guests
        ADD COLUMN IF NOT EXISTS rsvp_status VARCHAR(20) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS rsvp_at TIMESTAMPTZ
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'guests_rsvp_status_check'
        ) THEN
          ALTER TABLE guests
            ADD CONSTRAINT guests_rsvp_status_check
            CHECK (rsvp_status IN ('pending', 'attending', 'not_attending'));
        END IF;
      END $$;
    `);

    console.log('✅ RSVP columns added successfully (rsvp_status, rsvp_at)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addRsvpColumns();
