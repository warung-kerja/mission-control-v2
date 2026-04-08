# Mission Control V2.0

Production-ready modular architecture for the Mission Control Dashboard.

## Overview

**Version**: 2.0.0  
**Status**: Phase 1 - Foundation (95% Complete) ✅  
**Architecture**: Turborepo monorepo with React frontend and Node.js backend

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query + Axios
- **Routing**: React Router v6
- **UI Components**: Radix UI + Headless UI
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20+ + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.io
- **Auth**: JWT

### Development Tools
- **Monorepo**: Turborepo
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Vitest

## Project Structure

```
mission-control-v2/
├── apps/
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── features/    # Feature-based modules
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── services/    # API clients
│   │   │   ├── stores/      # Zustand stores
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   └── api/                 # Node.js backend
│       ├── src/
│       │   ├── middleware/  # Express middleware
│       │   ├── routes/      # API routes
│       │   └── index.ts     # Server entry
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
├── packages/
│   ├── shared-types/        # Common TypeScript types
│   ├── ui-components/       # Shared component library
│   └── eslint-config/       # Shared ESLint config
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm 10+

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp apps/api/.env.example apps/api/.env
   
   # Frontend
   cp apps/web/.env.example apps/web/.env
   ```

3. **Set up database**
   ```bash
   cd apps/api
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Run development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Available Scripts

### Root
- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps
- `npm run lint` - Lint all apps
- `npm run test` - Run all tests
- `npm run type-check` - Type check all apps
- `npm run predeploy:check` - Run full pre-deploy validation gate (API + web smoke)

### Frontend (apps/web)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run Vitest

### Backend (apps/api)
- `npm run dev` - Start with hot reload (tsx)
- `npm run build` - Compile TypeScript
- `npm run start` - Start compiled server
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:studio` - Open Prisma Studio

## Features

### Phase 1: Foundation - 95% Complete ✅
- ✅ Monorepo structure with Turborepo
- ✅ Frontend foundation (React + Vite + Tailwind)
- ✅ Backend foundation (Express + TypeScript)
- ✅ Database schema (Prisma)
- ✅ Authentication system (JWT)
- ✅ Zustand state management
- ✅ API client with Axios
- ✅ Socket.io setup
- ✅ Layout and navigation
- ✅ All builds verified (frontend: 223KB gzipped)
- ✅ TypeScript strict mode enabled
- ✅ Husky pre-commit hooks configured
- ✅ VS Code settings and extensions
- ✅ Database migration files created
- ✅ Database seed script ready
- 🔄 Database setup (requires PostgreSQL installation)

### Phase 2: Backend Core (In Progress)
- 🔄 Complete API endpoints
- 🔄 WebSocket implementation
- ⏳ Data migration from V1.4

### Planned
- ⏳ Team module
- ⏳ Office visualization
- ⏳ Memories browser
- ⏳ Collaboration tools
- ⏳ Analytics module
- ⏳ Real-time updates
- ⏳ Plugin system

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/activity` - Get recent activity

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id/status` - Update user status

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/mission_control_v2
JWT_SECRET=your-secret-key
PORT=3001
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## Development Roadmap

See [V2.0-Implementation-Roadmap.md](../V2.0-Implementation-Roadmap.md) for detailed timeline.

For release validation workflow, see [docs/release-runbook.md](./docs/release-runbook.md).

### Phase 1: Foundation (Weeks 1-2) - 95% ✅
- ✅ Monorepo setup
- ✅ Frontend foundation
- ✅ Backend foundation
- ✅ Database schema
- ✅ Authentication
- ✅ CI/CD pipeline
- ✅ Husky pre-commit hooks
- ✅ VS Code settings
- ✅ Database migration files
- 🔄 PostgreSQL setup (requires local installation)

### Phase 2: Backend Core (Weeks 3-4)
- ⏳ Complete API endpoints
- ⏳ WebSocket implementation
- ⏳ Data migration from V1.4

### Phase 3: Frontend Core (Weeks 5-6)
- ⏳ State management
- ⏳ API integration
- ⏳ Feature modules

### Phase 4: Feature Migration (Weeks 7-10)
- ⏳ Port all V1.4 features
- ⏳ Real-time updates
- ⏳ Responsive design

### Phase 5: Polish & Launch (Weeks 11-12)
- ⏳ Testing
- ⏳ Documentation
- ⏳ Deployment

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT
