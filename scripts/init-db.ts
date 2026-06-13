// scripts/init-db.ts
// Run with: npx ts-node scripts/init-db.ts

import fs from 'fs';
import path from 'path';
import { query, testConnection } from '../lib/db';

async function initializeDatabase() {
  console.log('🚀 Initializing NIVLE E-Kadi Database...\n');

  try {
    // Test connection
    console.log('1️⃣  Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connection successful\n');

    // Read and execute schema
    console.log('2️⃣  Creating database schema...');
    const schemaPath = path.join(process.cwd(), 'lib/database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.error('Error executing statement:', statement);
          throw error;
        }
      }
    }
    console.log(`✅ Schema created (${statements.length} statements)\n`);

    // Seed admin user (only if doesn't exist)
    console.log('3️⃣  Seeding admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nivelekadi.com';
    
    try {
      // Check if admin exists
      const checkAdmin = await query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );

      if (checkAdmin.rows.length === 0) {
        // Admin doesn't exist, create one
        const bcrypt = require('bcryptjs');
        const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
          [adminEmail, passwordHash]
        );
        console.log(`✅ Admin user created: ${adminEmail}`);
      } else {
        console.log(`⚠️  Admin user already exists: ${adminEmail}`);
      }
    } catch (error) {
      console.error('Error seeding admin:', error);
    }

    console.log('\n✅ Database initialization complete!\n');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - clients');
    console.log('   - events');
    console.log('   - guests');
    console.log('   - messages');
    console.log('   - card_templates');
    console.log('   - reports');
    console.log('\n🔗 Views created:');
    console.log('   - event_stats');
    console.log('   - client_overview');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
