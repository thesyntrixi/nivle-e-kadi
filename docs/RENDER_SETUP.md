# Render.com PostgreSQL Setup Guide

## MANUAL STEPS (You do this, not Cursor AI)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with email (or GitHub)
3. Verify email
4. Create account

### Step 2: Create New Database
1. Dashboard → New +
2. Select "PostgreSQL"
3. Fill details:
   - **Name:** `nivle-e-kadi-db`
   - **Database:** `nivle_e_kadi`
   - **User:** `nivle_user`
   - **Region:** Frankfurt (closest to Tanzania)
   - **Version:** Latest
   - **Plan:** Free tier (good for testing)

4. Click "Create Database"
5. Wait 2-3 minutes for database to initialize

### Step 3: Get Connection String
1. Go to your database
2. Copy the **External Database URL**
3. Format: `postgresql://user:password@host:port/database`

### Step 4: Add to .env.local
```
DATABASE_URL=postgresql://nivle_user:PASSWORD@host:port/nivle_e_kadi
```

### Step 5: Initialize Database (Run Locally)
```bash
npm run db:init
```

This will:
- Create all tables
- Create views
- Seed admin user
- Test connection

### Step 6: Verify Setup
```bash
npm run db:test
```

Should show all tables and data counts.

### Step 7: Start Development
```bash
npm run dev
```

---

## Important Notes

- Free tier has 90-day inactivity auto-delete
- Upgrade to paid when going to production
- Keep DATABASE_URL secret
- Regular backups recommended (Render can auto-backup)
