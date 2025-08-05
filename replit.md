# Overview

HouseHunt is a collaborative apartment hunting application that allows users to search for and share apartment listings with friends and family. The platform features an interactive map interface where users can add apartment locations, share notes, leave comments, and favorite properties. Built as a full-stack web application, it combines a React frontend with an Express backend and PostgreSQL database to deliver a seamless apartment discovery experience.

# User Preferences

Preferred communication style: Simple, everyday language.
User request: Declined autocomplete implementation for apartment address but requested todo list
Design choice: Use OpenStreetMap Nominatim API for free geocoding
UX improvement: Auto-populate Custom Label with building number + street name from selected address
Mobile navigation: Clicking map marker focuses apartment and switches to list view; back button returns to map (not list)
Mobile responsiveness: Toggle between map view and apartment list view on smaller screens
Deleted listings: Use symmetrical circular grey markers instead of teardrop shapes for better visual distinction

# Recent Changes

- Implemented comprehensive labeling system similar to GitHub issues with color-coded labels that can be applied to multiple apartments (August 2025)
- Added global label management where new labels are available across all apartments for consistent categorization
- Enhanced apartment display to show labels in both sidebar list view and map popup with color-coded badges
- Improved label creation workflow to automatically add newly created labels to the apartment they were created from (August 2025)
- Added label filtering capability to apartment list view for easy categorization and organization (August 2025)
- Implemented address autocomplete using OpenStreetMap Nominatim API with auto-populated custom labels (August 2025)
- Added comprehensive three-tier geocoding fallback system: autocomplete → manual geocoding button → direct coordinate entry (August 2025)
- Fixed toast z-index to ensure error popups appear above modals and all UI elements (August 2025)
- Implemented mobile-responsive design with view toggle between apartment list and map (August 2025)
- Added mobile navigation: clicking map marker focuses apartment and shows list view, back button returns to map (August 2025)
- Simplified map markers from complex custom styling to clean default Leaflet markers for cleaner appearance
- Implemented auto-fill functionality where apartment labels automatically match addresses when creating new apartments
- Restructured sidebar to toggle between apartment list and detail views with proper navigation

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