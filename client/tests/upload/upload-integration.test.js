// FileFlow Upload Component Integration Tests
// These tests verify the unified upload system works correctly across all pages

describe('FileFlow Upload Component Integration', () => {
  
  // Test pages configuration
  const testPages = [
    { path: '/pdf-split.html', pageId: 'pdf-split', accept: '.pdf', multiple: false },
    { path: '/pdf-compress.html', pageId: 'pdf-compress', accept: '.pdf', multiple: false },
    { path: '/pdf-rotate.html', pageId: 'pdf-rotate', accept: '.pdf', multiple: false },
    { path: '/pdf-watermark.html', pageId: 'pdf-watermark', accept: '.pdf', multiple: false },
    { path: '/pdf-to-word.html', pageId: 'pdf-to-word', accept: '.pdf', multiple: false },
    { path: '/audio-converter.html', pageId: 'audio-converter', accept: 'audio/*', multiple: false },
    { path: '/mp4-to-mp3.html', pageId: 'mp4-to-mp3', accept: 'video/*', multiple: false },
    { path: '/video-compress.html', pageId: 'video-compress', accept: 'video/*', multiple: false },
    { path: '/gif-maker.html', pageId: 'gif-maker', accept: 'video/*', multiple: false },
    { path: '/video-trim.html', pageId: 'video-trim', accept: 'video/*', multiple: false },
    { path: '/video-merger.html', pageId: 'video-merger', accept: 'video/*', multiple: true }
  ];

  testPages.forEach(({ path, pageId, accept, multiple }) => {
    describe(`${pageId} page`, () => {
      
      beforeEach(async () => {
        await page.goto(`${baseURL}${path}`);
        await page.waitForSelector('.ff-upload');
      });

      test('should have correct HTML structure', async () => {
        // Check ff-upload section with correct page-id
        const uploadSection = await page.$('.ff-upload');
        expect(uploadSection).toBeTruthy();
        
        const pageIdAttr = await page.getAttribute('.ff-upload', 'data-page-id');
        expect(pageIdAttr).toBe(pageId);

        // Check ff-dropzone with proper accessibility attributes  
        const dropzone = await page.$('.ff-dropzone');
        expect(dropzone).toBeTruthy();
        
        const role = await page.getAttribute('.ff-dropzone', 'role');
        expect(role).toBe('button');
        
        const tabindex = await page.getAttribute('.ff-dropzone', 'tabindex');
        expect(tabindex).toBe('0');

        // Check ff-choose-btn and ff-file-input exist
        const chooseBtn = await page.$('.ff-choose-btn');
        const fileInput = await page.$('.ff-file-input');
        expect(chooseBtn).toBeTruthy();
        expect(fileInput).toBeTruthy();
      });

      test('should have correct file input attributes', async () => {
        const acceptAttr = await page.getAttribute('.ff-file-input', 'accept');
        expect(acceptAttr).toBe(accept);
        
        const multipleAttr = await page.getAttribute('.ff-file-input', 'multiple');
        expect(!!multipleAttr).toBe(multiple);
      });

      test('should load uploader and dispatch scripts', async () => {
        // Verify window.ffBindUploaders exists (from uploader.js)
        const bindUploaders = await page.evaluate(() => typeof window.ffBindUploaders);
        expect(bindUploaders).toBe('function');
        
        // Verify window.ffUpload exists (from upload-dispatch.js)  
        const uploadDispatch = await page.evaluate(() => typeof window.ffUpload);
        expect(uploadDispatch).toBe('function');
      });

      test('should open file picker exactly once when clicking dropzone', async () => {
        let fileInputClicks = 0;
        
        // Mock file input click to count calls
        await page.evaluate(() => {
          const fileInput = document.querySelector('.ff-file-input');
          const originalClick = fileInput.click;
          fileInput.click = function() {
            window.fileInputClicks = (window.fileInputClicks || 0) + 1;
            return originalClick.call(this);
          };
        });

        // Click the dropzone
        await page.click('.ff-dropzone');
        
        // Verify file input was clicked exactly once
        const clickCount = await page.evaluate(() => window.fileInputClicks || 0);
        expect(clickCount).toBe(1);
      });

      test('should open file picker exactly once when clicking choose button', async () => {
        let fileInputClicks = 0;
        
        // Mock file input click to count calls
        await page.evaluate(() => {
          const fileInput = document.querySelector('.ff-file-input');
          const originalClick = fileInput.click;
          fileInput.click = function() {
            window.fileInputClicks = (window.fileInputClicks || 0) + 1;
            return originalClick.call(this);
          };
        });

        // Click the choose button
        await page.click('.ff-choose-btn');
        
        // Verify file input was clicked exactly once
        const clickCount = await page.evaluate(() => window.fileInputClicks || 0);
        expect(clickCount).toBe(1);
      });

      test('should support drag and drop functionality', async () => {
        const dropzone = await page.$('.ff-dropzone');
        
        // Create a mock file
        const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        
        // Simulate dragenter
        await page.evaluate((dropzone) => {
          const event = new DragEvent('dragenter', { 
            bubbles: true, 
            dataTransfer: new DataTransfer()
          });
          dropzone.dispatchEvent(event);
        }, dropzone);

        // Check that drag state is applied
        const hasDragClass = await page.evaluate((dropzone) => {
          return dropzone.classList.contains('is-drag');
        }, dropzone);
        expect(hasDragClass).toBe(true);

        // Simulate dragleave
        await page.evaluate((dropzone) => {
          const event = new DragEvent('dragleave', { bubbles: true });
          dropzone.dispatchEvent(event);
        }, dropzone);

        // Check that drag state is removed
        const noDragClass = await page.evaluate((dropzone) => {
          return !dropzone.classList.contains('is-drag');
        }, dropzone);
        expect(noDragClass).toBe(true);
      });

      test('should dispatch to correct converter on file upload', async () => {
        // Mock the dispatch function to capture calls
        await page.evaluate((pageId) => {
          window.dispatchCalls = [];
          const originalDispatch = window.ffUpload;
          window.ffUpload = async function(id, files) {
            window.dispatchCalls.push({ pageId: id, fileCount: files.length });
            return originalDispatch.call(this, id, files);
          };
        }, pageId);

        // Simulate file selection
        const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        await page.evaluate((mockFile, pageId) => {
          const fileInput = document.querySelector('.ff-file-input');
          const event = new Event('change', { bubbles: true });
          Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            configurable: true
          });
          fileInput.dispatchEvent(event);
        }, mockFile, pageId);

        // Wait for dispatch
        await page.waitForFunction(() => window.dispatchCalls && window.dispatchCalls.length > 0);
        
        const dispatchCalls = await page.evaluate(() => window.dispatchCalls);
        expect(dispatchCalls).toHaveLength(1);
        expect(dispatchCalls[0].pageId).toBe(pageId);
        expect(dispatchCalls[0].fileCount).toBe(1);
      });

    });
  });

  // Global tests
  describe('Cross-page functionality', () => {
    test('should work after SPA navigation', async () => {
      // Start on first page
      await page.goto(`${baseURL}/pdf-split.html`);
      await page.waitForSelector('.ff-upload');
      
      // Navigate to second page
      await page.goto(`${baseURL}/audio-converter.html`);
      await page.waitForSelector('.ff-upload');
      
      // Test that upload still works after navigation
      let fileInputClicks = 0;
      await page.evaluate(() => {
        const fileInput = document.querySelector('.ff-file-input');
        const originalClick = fileInput.click;
        fileInput.click = function() {
          window.fileInputClicks = (window.fileInputClicks || 0) + 1;
          return originalClick.call(this);
        };
      });

      await page.click('.ff-dropzone');
      
      const clickCount = await page.evaluate(() => window.fileInputClicks || 0);
      expect(clickCount).toBe(1);
    });
  });

});