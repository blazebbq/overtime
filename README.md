# FitFinish - Facility Inspection System

FitFinish is a production-ready web application for facility fit-and-finish inspections and daily walk rounds. Built with Next.js, TypeScript, PostgreSQL, and designed mobile-first with PWA capabilities and offline support.

## 🎯 Overview

FitFinish enables facility management teams to:
- Conduct building inspections with digital floor plans
- Track issues with precise location mapping
- Manage persistent defect tracking across multiple inspections
- Generate professional PDF reports
- Work offline without data loss
- Support multiple user roles and workflows

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + React 19
- **Styling**: TailwindCSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: S3-compatible object storage (DigitalOcean Spaces)
- **Auth**: NextAuth.js with JWT
- **Offline**: IndexedDB (planned) + sync queue
- **PDF**: jsPDF (planned for reports)
- **Icons**: Heroicons

### Key Features Implemented ✅

#### Phase 1: Foundation
- ✅ PostgreSQL database with comprehensive schema
- ✅ Docker Compose for local development
- ✅ Prisma ORM with migrations
- ✅ Role-based authentication (Admin, User, QA, EngineeringManager)
- ✅ Seed data with demo users and issue types

#### Phase 2: Admin Management
- ✅ Buildings CRUD with full API
- ✅ Floors CRUD with blueprint upload to S3
- ✅ Blueprint dimensions tracking (width/height in pixels)
- ✅ Issue Types CRUD with active/inactive status
- ✅ Admin UI with responsive layout
- ✅ Professional TailwindCSS design

#### Phase 3: Room & Blueprint Management
- ✅ Interactive polygon drawing tool for room boundaries
- ✅ Canvas-based blueprint viewer with zoom/pan
- ✅ Point-in-polygon algorithm for room detection
- ✅ Normalized coordinates (0..1) for accuracy
- ✅ Mobile touch support with pinch-zoom
- ✅ Room CRUD with polygon JSON storage

#### Phase 5 (Partial): Walkdowns & Issues
- ✅ Walkdowns API (create, list, update, delete)
- ✅ Issues API (create, list, update, delete)
- ✅ Issue photo upload endpoint
- ✅ Rectify issue workflow
- ✅ QA verification workflow
- ✅ Outstanding issues endpoint for manager dashboard
- ⏳ Walkdown UI pages (in progress)
- ⏳ Daily Walk Round mode (in progress)

## 📊 Database Schema

### Core Models
- **User**: email, passwordHash, name, role (Admin/User/QA/EngineeringManager)
- **Building**: name, siteCode
- **Floor**: buildingId, name, blueprintImageUrl, blueprintWidthPx, blueprintHeightPx
- **Room**: floorId, name, roomNumber, polygonJson (normalized 0..1 coordinates)
- **IssueType**: name, sortOrder, active
- **Walkdown**: walkdownId (human-readable), buildingId, floorId, mode (BlockOpen/DailyWalkRound), status (Draft/Submitted/Archived)
- **Issue**: walkdownId, roomId, issueTypeId, description, pinX, pinY (normalized 0..1), status (Open/InProgress/Rectified/Closed)
- **IssuePhoto**: issueId, photoUrl
- **SignOff**: walkdownId, role, signedName, signedDate

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- S3-compatible storage credentials (or use MinIO locally)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd overtime
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and S3 credentials
   ```

4. **Start PostgreSQL**
   ```bash
   docker compose up -d
   ```

5. **Run database migrations**
   ```bash
   npm run db:setup
   ```
   This will:
   - Run Prisma migrations
   - Generate Prisma Client
   - Seed the database with demo data

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:3000
   ```

### Demo Accounts
After seeding, you can log in with:
- **Admin**: admin@fitfinish.com / password123
- **QA**: qa@fitfinish.com / password123
- **Engineering Manager**: manager@fitfinish.com / password123
- **User**: user@fitfinish.com / password123

## 📁 Project Structure

```
overtime/
├── app/
│   ├── admin/                 # Admin pages (Buildings, Floors, Issue Types)
│   │   ├── buildings/         # Buildings management
│   │   ├── floors/            # Floors management
│   │   │   └── [id]/rooms/    # Room polygon editor
│   │   └── issue-types/       # Issue types management
│   ├── api/                   # API routes
│   │   ├── auth/              # NextAuth endpoints
│   │   ├── buildings/         # Buildings CRUD
│   │   ├── floors/            # Floors CRUD + blueprint upload
│   │   ├── rooms/             # Rooms CRUD
│   │   ├── issue-types/       # Issue Types CRUD
│   │   ├── walkdowns/         # Walkdowns CRUD
│   │   └── issues/            # Issues CRUD + photos/rectify/QA
│   ├── login/                 # Login page
│   └── page.tsx               # Home (redirects based on role)
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # Auth helpers
│   └── s3.ts                  # S3 upload utilities
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data
├── types/
│   └── next-auth.d.ts         # NextAuth type extensions
└── docker-compose.yml         # PostgreSQL container
```

## 🔐 User Roles & Permissions

