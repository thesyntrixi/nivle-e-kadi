// scripts/add-guest-has-whatsapp.ts
// Run with: npm run db:add-guest-has-whatsapp

import { query, pool } from '../lib/db';

async function addGuestHasWhatsapp() {
  console.log('Adding has_whatsapp column to guests table...\n');

  try {
    await query(
      `ALTER TABLE guests ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN DEFAULT true`
    );

    console.log('✅ has_whatsapp column added successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addGuestHasWhatsapp();
