# Database Setup Guide

This guide explains how to set up the database for Mission Control V3.

## Quick Start (Development)

For development, we use **SQLite** (zero setup required). The project is pre-configured:

```bash
cd apps/api

# Database is already set up with migrations and seed data
# To verify:
npm run db:studio  # Opens Prisma Studio at http://localhost:5555
```

## Database Options

### Option 1: SQLite (Default - Development Only)

SQLite is configured by default for quick development startup. No installation required.

**Pros:**
- Zero setup
- Portable (single file)
- Fast for development

**Cons:**
- Not suitable for production
- Limited concurrent connections
- No native JSON support

### Option 2: PostgreSQL (Production)

For production or if you need PostgreSQL-specific features:

#### Prerequisites
- PostgreSQL 14+ installed locally or accessible via network
- Node.js 18+ and npm

#### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14

# Create database and user
createdb mission_control_v2
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Switch to postgres user and create database
sudo -u postgres psql -c "CREATE DATABASE mission_control_v2;"
sudo -u postgres psql -c "CREATE USER mcuser WITH PASSWORD 'mcpass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mission_control_v2 TO mcuser;"
```

#### Docker (Recommended for Production Testing)
```bash
# Run PostgreSQL in Docker
docker run --name mc-postgres \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=mission_control_v2 \
  -p 5432:5432 \
  -d postgres:14

# Stop container
docker stop mc-postgres

# Start container again
docker start mc-postgres
```

#### Switching to PostgreSQL

1. Update `apps/api/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/mission_control_v2"
   ```

2. Update `apps/api/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Regenerate and migrate:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

## Database Configuration

The `.env` file in `apps/api/.env` contains:

```env
# SQLite (Development)
DATABASE_URL="file:./dev.db"

# PostgreSQL (Production)
# DATABASE_URL="postgresql://user:password@localhost:5432/mission_control_v2"

# JWT
JWT_SECRET="dev-jwt-secret-key-do-not-use-in-production"

# Server
PORT=3001
NODE_ENV=development

# Client
CLIENT_URL="http://localhost:5173"
```

## Running Migrations

```bash
cd apps/api

# Generate Prisma Client
npm run db:generate

# Run migrations (dev mode - creates new migrations)
npm run db:migrate

# Deploy migrations (production - applies existing migrations)
npm run db:deploy

# Seed the database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Sample Data

The seed script creates:
- **Admin**: admin@missioncontrol.local / admin123
- **Manager**: manager@missioncontrol.local / manager123
- **Agents**: noona@, jen@, baro@ / agent123
- **3 Projects**: Mission Control V3, Handover App, Framer Marketplace
- **Current crew context**: Raz (human), Baro, Noona, Obey, subagents Jen/Haji/Lin, and ecosystem agents Bob/SOBA-1
- **5 Tasks**: Various statuses and priorities
- **3 Activities**: Sample activity feed

## Verify Database Setup

```bash
# Open Prisma Studio to view data
npm run db:studio
```

Prisma Studio opens at http://localhost:5555

## Troubleshooting

### SQLite Issues

**Database is locked:**
- Close Prisma Studio or other connections
- Restart the dev server

**Migration fails:**
- Delete `dev.db` and `migrations/` folder
- Run `npm run db:migrate` again

### PostgreSQL Issues

**Connection refused:**
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check port 5432 is not blocked
- Verify connection string in `.env`

**Permission denied:**
- Ensure database user has proper privileges
- Check that database exists: `psql -l`

## Database Schema

The schema includes:
- **Users**: Authentication and user management
- **Projects**: Project tracking with members
- **Tasks**: Task management with assignments
- **Messages**: Project chat/messaging
- **Activities**: Activity logging

See `apps/api/prisma/schema.prisma` for full schema definition.

## Migration from SQLite to PostgreSQL

When ready to deploy to production:

1. Export SQLite data (if needed):
   ```bash
   sqlite3 dev.db .dump > backup.sql
   ```

2. Set up PostgreSQL and update `.env`

3. Regenerate Prisma client for PostgreSQL

4. Run migrations on PostgreSQL

5. Import data or re-seed