| Feature | Admin | User | QA | Engineering Manager |
|---------|-------|------|----|--------------------|
| Manage Buildings/Floors/Rooms | ✅ | ❌ | ❌ | ❌ |
| Manage Issue Types | ✅ | ❌ | ❌ | ❌ |
| Create Walkdowns | ✅ | ✅ | ✅ | ✅ |
| Create Issues | ✅ | ✅ | ✅ | ❌ |
| Upload Photos | ✅ | ✅ | ✅ | ❌ |
| Rectify Issues | ✅ | ✅ | ❌ | ✅ |
| QA Verify (Close) | ✅ | ❌ | ✅ | ❌ |
| View Outstanding Dashboard | ✅ | ✅ | ✅ | ✅ |
| Delete Entities | ✅ | ❌ | ❌ | ❌ |

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - Sign in with credentials
- `POST /api/auth/logout` - Sign out

### Buildings
- `GET /api/buildings` - List all buildings
- `POST /api/buildings` - Create building (Admin only)
- `GET /api/buildings/:id` - Get building details
- `PATCH /api/buildings/:id` - Update building (Admin only)
- `DELETE /api/buildings/:id` - Delete building (Admin only)

### Floors
- `GET /api/floors?buildingId={id}` - List floors (optional filter)
- `POST /api/floors` - Create floor (Admin only)
- `GET /api/floors/:id` - Get floor details
- `PATCH /api/floors/:id` - Update floor (Admin only)
- `DELETE /api/floors/:id` - Delete floor (Admin only)
- `POST /api/floors/:id/blueprint` - Upload blueprint image (Admin only)
- `GET /api/floors/:id/outstanding` - Get outstanding issues for floor

### Rooms
- `GET /api/rooms?floorId={id}` - List rooms (optional filter)
- `POST /api/rooms` - Create room (Admin only)
- `GET /api/rooms/:id` - Get room details
- `PATCH /api/rooms/:id` - Update room (Admin only)
- `DELETE /api/rooms/:id` - Delete room (Admin only)

### Issue Types
- `GET /api/issue-types?activeOnly=true` - List issue types
- `POST /api/issue-types` - Create issue type (Admin only)
- `PATCH /api/issue-types/:id` - Update issue type (Admin only)
- `DELETE /api/issue-types/:id` - Delete issue type (Admin only)

### Walkdowns
- `GET /api/walkdowns?buildingId={id}&floorId={id}&mode={mode}&status={status}` - List walkdowns with filters
- `POST /api/walkdowns` - Create walkdown
- `GET /api/walkdowns/:id` - Get walkdown details with issues
- `PATCH /api/walkdowns/:id` - Update walkdown
- `DELETE /api/walkdowns/:id` - Delete walkdown (Admin only)

### Issues
- `GET /api/issues?walkdownId={id}&floorId={id}&status={status}` - List issues with filters
- `POST /api/issues` - Create issue
- `GET /api/issues/:id` - Get issue details
- `PATCH /api/issues/:id` - Update issue
- `DELETE /api/issues/:id` - Delete issue (Admin only)
- `POST /api/issues/:id/photos` - Upload photo for issue
- `POST /api/issues/:id/rectify` - Mark issue as rectified
- `POST /api/issues/:id/qa-verify` - QA verify issue (close)

## 🎨 UI Components

### Admin Layout
- Responsive sidebar navigation
- Mobile hamburger menu
- User profile with logout
- Role-based access control

### Buildings Management
- Card-based layout
- Show floor count per building
- Add/Edit/Delete modals
- Real-time updates

### Floors Management
- Grid layout with blueprint preview
- Upload blueprint with automatic dimension detection
- Navigate to room management
- Show blueprint dimensions

### Rooms Polygon Editor
- Interactive canvas with zoom/pan
- Click to add polygon points
- Visual feedback while drawing
- Edit existing room polygons
- Color-coded rooms
- Mobile touch support with pinch-zoom
- Normalized coordinate storage (0..1)

### Issue Types Management
- Table layout
- Active/Inactive status toggle
- Sort order management
- Add/Edit/Delete modals

## 🔄 Issue Workflow

```
Open → InProgress → Rectified → Closed
  ↓        ↓           ↓          ↓
User    User/Mgr    User/Mgr     QA
creates  updates    rectifies  verifies
```

## 📱 Mobile-First Design

- Responsive layouts using TailwindCSS
- Touch-optimized controls
- Pinch-to-zoom on blueprints
- Mobile-friendly modals and forms
- PWA-ready (manifest planned)

## 🚧 Planned Features

### Phase 4: Offline Support
- IndexedDB for local storage
- Sync queue for offline operations
- Background sync when online
- Crash recovery
- PWA manifest and service worker

### Phase 5: Walkdown UI
- Walkdown creation wizard
- Blueprint viewer with issue pins
- Tap-to-create issues
- Daily Walk Round mode
- Photo capture from mobile camera

### Phase 6: Manager Dashboard
- Outstanding items view
- Filters by status, type, room, date
- Summary statistics
- Quick actions on issues

### Phase 7: PDF Reports
- Walkdown report generation
- Outstanding items report
- A4 format with photos
- Sign-off tables

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio
- `npm run db:setup` - Full database setup (migrate + generate + seed)

### Database Management
- View data: `npm run prisma:studio`
- Create migration: `npm run prisma:migrate`
- Reset database: `npx prisma migrate reset`

## 📝 License

[Add license information]

## 👥 Contributors

[Add contributor information]
