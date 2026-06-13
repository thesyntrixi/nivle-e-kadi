// scripts/test-db.ts
// Run with: npx ts-node scripts/test-db.ts

import { testConnection, query } from '../lib/db';

async function testDatabase() {
  console.log('🧪 Testing NIVLE E-Kadi Database...\n');

  try {
    // Test connection
    console.log('1️⃣  Testing connection...');
    const connected = await testConnection();
    if (!connected) throw new Error('Connection failed');

    // Count tables
    console.log('\n2️⃣  Checking tables...');
    const tables = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach((row: any) => console.log(`   - ${row.table_name}`));

    // Count users
    console.log('\n3️⃣  Checking users...');
    const users = await query('SELECT COUNT(*) FROM users');
    console.log(`✅ Users: ${users.rows[0].count}`);

    // Test query
    console.log('\n4️⃣  Testing queries...');
    const testUser = await query('SELECT * FROM users LIMIT 1');
    console.log(`✅ Test query successful`);

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDatabase();
