// scripts/add-message-direction.ts
// Run with: npm run db:add-message-direction

import { query, pool } from '../lib/db';

async function addMessageDirection() {
  console.log('Adding direction column to messages table...\n');

  try {
    await query(`
      ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'outbound'
    `);

    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'messages_direction_check'
        ) THEN
          ALTER TABLE messages
            ADD CONSTRAINT messages_direction_check
            CHECK (direction IN ('inbound', 'outbound'));
        END IF;
      END $$;
    `);

    console.log('✅ direction column added successfully (inbound | outbound)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMessageDirection();
