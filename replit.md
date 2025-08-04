# Overview

HouseHunt is a collaborative apartment hunting application that allows users to search for and share apartment listings with friends and family. The platform features an interactive map interface where users can add apartment locations, share notes, leave comments, and favorite properties. Built as a full-stack web application, it combines a React frontend with an Express backend and PostgreSQL database to deliver a seamless apartment discovery experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing with simple path-based navigation
- **State Management**: TanStack Query (React Query) for server state management, caching, and data synchronization
- **UI Components**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling
- **Mapping**: Leaflet.js for interactive map functionality with custom markers and location management
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features and type safety
- **Authentication**: Replit Auth integration with OpenID Connect (OIDC) for user authentication
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **API Design**: RESTful endpoints for apartments, comments, favorites, and user management
- **Error Handling**: Centralized error middleware with proper HTTP status codes

## Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting for scalable cloud database management
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema**: Well-defined tables for users, apartments, comments, favorites, and sessions
- **Migrations**: Drizzle Kit for database schema versioning and deployment

## Authentication and Authorization
- **Provider**: Replit Auth with OpenID Connect for secure user authentication
- **Session Storage**: PostgreSQL-backed sessions with automatic cleanup and TTL management
- **Authorization**: Middleware-based route protection ensuring users can only access their own data
- **User Management**: Automatic user creation and profile management from OIDC claims

## External Dependencies
- **Database Hosting**: Neon PostgreSQL for serverless database infrastructure
- **Authentication Service**: Replit Auth OIDC provider for user identity management
- **Mapping Service**: Leaflet with OpenStreetMap tiles for map rendering and interaction
- **Geocoding**: External geocoding service integration for address-to-coordinate conversion
- **CDN Resources**: Leaflet CSS and marker icons served from CDN for reliable asset delivery