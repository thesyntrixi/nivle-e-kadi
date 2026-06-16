// scripts/add-event-family-name.ts
// Run with: npm run db:add-family-name

import { query, pool } from '../lib/db';

async function addEventFamilyName() {
  console.log('Adding family_name column to events table...\n');

  try {
    await query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS family_name TEXT
    `);

    console.log('✅ family_name column added successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addEventFamilyName();
