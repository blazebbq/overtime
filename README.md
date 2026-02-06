# Overtime Booking Application

A production-ready overtime booking system built with Next.js, featuring real-time shift management, user authentication, and an admin dashboard.

## Features

### For Users
- 🔐 Secure authentication with NextAuth
- 📅 View and book available overtime shifts
- 👤 Personal booking management
- ✅ Always able to cancel own bookings (even when shift is full)
- 🎨 Color-coded shifts (Yellow, Orange, Purple, Green)
- 📱 Mobile-responsive design

### For Admins
- 🛠️ Complete admin dashboard
- ➕ Create new overtime requests
- 📊 View all bookings and user assignments
- 🗂️ Archive/unarchive overtime requests
- 👥 User management (create users, modify roles)
- 🔒 Protected admin routes

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth v4
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Icons**: Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

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
   ```
   
   Edit `.env` and set your values:
   ```
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   DATABASE_URL="file:./dev.db"
   ```
   
   Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Seed the database** (optional but recommended)
   ```bash
   npx tsx prisma/seed.ts
   ```
   
   This creates:
   - 2 admin users
   - 4 regular users
   - 6 overtime requests with various states

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Test Accounts

After running the seed script, you can log in with:

**Admin Account:**
- Email: `admin@test.com`
- Password: `password123`

**Regular User Account:**
- Email: `user@test.com`
- Password: `password123`

Additional test users: `john@test.com`, `emma@test.com`, `mike@test.com`, `manager@test.com` (all with password `password123`)

## Usage

### For Regular Users

1. **Log in** at `/login`
2. **View shifts** on the homepage
3. **Book a shift** by clicking the "Book Shift" button
4. **Cancel booking** by clicking "Cancel My Booking" (available even when shift is full)
5. **Log out** using the logout button in the header

### For Admins

1. **Access dashboard** by clicking "Dashboard" in the header (only visible to admins)
2. **Create overtime requests**:
   - Click "Create Overtime Request"
   - Fill in date, shift type, times, and required people
   - Submit to create
3. **Manage requests**:
   - View all requests including archived ones
   - Archive/unarchive requests as needed
   - See who has booked each shift
4. **Manage users**:
   - Switch to "Users" tab
   - Create new users
   - Toggle user roles between USER and ADMIN

## Project Structure

```
overtime/
├── app/
│   ├── admin/              # Admin dashboard
│   ├── api/
│   │   ├── admin/          # Admin API routes
│   │   ├── auth/           # NextAuth configuration
│   │   └── overtime/       # Overtime booking API
│   ├── components/         # Reusable components
│   ├── login/              # Login page
│   └── page.tsx            # Main booking page
├── lib/
│   ├── auth.ts             # Authentication helpers
│   └── prisma.ts           # Prisma client
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seeding
│   └── dev.db              # SQLite database
└── public/                 # Static assets
```

## Business Rules

### Critical Rules (Must Be Preserved)

1. **Cancellation Rule**: Users can ALWAYS cancel their own bookings, even when the shift is full
2. **Booking Rule**: New bookings are only blocked when shift is full AND user doesn't have an existing booking
3. **Data Integrity**: Overtime requests are never deleted, only archived with `status = "ARCHIVED"`
4. **Status Management**: 
   - OPEN: Accepting bookings
   - FULL: All slots filled
   - ARCHIVED: Not shown to regular users
   - CLOSED: Manually closed by admin

## API Routes

### Public Routes
- `GET /api/overtime` - List all active overtime requests
- `POST /api/overtime` - Book or cancel overtime (requires auth)

### Admin Routes (require ADMIN role)
- `GET /api/admin/overtime` - List all overtime requests (including archived)
- `POST /api/admin/overtime` - Create new overtime request
- `PATCH /api/admin/overtime/[id]` - Update overtime request status
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PATCH /api/admin/users/[id]` - Update user role

## Building for Production

```bash
npm run build
npm start
```

## Database Management

**View database:**
```bash
npx prisma studio
```

**Create migration:**
```bash
npx prisma migrate dev --name your_migration_name
```

**Reset database:**
```bash
npx prisma migrate reset
```

## Environment Variables

Required variables in `.env`:

- `NEXTAUTH_SECRET`: Secret key for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Base URL of your application
- `DATABASE_URL`: SQLite database file path

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially the cancellation rule!)
5. Submit a pull request

## License

This project is licensed under the MIT License.
