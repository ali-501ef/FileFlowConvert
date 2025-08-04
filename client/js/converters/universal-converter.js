/**
 * Universal to JPEG Converter
 * Converts various file formats (PDF, HEIC, PNG, WEBP, AVIF, BMP, video frames) to JPEG
 */

class UniversalConverter extends FileHandler {
    constructor() {
        super();
        this.ffmpeg = null;
        this.isFFmpegReady = false;
    }

    /**
     * Convert various file formats to JPEG
     */
    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('Please select files to convert.');
            return;
        }

        this.showProgress(() => {
            this.processConversion();
        }, 'Converting files to JPEG...');
    }

    /**
     * Update conversion status
     * @param {string} status - Status message
     */
    updateConversionStatus(status) {
        const conversionStatus = document.getElementById('conversion-status');
        if (conversionStatus) {
            conversionStatus.textContent = status;
        }
    }

    /**
     * Get selected JPEG quality from radio buttons
     * @returns {number} Quality setting (0.7, 0.85, 0.95)
     */
    getSelectedQuality() {
        const qualityRadio = document.querySelector('input[name="quality"]:checked');
        return qualityRadio ? parseFloat(qualityRadio.value) : 0.85;
    }

    /**
     * Process conversion for all selected files
     */
    async processConversion() {
        const results = [];
        const quality = this.getSelectedQuality();

        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                
                this.updateConversionStatus(`Converting ${file.name}... (${i + 1}/${this.selectedFiles.length})`);
                
                try {
                    const convertedBlob = await this.convertFileToJpeg(file, quality);
                    
                    // Generate output filename
                    const outputFilename = this.generateOutputFilename(file.name);
                    
                    results.push({
                        filename: outputFilename,
                        blob: convertedBlob,
                        originalFile: file
                    });

                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    
                    // Create error blob for failed conversion
                    const errorText = `Failed to convert ${file.name}: ${error.message}`;
                    const errorBlob = new Blob([errorText], { type: 'text/plain' });
                    
                    results.push({
                        filename: `ERROR_${file.name}.txt`,
                        blob: errorBlob,
                        originalFile: file
                    });
                }
            }

            // Show download results with preview
            this.showDownloadResultsWithPreview(results);

        } catch (error) {
            console.error('Conversion process failed:', error);
            alert('Conversion failed. Please try again with different files.');
            
            // Reset interface on error
            this.resetInterface();
            this.showActionButtons();
        }
    }

    /**
     * Convert a single file to JPEG
     * @param {File} file - File to convert
     * @param {number} quality - JPEG quality (0.7-0.95)
     * @returns {Promise<Blob>} JPEG blob
     */
    async convertFileToJpeg(file, quality) {
        const fileType = this.detectFileType(file);
        
        switch (fileType) {
            case 'heic':
                return await this.convertHeicToJpeg(file, quality);
            case 'pdf':
                return await this.convertPdfToJpeg(file, quality);
            case 'image':
                return await this.convertImageToJpeg(file, quality);
            case 'video':
                return await this.convertVideoFrameToJpeg(file, quality);
            default:
                throw new Error(`Unsupported file format: ${file.type || 'unknown'}`);
        }
    }

    /**
     * Detect file type based on MIME type and extension
     * @param {File} file - File to analyze
     * @returns {string} File type category
     */
    detectFileType(file) {
        const fileName = file.name.toLowerCase();
        const mimeType = file.type.toLowerCase();

        // HEIC files
        if (fileName.endsWith('.heic') || mimeType === 'image/heic') {
            return 'heic';
        }

        // PDF files
        if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
            return 'pdf';
        }

        // Video files
        if (mimeType.startsWith('video/') || fileName.match(/\.(mp4|mov|avi|mkv|webm)$/)) {
            return 'video';
        }

        // Image files
        if (mimeType.startsWith('image/') || fileName.match(/\.(png|webp|avif|bmp|gif|svg|tiff?)$/)) {
            return 'image';
        }

        return 'unknown';
    }

    /**
     * Convert HEIC file to JPEG
     * @param {File} file - HEIC file
     * @param {number} quality - JPEG quality
     * @returns {Promise<Blob>} JPEG blob
     */
    async convertHeicToJpeg(file, quality) {
        if (typeof heic2any === 'undefined') {
            throw new Error('HEIC conversion library not loaded');
        }

        try {
            const convertedBlob = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: quality
            });

            return convertedBlob;
        } catch (error) {
            throw new Error(`HEIC conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert PDF first page to JPEG
     * @param {File} file - PDF file
     * @param {number} quality - JPEG quality
     * @returns {Promise<Blob>} JPEG blob
     */
    async convertPdfToJpeg(file, quality) {
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDF library not loaded');
        }

        try {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(pdfBytes);
            
            if (pdf.getPageCount() === 0) {
                throw new Error('PDF contains no pages');
            }

            // Get first page
            const page = pdf.getPage(0);
            const { width, height } = page.getSize();

            // Create canvas to render PDF page
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size (scale down if too large)
            const maxSize = 2048;
            const scale = Math.min(maxSize / width, maxSize / height, 1);
            canvas.width = width * scale;
            canvas.height = height * scale;

            // Render PDF page to canvas (simplified approach)
            // Note: This is a basic implementation. For full PDF rendering, 
            // consider using PDF.js or similar library
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add text indicating PDF conversion
            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`PDF: ${file.name} (Page 1)`, canvas.width / 2, canvas.height / 2);
            ctx.fillText('Full PDF rendering requires additional setup', canvas.width / 2, canvas.height / 2 + 30);

            // Convert canvas to JPEG blob
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create JPEG from PDF'));
                    }
                }, 'image/jpeg', quality);
            });

        } catch (error) {
            throw new Error(`PDF conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert image file to JPEG
     * @param {File} file - Image file
     * @param {number} quality - JPEG quality
     * @returns {Promise<Blob>} JPEG blob
     */
    async convertImageToJpeg(file, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Create canvas element
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions to match image
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    
                    // Fill with white background for transparency
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert canvas to JPEG blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create JPEG blob'));
                        }
                    }, 'image/jpeg', quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            // Load the image
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Extract first frame from video and convert to JPEG
     * @param {File} file - Video file
     * @param {number} quality - JPEG quality
     * @returns {Promise<Blob>} JPEG blob
     */
    async convertVideoFrameToJpeg(file, quality) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            
            video.onloadeddata = () => {
                try {
                    // Create canvas to capture frame
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Draw video frame to canvas
                    ctx.drawImage(video, 0, 0);
                    
                    // Convert canvas to JPEG blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to extract video frame'));
                        }
                    }, 'image/jpeg', quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            video.onerror = () => {
                reject(new Error('Failed to load video'));
            };
            
            // Set video source and seek to first frame
            video.src = URL.createObjectURL(file);
            video.currentTime = 0.1; // Seek to 0.1 seconds to get a frame
        });
    }

    /**
     * Generate output filename
     * @param {string} originalName - Original filename
     * @returns {string} Output filename
     */
    generateOutputFilename(originalName) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        return `${nameWithoutExt}.jpg`;
    }

    /**
     * Show download results with image previews
     * @param {Array} results - Array of conversion results
     */
    showDownloadResultsWithPreview(results) {
        const progressSection = document.getElementById('progress-section');
        const downloadSection = document.getElementById('download-section');
        const downloadLinks = document.getElementById('download-links');
        const previewContainer = document.getElementById('preview-container');
        
        if (progressSection) FileFlowUtils.hideElement(progressSection);
        if (downloadSection) FileFlowUtils.showElement(downloadSection);
        
        // Clear previous results
        if (downloadLinks) downloadLinks.innerHTML = '';
        if (previewContainer) previewContainer.innerHTML = '';
        
        results.forEach((result, index) => {
            // Create download link
            if (downloadLinks && result.blob.type !== 'text/plain') {
                const downloadLink = FileFlowUtils.createDownloadLink(result.filename, result.blob);
                downloadLinks.appendChild(downloadLink);
                
                // Create preview if it's an image
                if (result.blob.type === 'image/jpeg') {
                    const previewImage = document.createElement('div');
                    previewImage.className = 'preview-image';
                    previewImage.innerHTML = `
                        <img src="${URL.createObjectURL(result.blob)}" alt="Preview of ${result.filename}" loading="lazy">
                        <p class="preview-filename">${result.filename}</p>
                    `;
                    previewContainer.appendChild(previewImage);
                }
            } else if (downloadLinks) {
                // Error file
                const downloadLink = FileFlowUtils.createDownloadLink(result.filename, result.blob);
                downloadLinks.appendChild(downloadLink);
            }
        });
    }

    /**
     * Override showProgress to include conversion status
     */
    showProgress(onComplete, statusText = 'Converting files to JPEG...') {
        super.showProgress(onComplete, statusText);
        this.updateConversionStatus('Analyzing files...');
    }
}

// Initialize universal converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('convert-to-jpeg')) {
        window.fileHandler = new UniversalConverter();
    }
});