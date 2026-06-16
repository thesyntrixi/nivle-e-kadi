// scripts/add-user-profile-columns.ts
// Run with: npm run db:add-user-profile

import { query, pool } from '../lib/db';

async function addUserProfileColumns() {
  console.log('Adding name and phone columns to users...\n');

  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);

    console.log('✅ User profile columns migration completed (users.name, users.phone)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUserProfileColumns();
