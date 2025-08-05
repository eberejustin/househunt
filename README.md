# HouseHunt 🏠

A collaborative apartment hunting application that allows users to search for and share apartment listings with friends and family. The platform features an interactive map interface where users can add apartment locations, share notes, leave comments, and favorite properties.

## Features

### 🗺️ Interactive Map
- Add apartments by clicking on the map or entering addresses
- Visual markers for all apartment locations
- Auto-centering on newly added apartments
- Popup details showing rent, bedrooms, and comment count

### 🏢 Apartment Management
- Add new apartments with address, rent, and bedroom information
- Auto-fill labels with apartment addresses for quick entry
- Edit existing apartment details
- Delete apartments you've added
- Add listing links for easy reference

### 💬 Collaborative Features
- Comment threads for each apartment
- Real-time discussions about properties
- User identification for all comments and changes
- Favorite apartments for quick access

### 🔐 Simple Authentication
- Secure login with Replit Auth
- Minimal barriers to entry
- Easy user identification across the platform

## Tech Stack

### Frontend
- **React 18** with TypeScript for modern component architecture
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching
- **Shadcn/ui** component library with Tailwind CSS
- **Leaflet.js** for interactive mapping functionality
- **Vite** for fast development and optimized builds

### Backend
- **Node.js** with Express.js for RESTful API
- **TypeScript** with ES modules
- **Replit Auth** with OpenID Connect for authentication
- **PostgreSQL** sessions with connect-pg-simple
- Centralized error handling and middleware

### Database
- **PostgreSQL** with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations
- Automated schema management and migrations
- Well-defined relationships for users, apartments, and comments

## Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (automatically configured on Replit)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd househunt
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Automatically configured on Replit
DATABASE_URL=<your-postgresql-connection-string>
SESSION_SECRET=<your-session-secret>
REPLIT_DOMAINS=<your-replit-domains>
```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configs
│   │   └── pages/          # Route components
│   └── index.html
├── server/                 # Express backend
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data access layer
│   └── replitAuth.ts      # Authentication setup
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
└── README.md
```

## API Endpoints

### Authentication
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout user
- `GET /api/auth/user` - Get current user info

### Apartments
- `GET /api/apartments` - List all apartments
- `POST /api/apartments` - Create new apartment
- `PUT /api/apartments/:id` - Update apartment
- `DELETE /api/apartments/:id` - Delete apartment

### Comments
- `GET /api/apartments/:id/comments` - Get apartment comments
- `POST /api/apartments/:id/comments` - Add comment
- `DELETE /api/comments/:id` - Delete comment

### Favorites
- `POST /api/apartments/:id/favorite` - Toggle favorite status

## Development

### Database Management

```bash
# Push schema changes to database
npm run db:push

# Generate database migrations
npm run db:generate

# View database in Drizzle Studio
npm run db:studio
```

### Code Quality

The project uses TypeScript for type safety and follows modern React patterns:

- Functional components with hooks
- Type-safe API calls with TanStack Query
- Form validation with Zod schemas
- Consistent styling with Tailwind CSS

### Environment Setup

The application is optimized for Replit but can run locally:

- Vite handles frontend development server
- Express serves API and static files in production
- PostgreSQL for reliable data persistence
- Session-based authentication with proper security

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Submit a pull request

## Architecture Decisions

### Map-Centric Design
The application prioritizes the map interface as the primary user experience, with the sidebar providing contextual information and actions.

### Simple Markers
Uses default Leaflet markers for clean, recognizable apartment locations instead of complex custom styling.

### Auto-Fill Labels
Apartment labels automatically match addresses to reduce user input while maintaining flexibility for custom names.

### Real-Time Collaboration
WebSocket integration enables real-time updates for comments and apartment changes across multiple users.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

---

Built with ❤️ for collaborative apartment hunting