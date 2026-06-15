// scripts/add-guest-type-column.ts
// Run with: npm run db:add-guest-type

import { query, pool } from '../lib/db';

async function addGuestTypeColumn() {
  console.log('Adding guest_type column to guests table...\n');

  try {
    await query(`
      ALTER TABLE guests
        ADD COLUMN IF NOT EXISTS guest_type VARCHAR(10) DEFAULT 'single'
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'guests_guest_type_check'
        ) THEN
          ALTER TABLE guests
            ADD CONSTRAINT guests_guest_type_check
            CHECK (guest_type IN ('single', 'double'));
        END IF;
      END $$;
    `);

    console.log('✅ guest_type column added successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addGuestTypeColumn();
