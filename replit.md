# FileFlow - File Conversion Tools

## Overview

FileFlow is a client-side file conversion web application that provides multiple file format conversion tools. The application offers HEIC to JPG conversion, JPG to PNG conversion, PDF merging, and MP4 to MP3 conversion. Built with a modern web stack, it features a React frontend with TypeScript, Express.js backend, and uses client-side processing libraries for file conversions to ensure user privacy and fast processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design Pattern**: Component-based architecture with reusable UI components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server Structure**: Simple Express server serving static files and handling routes
- **File Serving**: Static file serving for HTML pages and assets
- **Development Setup**: Vite integration for hot reloading during development
- **Build Process**: ESBuild for server bundling, Vite for client bundling

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Centralized schema definition in shared directory
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Migration Strategy**: Drizzle Kit for database migrations

### File Processing Architecture
- **HEIC Conversion**: Client-side processing using heic2any library
- **Image Conversion**: HTML5 Canvas API for JPG to PNG conversion
- **PDF Operations**: PDF-lib library for client-side PDF merging
- **Video Processing**: FFmpeg WebAssembly for MP4 to MP3 conversion
- **Processing Strategy**: All conversions happen client-side for privacy and performance

### Authentication and Authorization
- **User Schema**: Basic user system with username/password authentication
- **Session Management**: Express sessions with PostgreSQL storage
- **Security**: Bcrypt for password hashing (implied by user schema structure)

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, TypeScript, Vite for modern frontend development
- **Backend Runtime**: Node.js with Express.js framework
- **Database**: Neon Database (serverless PostgreSQL) with Drizzle ORM

### UI and Styling Libraries
- **Component Library**: Shadcn/ui with Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Inter font family from Google Fonts

### File Processing Libraries
- **HEIC Processing**: heic2any library for iPhone photo conversion
- **PDF Operations**: PDF-lib for client-side PDF manipulation
- **Video Processing**: FFmpeg WebAssembly for audio extraction
- **Image Processing**: Native HTML5 Canvas API

### Development and Build Tools
- **Build System**: Vite for frontend, ESBuild for backend bundling
- **Development**: TSX for TypeScript execution, various Vite plugins
- **Code Quality**: TypeScript for type safety, ESLint configuration
- **Replit Integration**: Custom Vite plugins for Replit environment support

### State Management and Utilities
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Utilities**: date-fns for date manipulation, clsx for conditional styling
- **Carousel**: Embla Carousel for image/content carousels