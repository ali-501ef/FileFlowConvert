

/**
 * Video Compressor
 * Compresses video files with quality and size optimization
 */
class VideoCompressor {
    constructor() {
        this.currentFile = null;
        this.uploadResult = null;
        this.isFilePickerOpen = false;
        this.isProcessing = false;
        this.init();
        this.setupEventListeners();
    }

    init() {
        // DOM element references
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.videoPreview = document.getElementById('videoPreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Advanced options
        this.compressionLevel = document.getElementById('compressionLevel');
        this.videoQuality = document.getElementById('videoQuality');
        this.outputResolution = document.getElementById('outputResolution');
        this.frameRate = document.getElementById('frameRate');
        this.targetSize = document.getElementById('targetSize');
        
        // Initialize with default values
        if (this.compressionLevel) this.compressionLevel.value = 'medium';
        if (this.videoQuality) this.videoQuality.value = 'balanced';
        if (this.outputResolution) this.outputResolution.value = 'original';
        if (this.frameRate) this.frameRate.value = 'original';
        if (this.targetSize) this.targetSize.value = '';

        // Guarantee the upload area is clickable
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (uploadArea && fileInput) {
            uploadArea.style.position = 'relative'; // safety
            uploadArea.addEventListener('click', (e) => {
                // don't trigger if user clicked the hidden input itself
                if (!(e.target instanceof HTMLInputElement)) fileInput.click();
            });
        }
    }

    setupEventListeners() {
        // File input handlers
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => this.compressVideo());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

        // Option change handlers
        if (this.compressionLevel) {
            this.compressionLevel.addEventListener('change', () => this.updateQualityOptions());
        }
    }

