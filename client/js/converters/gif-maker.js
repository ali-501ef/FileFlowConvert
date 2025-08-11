/**
 * GIF Maker
 * Creates animated GIFs from video files
 */
class GifMaker {
    constructor() {
        this.currentFile = null;
        this.uploadResult = null;
        this.isFilePickerOpen = false;
        this.isProcessing = false;
        this.videoDuration = 0;
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
        this.startTime = document.getElementById('startTime');
        this.duration = document.getElementById('duration');
        this.frameRate = document.getElementById('frameRate');
        this.quality = document.getElementById('quality');
        this.width = document.getElementById('width');
        this.loop = document.getElementById('loop');
        this.boomerang = document.getElementById('boomerang');
        
        // Initialize with default values
        if (this.startTime) this.startTime.value = '0';
        if (this.duration) this.duration.value = '3';
        if (this.frameRate) this.frameRate.value = '10';
        if (this.quality) this.quality.value = 'medium';
        if (this.width) this.width.value = '480';
        if (this.loop) this.loop.checked = true;
        if (this.boomerang) this.boomerang.checked = false;
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
            this.convertBtn.addEventListener('click', () => this.createGif());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

        // Option change handlers
        if (this.duration) {
            this.duration.addEventListener('input', () => this.validateDuration());
        }
        if (this.startTime) {
            this.startTime.addEventListener('input', () => this.validateStartTime());
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
                this.videoDuration = videoPlayer.duration;
                const duration = this.formatDuration(videoPlayer.duration);
                const resolution = `${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`;
                
                if (videoInfo) {
                    // Clear existing content
                    videoInfo.textContent = '';
                    
                    // Create container div
                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'video-details';
                    
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
                    
                    // Append all elements
                    detailsDiv.appendChild(durationSpan);
                    detailsDiv.appendChild(resolutionSpan);
                    detailsDiv.appendChild(fileSizeSpan);
                    videoInfo.appendChild(detailsDiv);
                }
                
                // Update time inputs with video duration limits
                this.validateDuration();
                this.validateStartTime();
                
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

    async createGif() {
        if (!this.currentFile || this.isProcessing) return;

        // Validate inputs
        const startTime = parseFloat(this.startTime?.value || '0');
        const duration = parseFloat(this.duration?.value || '3');
        
        if (startTime + duration > this.videoDuration) {
            this.showError('Start time + duration cannot exceed video length.');
            return;
        }

        this.setProcessingState(true, 'Creating GIF...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getGifSettings();
            await this.performGifCreation(settings);
            
            this.showGifResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('GIF creation failed: ' + error.message);
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getGifSettings() {
        return {
            start_time: parseFloat(this.startTime?.value || '0'),
            duration: parseFloat(this.duration?.value || '3'),
            fps: parseInt(this.frameRate?.value || '10'),
            quality: this.quality?.value || 'medium',
            width: this.width?.value === 'original' ? 'original' : parseInt(this.width?.value || '480'),
            loop: this.loop?.checked || true,
            boomerang: this.boomerang?.checked || false
        };
    }

    async performGifCreation(settings) {
        this.showProgress(10);
        
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_to_gif',
                options: {
                    start_time: settings.start_time,
                    duration: settings.duration,
                    fps: settings.fps,
                    width: settings.width
                }
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'GIF creation failed');
        }

        this.conversionResult = await response.json();
        this.showProgress(100);
    }

    showGifResults() {
        if (!this.results) return;

        const gifPreview = document.getElementById('gifPreview');
        const gifStats = document.getElementById('gifStats');

        // Show GIF preview
        if (gifPreview && this.conversionResult.download_url) {
            gifPreview.innerHTML = `
                <div class="gif-preview-container">
                    <h4>GIF Preview</h4>
                    <img src="${this.conversionResult.download_url}" alt="Generated GIF" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">
                </div>
            `;
        }

        // Show GIF stats
        if (gifStats && this.conversionResult) {
            const duration = parseFloat(this.duration?.value || '3');
            const fps = parseInt(this.frameRate?.value || '10');
            const width = this.width?.value === 'original' ? 'Original' : `${this.width?.value}px`;

            gifStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Duration</span>
                        <span class="stat-value">${duration}s</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Frame Rate</span>
                        <span class="stat-value">${fps} FPS</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Width</span>
                        <span class="stat-value">${width}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">File Size</span>
                        <span class="stat-value">${this.formatFileSize(this.conversionResult.file_size)}</span>
                    </div>
                </div>
            `;
        }

        this.results.style.display = 'block';
    }

    validateDuration() {
        if (!this.duration || !this.startTime || this.videoDuration === 0) return;
        
        const startTime = parseFloat(this.startTime.value || '0');
        const duration = parseFloat(this.duration.value || '3');
        const maxDuration = this.videoDuration - startTime;
        
        if (duration > maxDuration) {
            this.duration.value = Math.max(0.5, maxDuration).toFixed(1);
        }
        
        // Update max attribute
        this.duration.max = maxDuration.toFixed(1);
    }

    validateStartTime() {
        if (!this.startTime || this.videoDuration === 0) return;
        
        const startTime = parseFloat(this.startTime.value || '0');
        const duration = parseFloat(this.duration?.value || '3');
        
        if (startTime >= this.videoDuration) {
            this.startTime.value = Math.max(0, this.videoDuration - duration).toFixed(1);
        }
        
        // Update max attribute
        this.startTime.max = (this.videoDuration - 0.5).toFixed(1);
        
        this.validateDuration();
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `${this.currentFile.name.split('.')[0]}.gif`;
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
                event_category: 'GIF Maker',
                event_label: `${this.frameRate?.value}fps`
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
    new GifMaker();
});