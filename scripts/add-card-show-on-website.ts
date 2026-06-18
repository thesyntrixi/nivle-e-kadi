// scripts/add-card-show-on-website.ts
// Run with: npm run db:add-card-show-on-website

import { query, pool } from '../lib/db';

async function addCardShowOnWebsite() {
  console.log('Adding show_on_website column to card_templates...\n');

  try {
    await query(
      `ALTER TABLE card_templates ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT false`
    );

    console.log('✅ Migration completed (card_templates.show_on_website)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addCardShowOnWebsite();