    handleUploadAreaClick(e) {
        if (this.isFilePickerOpen || this.isProcessing) return;
        
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.isProcessing) {
            this.uploadArea.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleFileDrop(e) {
        e.preventDefault();
        if (this.isProcessing) return;
        
        this.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files } });
        }
    }

    async handleFileSelect(e) {
        if (this.isProcessing) return;
        
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            this.showError('Please select a video file.');
            return;
        }

        this.currentFile = file;
        this.showFileInfo(file);

        // Add video preview
        const previewSlot = document.getElementById('videoPreviewSlot');
        if (previewSlot && file && file.type.startsWith('video/')) {
            window.mountVideoPreview({ container: previewSlot, file, autoplay: false });
        }

        this.setProcessingState(true, 'Uploading file...');

        try {
            await this.uploadFile(file);
            this.setProcessingState(false);
            this.convertBtn.disabled = false;
        } catch (error) {
            this.setProcessingState(false);
            this.showError('Upload failed: ' + error.message);
        }
    }

    showFileInfo(file) {
        if (!this.filePreview) return;

        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const videoInfo = document.getElementById('videoInfo');
        const videoPlayer = document.getElementById('videoPlayer');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

        // Show video preview
        if (videoPlayer) {
            const videoURL = URL.createObjectURL(file);
            videoPlayer.src = videoURL;
            videoPlayer.addEventListener('loadedmetadata', () => {
                const duration = this.formatDuration(videoPlayer.duration);
                const resolution = `${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`;
                
                if (videoInfo) {
                    // Clear existing content
                    videoInfo.textContent = '';
                    
                    // Create container safely
                    const videoDetailsDiv = document.createElement('div');
                    videoDetailsDiv.className = 'video-details';
                    
                    // Create duration span
                    const durationSpan = document.createElement('span');
                    durationSpan.className = 'detail-item';
                    durationSpan.textContent = `🎬 ${duration}`;
                    
                    // Create resolution span
                    const resolutionSpan = document.createElement('span');
                    resolutionSpan.className = 'detail-item';
                    resolutionSpan.textContent = `📐 ${resolution}`;
                    
                    // Create file size span
                    const fileSizeSpan = document.createElement('span');
                    fileSizeSpan.className = 'detail-item';
                    fileSizeSpan.textContent = `📊 ${this.formatFileSize(file.size)}`;
                    
                    // Append all elements safely
                    videoDetailsDiv.appendChild(durationSpan);
                    videoDetailsDiv.appendChild(resolutionSpan);
                    videoDetailsDiv.appendChild(fileSizeSpan);
                    videoInfo.appendChild(videoDetailsDiv);
                }
                
                // Clean up object URL after a delay
                setTimeout(() => URL.revokeObjectURL(videoURL), 1000);
            });
        }

        if (this.videoPreview) this.videoPreview.style.display = 'block';
        this.filePreview.style.display = 'block';
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        this.uploadResult = await response.json();
    }

    async compressVideo() {
        if (!this.currentFile || this.isProcessing) return;

        this.setProcessingState(true, 'Compressing video...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getCompressionSettings();
            await this.performCompression(settings);
            
            this.showCompressionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Compression failed: ' + error.message);
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getCompressionSettings() {
        return {
            compression: this.compressionLevel?.value || 'medium',
            quality: this.videoQuality?.value || 'balanced',
            resolution: this.outputResolution?.value || 'original',
            framerate: this.frameRate?.value === 'original' ? undefined : this.frameRate?.value,
            target_size: this.targetSize?.value || undefined
        };
    }

    async performCompression(settings) {
        this.showProgress(10);
        
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_compress',
                options: {
                    compression: settings.compression,
                    resolution: settings.resolution,
                    framerate: settings.framerate,
                    format: 'mp4'
                }
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Compression failed');
        }

        this.conversionResult = await response.json();
        this.showProgress(100);
    }

    showCompressionResults() {
        if (!this.results) return;

        const videoStats = document.getElementById('videoStats');

        // Show compression stats
        if (videoStats && this.conversionResult) {
            const originalSize = this.currentFile.size;
            const compressedSize = this.conversionResult.file_size;
            const compressionRatio = this.conversionResult.compression_ratio || 
                Math.round((1 - compressedSize/originalSize) * 100);

            videoStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Original Size</span>
                        <span class="stat-value">${this.formatFileSize(originalSize)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Compressed Size</span>
                        <span class="stat-value">${this.formatFileSize(compressedSize)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Space Saved</span>
                        <span class="stat-value">${compressionRatio}%</span>
                    </div>
                </div>
            `;
        }

        this.results.style.display = 'block';
    }

    updateQualityOptions() {
        // Update quality recommendations based on compression level
        const level = this.compressionLevel?.value;
        const qualitySelect = this.videoQuality;
        
        if (qualitySelect) {
            const currentValue = qualitySelect.value;
            qualitySelect.innerHTML = '';
            
            if (level === 'light') {
                qualitySelect.innerHTML = `
                    <option value="high">High Quality</option>
                    <option value="balanced" selected>Balanced</option>
                `;
            } else if (level === 'medium') {
                qualitySelect.innerHTML = `
                    <option value="balanced" selected>Balanced</option>
                    <option value="good">Good</option>
                `;
            } else if (level === 'heavy') {
                qualitySelect.innerHTML = `
                    <option value="good">Good</option>
                    <option value="acceptable" selected>Acceptable</option>
                `;
            }
            
            // Restore previous value if available
            if (qualitySelect.querySelector(`option[value="${currentValue}"]`)) {
                qualitySelect.value = currentValue;
            }
        }
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `compressed_${this.currentFile.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    setProcessingState(processing, message = '') {
        this.isProcessing = processing;
        
        // Create/update processing overlay
        let overlay = this.uploadArea.querySelector('.processing-overlay');
        if (processing) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'processing-overlay';
                this.uploadArea.appendChild(overlay);
            }
            overlay.innerHTML = `
                <div class="processing-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            overlay.style.display = 'flex';
            
            // Disable upload area interactions
            this.uploadArea.style.pointerEvents = 'none';
            this.uploadArea.style.opacity = '0.7';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
            // Re-enable upload area interactions
            this.uploadArea.style.pointerEvents = 'auto';
            this.uploadArea.style.opacity = '1';
        }
        
        // Update convert button
        if (this.convertBtn) {
            this.convertBtn.disabled = processing || !this.currentFile;
            const btnText = this.convertBtn.querySelector('.btn-text');
            const btnLoader = this.convertBtn.querySelector('.btn-loader');
            
            if (btnText) btnText.style.display = processing ? 'none' : 'inline';
            if (btnLoader) btnLoader.style.display = processing ? 'inline-block' : 'none';
        }
    }

    showProgress(percent) {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'block';
            if (this.progressFill) {
                this.progressFill.style.width = `${percent}%`;
            }
            if (this.progressText) {
                this.progressText.textContent = `${percent}%`;
            }
        }
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }

    showError(message) {
        // Show error message inline
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            this.uploadArea.parentNode.insertBefore(errorDiv, this.uploadArea.nextSibling);
        }
        
        errorDiv.innerHTML = `
            <div class="error-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>${message}</span>
            </div>
        `;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.style.display = 'none';
        }, 5000);
    }

    trackConversion() {
        // Analytics tracking for conversion
        if (window.gtag) {
            gtag('event', 'conversion', {
                event_category: 'Video Compress',
                event_label: this.compressionLevel?.value || 'medium'
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoCompressor();
});