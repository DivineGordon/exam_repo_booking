# Mini Booking System

A production-ready booking system built with Next.js 14, TypeScript, Prisma, and PostgreSQL. This system allows businesses to manage their services and availability, while consumers can explore and book appointments.

## Features

### Business Features
- User registration and authentication (JWT-based)
- Create and manage services (name, duration, price)
- Set availability schedules (day of week, start/end times)
- View upcoming bookings

### Consumer Features
- User registration and authentication (JWT-based)
- Browse available services from all businesses
- Book appointments with real-time availability checking
- View and manage personal bookings with pagination

### Technical Features
- JWT-based authentication with role-based access control
- Atomic booking transactions to prevent double-booking
- Server-side pagination for bookings
- Comprehensive error handling with proper HTTP status codes
- Loading and error states throughout the UI
- Toast notifications for user feedback
- Type-safe database operations with Prisma

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (using `jose` library)
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Custom components built with Radix UI primitives
- **Icons**: Lucide React

## Architecture Decisions

### Why Next.js 14 with App Router?

1. **Server-Side Rendering (SSR)**: Next.js provides excellent SSR capabilities, improving initial page load times and SEO. The App Router allows for efficient data fetching at the route level.

2. **API Routes**: Built-in API routes eliminate the need for a separate backend server, simplifying deployment and reducing infrastructure complexity.

3. **Type Safety**: Full TypeScript support with excellent type inference between frontend and backend code.

4. **Performance**: Automatic code splitting, image optimization, and static generation capabilities improve performance out of the box.

5. **Developer Experience**: Excellent tooling, hot module replacement, and a growing ecosystem make development efficient.

### Why Prisma ORM?

1. **Type Safety**: Prisma generates TypeScript types from the schema, ensuring type safety across the application. This catches errors at compile time rather than runtime.

2. **Type-Safe Relations**: Prisma's relation system is fully type-safe, making it impossible to query non-existent relations or use incorrect field names.

3. **Developer Experience**: Prisma Studio provides a visual database browser, and the migration system is straightforward and reliable.

4. **Query Performance**: Prisma generates optimized SQL queries and includes features like connection pooling.

5. **Schema as Code**: The Prisma schema file serves as both documentation and the source of truth for the database structure.

### Availability Overlap Logic

The availability engine (`src/services/availability.ts`) implements a robust conflict detection system:

1. **Day-Based Availability**: Each business sets availability for each day of the week (0-6, Sunday-Saturday).

2. **Slot Generation**: For a given date and service:
   - Fetches the business's operating hours for that day
   - Retrieves all existing confirmed bookings for that business on that date
   - Generates time slots based on the service duration (e.g., 30-minute slots for a 30-minute service)
   - Filters out any slots that overlap with existing bookings

3. **Overlap Detection**: Two time slots overlap if:
   ```
   slot1.start < slot2.end && slot1.end > slot2.start
   ```
   This covers all overlap scenarios:
   - Slot 1 starts during Slot 2
   - Slot 1 ends during Slot 2
   - Slot 1 completely contains Slot 2
   - Slot 2 completely contains Slot 1

4. **Atomic Booking**: When a consumer books a slot, the system uses a Prisma transaction to:
   - Check for overlapping bookings one final time (preventing race conditions)
   - Verify the slot is still available using the availability engine
   - Create the booking record atomically

This two-layer approach (pre-check + transaction) ensures no double-bookings can occur, even under high concurrency.

## Project Structure

```
booking_system/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── services/     # Service management
│   │   │   ├── availability/ # Availability management
│   │   │   └── bookings/     # Booking endpoints
│   │   ├── dashboard/
│   │   │   ├── business/     # Business dashboard
│   │   │   └── consumer/     # Consumer pages
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   ├── navbar.tsx        # Navigation component
│   │   ├── business-dashboard.tsx
│   │   ├── service-explorer.tsx
│   │   ├── booking-modal.tsx
│   │   └── my-bookings.tsx
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── auth.ts           # Authentication utilities
│   │   └── utils.ts          # Utility functions
│   ├── services/
│   │   └── availability.ts   # Availability engine
│   ├── hooks/
│   │   └── use-toast.ts      # Toast notification hook
│   └── middleware.ts         # Route protection middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Database Schema

### User
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `password`: String (Hashed with bcrypt)
- `role`: Enum ('BUSINESS' | 'CONSUMER')
- `createdAt`, `updatedAt`: Timestamps

### Service
- `id`: UUID (Primary Key)
- `name`: String
- `duration`: Integer (minutes)
- `price`: Float
- `businessId`: Foreign Key to User
- Relations: belongs to Business (User), has many Bookings

### Availability
- `id`: UUID (Primary Key)
- `businessId`: Foreign Key to User
- `dayOfWeek`: Integer (0-6, Sunday-Saturday)
- `startTime`: String (HH:mm format)
- `endTime`: String (HH:mm format)
- Unique constraint on (businessId, dayOfWeek)

### Booking
- `id`: UUID (Primary Key)
- `serviceId`: Foreign Key to Service
- `consumerId`: Foreign Key to User
- `businessId`: Foreign Key to User
- `slotStart`: DateTime
- `slotEnd`: DateTime
- `status`: Enum ('CONFIRMED' | 'CANCELLED')
- Indexes on serviceId, consumerId, businessId, and (slotStart, slotEnd) for query performance

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or hosted like Supabase)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd booking_system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/booking_system?schema=public"
   JWT_SECRET="your-secret-key-here-change-in-production"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npm run db:generate
   
   # Push schema to database (or use migrations)
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Services
- `GET /api/services` - List all services (optional `?businessId=...` filter)
- `POST /api/services` - Create a service (BUSINESS only)

### Availability
- `GET /api/availability?businessId=...` - Get business availability
- `POST /api/availability` - Create/update availability (BUSINESS only)
- `GET /api/availability/slots?businessId=...&serviceId=...&date=...` - Get available time slots

### Bookings
- `GET /api/bookings?page=1&limit=10` - List bookings with pagination
- `POST /api/bookings` - Create a booking (CONSUMER only)

## HTTP Status Codes

The API follows RESTful conventions:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (role-based access)
- `404` - Not Found
- `409` - Conflict (e.g., booking conflict, duplicate email)
- `500` - Internal Server Error

## Error Handling

- All API routes include comprehensive error handling
- Validation errors return detailed messages
- Frontend uses TanStack Query for automatic error state management
- Toast notifications provide user feedback for all actions
- Loading states are shown during async operations

## Security Considerations

1. **Password Hashing**: Passwords are hashed using bcrypt with a salt rounds of 10
2. **JWT Tokens**: Stored in HTTP-only cookies to prevent XSS attacks
3. **Role-Based Access Control**: Middleware and API routes enforce role-based permissions
4. **SQL Injection**: Prisma ORM prevents SQL injection through parameterized queries
5. **Input Validation**: Zod schemas validate all user inputs

## Future Enhancements

- Email notifications for bookings
- Booking cancellation functionality
- Calendar view for businesses
- Recurring availability patterns
- Service categories and search
- Rating and review system
- Payment integration

## License

This project is built for a technical assessment.
