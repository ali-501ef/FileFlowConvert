class UniversalHomepageConverter {
    constructor() {
        this.dropZone = document.getElementById('universal-drop-zone');
        this.fileInput = document.getElementById('universal-file-input');
        this.chooseFileBtn = document.getElementById('choose-file-btn');
        this.outputFormatSelect = document.getElementById('output-format');
        this.convertBtn = document.getElementById('convert-now-btn');
        
        this.selectedFile = null;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        if (!this.dropZone || !this.fileInput || !this.chooseFileBtn || !this.convertBtn) {
            return; // Elements not found, homepage converter not available
        }
        
        // Drop zone events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        
        // File input events
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Button events
        this.chooseFileBtn.addEventListener('click', () => this.fileInput.click());
        this.convertBtn.addEventListener('click', this.handleConvert.bind(this));
        
        // Format change events
        this.outputFormatSelect.addEventListener('change', this.updateConvertButton.bind(this));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.selectFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.selectFile(files[0]);
        }
    }
    
    selectFile(file) {
        this.selectedFile = file;
        this.updateDropZoneText();
        this.updateConvertButton();
    }
    
    updateDropZoneText() {
        if (this.selectedFile) {
            const dropZoneContent = this.dropZone.querySelector('.drop-zone-content');
            
            // Clear existing content
            dropZoneContent.innerHTML = '';
            
            // Add preview based on file type
            this.addFilePreview(dropZoneContent, this.selectedFile);
            
            // Add file info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-preview-info';
            fileInfo.innerHTML = `
                <p class="file-preview-name">${this.selectedFile.name}</p>
                <p class="file-preview-size">${this.formatFileSize(this.selectedFile.size)} • Click to change file</p>
            `;
            dropZoneContent.appendChild(fileInfo);
        }
    }
    
    addFilePreview(container, file) {
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'file-preview-wrapper';
        
        if (file.type.startsWith('image/')) {
            // Image preview
            const img = document.createElement('img');
            img.className = 'file-preview-image';
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            previewWrapper.appendChild(img);
        } else if (file.type === 'application/pdf') {
            // PDF icon preview
            const pdfIcon = document.createElement('div');
            pdfIcon.className = 'file-preview-icon pdf-icon';
            pdfIcon.innerHTML = `
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            `;
            previewWrapper.appendChild(pdfIcon);
        } else if (file.type.startsWith('video/')) {
            // Video thumbnail/icon
            const videoIcon = document.createElement('div');
            videoIcon.className = 'file-preview-icon video-icon';
            videoIcon.innerHTML = `
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
            `;
            previewWrapper.appendChild(videoIcon);
        } else {
            // Generic file icon
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-preview-icon generic-icon';
            fileIcon.innerHTML = `
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            `;
            previewWrapper.appendChild(fileIcon);
        }
        
        container.appendChild(previewWrapper);
    }
    
    updateConvertButton() {
        const hasFile = this.selectedFile !== null;
        const hasFormat = this.outputFormatSelect && this.outputFormatSelect.value;
        
        if (this.convertBtn) {
            this.convertBtn.disabled = !hasFile || !hasFormat;
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    handleConvert() {
        if (!this.selectedFile) {
            alert('Please select a file first.');
            return;
        }
        
        const outputFormat = this.outputFormatSelect.value;
        if (!outputFormat) {
            alert('Please select an output format.');
            return;
        }
        
        // Perform conversion directly on the homepage
        this.performInlineConversion(this.selectedFile, outputFormat);
    }
    
    async performInlineConversion(file, outputFormat) {
        // Show loading state
        this.showConversionProgress();
        
        try {
            const fileType = file.type.toLowerCase();
            const fileName = file.name.toLowerCase();
            
            // Check for HEIC files by name since MIME type might not be detected
            if (fileName.includes('.heic') || fileName.includes('.heif') || fileType.includes('heic') || fileType.includes('heif')) {
                this.showUnsupportedMessage('HEIC', outputFormat);
                return;
            }
            
            if (fileType.startsWith('image/')) {
                await this.convertImage(file, outputFormat);
            } else if (fileType === 'application/pdf') {
                this.showUnsupportedMessage('PDF', outputFormat);
            } else if (fileType.startsWith('video/')) {
                this.showUnsupportedMessage('Video', outputFormat);
            } else if (fileType.startsWith('audio/')) {
                this.showUnsupportedMessage('Audio', outputFormat);
            } else {
                this.showUnsupportedMessage('File', outputFormat);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            this.showConversionError(error.message);
        }
    }
    
    async convertImage(file, outputFormat) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                try {
                    // Set canvas dimensions
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Clear canvas and draw image
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // For PNG output, ensure transparency is preserved
                    if (outputFormat.toLowerCase() === 'png') {
                        ctx.globalCompositeOperation = 'source-over';
                    } else {
                        // For JPEG, fill with white background
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert to target format
                    const mimeType = this.getMimeType(outputFormat);
                    const quality = this.getCompressionQuality(outputFormat);
                    
                    canvas.toBlob((blob) => {
                        if (blob && blob.size > 0) {
                            this.downloadConvertedFile(blob, file.name, outputFormat);
                            this.showConversionSuccess();
                            resolve();
                        } else {
                            reject(new Error('Failed to convert image - empty result'));
                        }
                    }, mimeType, quality);
                } catch (error) {
                    reject(new Error(`Image conversion failed: ${error.message}`));
                }
            };
            
            img.onerror = (error) => {
                reject(new Error('Failed to load image - unsupported format or corrupted file'));
            };
            
            // Set crossOrigin to handle CORS if needed
            img.crossOrigin = 'anonymous';
            img.src = URL.createObjectURL(file);
        });
    }
    
    getMimeType(format) {
        const mimeTypes = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff'
        };
        return mimeTypes[format.toLowerCase()] || 'image/jpeg';
    }
    
    getCompressionQuality(format) {
        // Return quality for lossy formats
        if (format.toLowerCase() === 'jpeg' || format.toLowerCase() === 'jpg') {
            return 0.9; // 90% quality
        }
        return 1.0; // No compression for lossless formats
    }
    
    downloadConvertedFile(blob, originalName, format) {
        const link = document.createElement('a');
        const fileName = this.getConvertedFileName(originalName, format);
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }
    
    getConvertedFileName(originalName, format) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        return `${nameWithoutExt}.${format.toLowerCase()}`;
    }
    
    showConversionProgress() {
        this.convertBtn.innerHTML = `
            <svg class="animate-spin" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2" stroke-opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"></path>
            </svg>
            Converting...
        `;
        this.convertBtn.disabled = true;
    }
    
    showConversionSuccess() {
        this.convertBtn.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Converted!
        `;
        
        // Reset button after 2 seconds
        setTimeout(() => {
            this.convertBtn.innerHTML = 'Convert Now';
            this.convertBtn.disabled = false;
        }, 2000);
    }
    
    showConversionError(message) {
        this.convertBtn.innerHTML = 'Conversion Failed';
        this.convertBtn.disabled = false;
        
        // Show error message to user
        alert(`Conversion failed: ${message}`);
        
        // Reset button after 2 seconds
        setTimeout(() => {
            this.convertBtn.innerHTML = 'Convert Now';
        }, 2000);
    }
    
    showUnsupportedMessage(fileType, format) {
        let message;
        let shouldRedirect = true;
        
        if (fileType === 'HEIC') {
            message = `HEIC files require specialized conversion. Redirecting to our HEIC to JPG converter...`;
        } else if (fileType === 'PDF') {
            message = `PDF conversions require specialized tools. Redirecting to our PDF converter...`;
        } else {
            message = `${fileType} to ${format.toUpperCase()} conversion requires specialized tools. Redirecting to the appropriate converter...`;
        }
        
        // Reset button first
        this.convertBtn.innerHTML = 'Redirecting...';
        
        // Show message and redirect after a short delay
        setTimeout(() => {
            alert(message);
            this.redirectToSpecificConverter(this.selectedFile, format);
        }, 500);
    }
    
    redirectToSpecificConverter(file, outputFormat) {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        
        if (outputFormat === 'pdf') {
            window.location.href = '/pdf-merge.html';
        } else if (outputFormat === 'mp3') {
            window.location.href = '/mp4-to-mp3.html';
        } else if (fileType.includes('heic') || fileName.includes('.heic')) {
            window.location.href = '/heic-to-jpg.html';
        } else {
            window.location.href = '/convert-to-jpeg.html';
        }
    }
}

// Initialize the universal homepage converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        new UniversalHomepageConverter();
    }
});