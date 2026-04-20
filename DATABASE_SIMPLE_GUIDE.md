# Simple Database Guide

## 🎯 Quick Commands

| Command | What it does |
|---------|--------------|
| `npm run db:export` | Export your database to `supabase_dump.sql` |
| `npm run db:seed` | Import data from `supabase_dump.sql` |
| `npm run db:setup` | Complete setup: migrations + seed |
| `npx prisma studio` | View your data in browser |

## 📁 Files

**Essential files kept:**
- `scripts/export-database-prisma.js` - Exports using Prisma (works with any database)
- `scripts/seed-from-inserts.js` - Imports INSERT statements
- `scripts/setup-database.js` - Complete setup script
- `supabase_dump.sql` - Your data file (commit this to git)

**Removed files:**
- All documentation files (you didn't need them)
- Failed export scripts (pg_dump versions)
- Unused seed scripts

## 🚀 Common Workflows

**Export your data:**
```bash
npm run db:export
```

**Reset to seed data:**
```bash
npm run db:seed
```

**First time setup:**
```bash
npm run db:setup
```

**View data:**
```bash
npx prisma studio
```

That's it! Simple and clean. 🎉
