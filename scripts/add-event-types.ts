// scripts/add-event-types.ts
// Run with: npm run db:add-event-types

import { getClient, pool } from '../lib/db';

async function addEventTypes() {
  console.log('Updating events type check...\n');

  let client;
  try {
    client = await getClient();
    await client.query(`
      DO $$
      DECLARE
        constraint_row record;
      BEGIN
        FOR constraint_row IN
          SELECT con.conname AS constraint_name
          FROM pg_constraint con
          INNER JOIN pg_class rel ON rel.oid = con.conrelid
          INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          INNER JOIN pg_attribute att
            ON att.attrelid = rel.oid
           AND att.attnum = ANY (con.conkey)
          WHERE nsp.nspname = 'public'
            AND rel.relname = 'events'
            AND con.contype = 'c'
            AND att.attname = 'type'
            AND position('type' in pg_get_constraintdef(con.oid)) > 0
        LOOP
          EXECUTE format(
            'ALTER TABLE events DROP CONSTRAINT IF EXISTS %I',
            constraint_row.constraint_name
          );
        END LOOP;

        EXECUTE 'ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check';

        ALTER TABLE events
          ADD CONSTRAINT events_type_check
          CHECK (type IN (
            'Wedding',
            'Sendoff',
            'Ticket',
            'Birthday',
            'Graduation',
            'Kitchen Party',
            'Meeting',
            'Conference',
            'Corporate',
            'Other'
          ));
      END $$;
    `);

    console.log('events type check updated');
  } catch {
    console.error('Migration failed');
    process.exit(1);
  } finally {
    client?.release();
    await pool.end();
  }
}

addEventTypes();
