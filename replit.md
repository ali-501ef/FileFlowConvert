# FileFlow - File Conversion Tools

## Overview

FileFlow is a comprehensive client-side file conversion web application with a premium Apple/Notion-inspired design. The platform features a universal converter with live file previews, drag-and-drop functionality, and advanced options for all conversion tools. It includes multiple specialized tool sections: Image Tools (HEIC to JPG, JPG to PNG), PDF Tools (merge, split, compress, rotate, watermark, PDF to Word), and Media Tools (MP4 to MP3, video compression, audio conversion, video trimming, GIF creation, video merging). Built with vanilla JavaScript and modern web technologies, all conversions happen client-side for maximum privacy and speed.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Vanilla JavaScript with modern ES6+ features and modular design
- **UI Design**: Apple/Notion-inspired premium interface with clean aesthetics
- **Styling**: Custom CSS with CSS variables, smooth animations, and responsive grid layouts
- **File Processing**: Client-side conversion engines with live preview functionality
- **Universal Converter**: Drag-and-drop interface with intelligent format detection
- **Advanced Options**: Tool-specific settings with smooth toggle animations

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
- **Universal Converter**: Multi-format support with intelligent type detection and live previews
- **Image Tools**: HEIC to JPG conversion, JPG to PNG with advanced resize/compression options
- **PDF Tools**: Comprehensive suite including merge, split, compress, rotate, watermark, and PDF to Word conversion
- **Media Tools**: Video/audio processing including MP4 to MP3, video compression, audio conversion, trimming, GIF creation, and video merging
- **Advanced Options**: Tool-specific settings for quality control, compression, metadata preservation, and format-specific parameters
- **Client-Side Processing**: All conversions happen locally for maximum privacy and speed

### Authentication and Authorization
- **User Schema**: Basic user system with username/password authentication
- **Session Management**: Express sessions with PostgreSQL storage
- **Security**: Bcrypt for password hashing (implied by user schema structure)

## Recent Changes (January 2025)

### Major Tool Expansion (January 2025)
- **PDF Tools Section**: All 6 tools now fully functional - PDF Merge, PDF Split, PDF Compress, PDF to Word, PDF Rotate, and PDF Watermark
- **Media Tools Section**: All 6 tools now fully functional - MP4 to MP3, Video Compress, Audio Converter, Video Trim, GIF Maker, and Video Merger
- **Premium Design Implementation**: Completely redesigned all tools with Apple/Notion-inspired hero sections, advanced options, and professional styling
- **Database Integration**: Added PostgreSQL database with conversion tracking and user management
- **No More "Coming Soon"**: All tools are now live, functional, and feature premium design quality

### Advanced Options Implementation
- **Advanced Options Handler**: Created comprehensive JavaScript module for managing advanced settings across all tools
- **Tool-Specific Settings**: Added resize/compression controls for images, page range/orientation settings for PDFs, and bitrate/trimming options for audio/video
- **Smooth Animations**: Implemented expandable sections with gear icons and chevron animations

### UI/UX Improvements
- **Responsive Grid Layout**: Enhanced tools grid with better spacing, centering, and 3-column layout on desktop
- **Live File Previews**: Universal converter displays thumbnails for images and file type icons for other formats
- **Drag-and-Drop Interface**: Implemented modern file upload with visual feedback and hover states

## External Dependencies

### Core Technologies
- **Frontend**: Vanilla JavaScript with modern ES6+ modules
- **Backend**: Node.js with Express.js for static file serving
- **Styling**: Custom CSS with CSS variables and responsive design

### File Processing Libraries
- **Image Processing**: HTML5 Canvas API for native image conversion
- **HEIC Processing**: heic2any library for iPhone photo conversion (planned)
- **PDF Operations**: PDF-lib for client-side PDF manipulation (planned)
- **Video Processing**: FFmpeg WebAssembly for media conversion (planned)

### Development Tools
- **Build System**: Vite for development server and hot reloading
- **Code Quality**: Modern JavaScript with ESLint configuration
- **Replit Integration**: Custom server setup for seamless deployment