# FileFlow - File Conversion Tools

## Recent Changes
- **Mobile Navigation System Implemented (Aug 2025)**: Created comprehensive mobile navigation with sliding sidebar menu, touch-friendly controls, and smooth animations. Features include: collapsible hamburger menu with rotation animation, glassmorphism design with backdrop blur, organized tool sections with visual indicators, proper touch targets (44px minimum), and body scroll prevention when menu is open. Navigation automatically closes on link selection and supports keyboard accessibility (ESC key).
- **Completed Audio/Video Tools Rebuild (Jan 2025)**: Successfully rebuilt all 6 Audio/Video tools (MP4→MP3, Audio Converter, Video Compress, Video Merger, Video Trim, GIF Maker) from scratch using the PDF Compress pattern. All tools now use shared components (FileUploader, ProgressTracker, ButtonLoader, ErrorDisplay, FileUtils, AnalyticsTracker), server-side processing via /api/convert-media, and consistent UI structure. This completes the comprehensive tool rebuild project.
- **Fixed Cross-Tool Reliability Issues (Jan 2025)**: Resolved inline onclick handler conflicts in PDF Merge and Video Compress tools that were causing double file picker opening. Applied unified upload pattern from working PDF Compress/Split reference implementations across all 8 broken tools. All tools now use clean JavaScript addEventListener patterns without conflicting inline handlers.

## Overview
FileFlow is a comprehensive client-side file conversion web application with a premium Apple/Notion-inspired design. It features a universal converter with live file previews, drag-and-drop functionality, and advanced options. The platform includes specialized tool sections for Image Tools (HEIC to JPG, JPG to PNG), PDF Tools (merge, split, compress, rotate, watermark, PDF to Word), and Media Tools (MP4 to MP3, video compression, audio conversion, video trimming, GIF creation, video merging). All conversions happen client-side for maximum privacy and speed, built with vanilla JavaScript and modern web technologies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Vanilla JavaScript with modern ES6+ features and modular design.
- **UI Design**: Apple/Notion-inspired premium interface with clean aesthetics, glassmorphism effects, consistent icon sizing, and a white background system.
- **Styling**: Custom CSS with CSS variables, smooth animations, and responsive grid layouts.
- **Navigation**: Clean sticky navigation bar with centered dropdown menus for Image Tools, PDF Tools, and Audio/Video Tools. Mobile-responsive design with dedicated sliding sidebar navigation featuring touch-friendly controls, glassmorphism effects, and organized tool sections. Universal Converter removed from navigation to focus on dedicated tool categories.
- **File Processing**: Client-side conversion engines with live preview functionality.
- **Universal Converter**: Drag-and-drop interface with intelligent format detection available on homepage without redirects.
- **Advanced Options**: Tool-specific settings with smooth toggle animations.
- **UI/UX Decisions**: Larger heading fonts, refined labels, optimized whitespace, vibrant blue primary actions, soft grays, clean contrast ratios, and absolute positioning for brand logo and mobile toggle with centered menu items.
- **Universal Design Pattern**: Standardized hero section with tool badges, features tags, upload areas, collapsible advanced options, tool information cards, and progress indicators across all image and PDF tools for consistent user experience.

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Server Structure**: Simple Express server serving static files and handling routes.
- **File Serving**: Static file serving for HTML pages and assets.
- **Development Setup**: Vite integration for hot reloading.
- **Build Process**: ESBuild for server bundling, Vite for client bundling.

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL.
- **Database Provider**: Neon Database (serverless PostgreSQL).
- **Schema Management**: Centralized schema definition.
- **Session Storage**: PostgreSQL-based session storage using `connect-pg-simple`.
- **Migration Strategy**: Drizzle Kit for database migrations.

### File Processing Architecture
- **Universal Converter**: Multi-format conversion engine with Canvas API, PDF.js, and Web Audio API integration.
- **Image Processing**: Native browser-based conversion between JPEG, PNG, WebP, GIF, BMP, TIFF formats with quality control.
- **HEIC Processing**: `heic2any` library integration with multi-attempt conversion strategies.
- **PDF Processing**: PDF.js integration for PDF-to-image conversion with high-resolution rendering, and real compression algorithms. `PyMuPDF`, `pdf2docx`, `pdfplumber`, `python-docx` for comprehensive PDF processing on the server.
- **Video Processing**: HTML5 Video API for thumbnail extraction and frame capture. Server-side FFmpeg processing for video/audio conversions, compression, audio extraction, video-to-GIF, video trimming, and merging.
- **Audio Processing**: Web Audio API for audio format conversion and WAV file generation. Server-side FFmpeg for audio format conversion.
- **Intelligent Type Detection**: MIME type analysis with filename extension fallback.
- **Client-Side Processing**: Most conversions happen locally for privacy and speed.
- **Server-Side Conversion System**: Robust image and PDF conversion using PIL/Pillow (Python), pyheif, and pillow-heif for HEIC support. Express API endpoints (`/api/upload`, `/api/convert`, `/api/download`) with `multer` for secure file handling.

### Authentication and Authorization
- **User Schema**: Basic user system with username/password authentication.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Security**: Bcrypt for password hashing.

## External Dependencies

### Core Technologies
- **Frontend**: Vanilla JavaScript with modern ES6+ modules.
- **Backend**: Node.js with Express.js.
- **Styling**: Custom CSS.

### File Processing Libraries
- **Image Processing**: HTML5 Canvas API, PIL/Pillow (Python).
- **HEIC Processing**: `heic2any` (client-side), `pyheif`, `pillow-heif` (server-side).
- **PDF Operations**: PDF.js, PyMuPDF, pdf2docx, pdfplumber, python-docx.
- **Video Processing**: FFmpeg (server-side).
- **Audio Processing**: Web Audio API.

### Development Tools
- **Build System**: Vite.
- **Code Quality**: ESLint.
- **Database ORM**: Drizzle ORM.
- **Database Provider**: Neon Database.
- **Session Management**: `connect-pg-simple`.
- **Database Migrations**: Drizzle Kit.
- **File Upload Middleware**: `multer`.
- **Password Hashing**: Bcrypt.
- **Drag-and-drop**: Sortable.js.