# FileFlow Upload Component Integration Tests

## Overview
These integration tests verify the unified upload component system works correctly across all 11 FileFlow target pages.

## Test Coverage
- **HTML Structure**: Verifies correct ff-upload/ff-dropzone markup with accessibility attributes
- **File Input Attributes**: Checks accept/multiple attributes are set correctly for each page
- **Script Loading**: Confirms uploader.js and upload-dispatch.js load properly 
- **Click Behavior**: Ensures file picker opens exactly once per click (no double-open bugs)
- **Drag & Drop**: Tests drag states and visual feedback
- **Dispatch System**: Verifies files are routed to correct converter handlers
- **SPA Navigation**: Tests upload functionality persists after page navigation

## Target Pages
1. PDF Split (`pdf-split`) - PDF files only
2. PDF Compress (`pdf-compress`) - PDF files only  
3. PDF Rotate (`pdf-rotate`) - PDF files only
4. PDF Watermark (`pdf-watermark`) - PDF files only
5. PDF to Word (`pdf-to-word`) - PDF files only
6. Audio Converter (`audio-converter`) - Audio files only
7. MP4 to MP3 (`mp4-to-mp3`) - Video files only
8. Video Compress (`video-compress`) - Video files only
9. GIF Maker (`gif-maker`) - Video files only
10. Video Trim (`video-trim`) - Video files only  
11. Video Merger (`video-merger`) - Video files, multiple selection

## Running Tests

### Using Jest (Recommended)
```bash
cd client/tests/upload
npm install jest jsdom
npm test
```

### Using Playwright
```bash
npm install @playwright/test
npx playwright test upload-integration.test.js
```

### Manual Testing
1. Open any target page in browser
2. Click dropzone area - file picker should open once
3. Click "Choose a File" button - file picker should open once  
4. Drag file over dropzone - should show visual feedback
5. Select file - should dispatch to appropriate converter

## Test Files
- `upload-integration.test.js` - Main integration test suite
- `jest.config.js` - Jest configuration
- `test-setup.js` - Test environment setup
- `README.md` - This documentation