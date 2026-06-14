// scripts/add-checkin-columns.ts
// Run with: npm run db:add-checkin

import { query, pool } from '../lib/db';

async function addCheckinColumns() {
  console.log('Adding check-in columns to guests table...\n');

  try {
    await query(`
      ALTER TABLE guests
        ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP
    `);

    console.log('✅ Check-in columns added successfully (checked_in, checked_in_at)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addCheckinColumns();
