

/**
 * MP4 to MP3 Converter
 * Converts video files to audio format with advanced options
 */
class MP4ToMP3Converter {
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
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Advanced options
        this.audioBitrate = document.getElementById('audioBitrate');
        this.audioFormat = document.getElementById('audioFormat');
        this.preserveMetadata = document.getElementById('preserveMetadata');
        this.normalizeAudio = document.getElementById('normalizeAudio');
        
        // Initialize with default values
        if (this.audioBitrate) this.audioBitrate.value = '192';
        if (this.audioFormat) this.audioFormat.value = 'mp3';
        if (this.preserveMetadata) this.preserveMetadata.checked = true;
        if (this.normalizeAudio) this.normalizeAudio.checked = false;

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
            this.convertBtn.addEventListener('click', () => this.convertToMP3());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
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

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

        // Get video metadata
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.addEventListener('loadedmetadata', () => {
            const duration = this.formatDuration(video.duration);
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            
            if (videoInfo) {
                // Clear existing content
                videoInfo.textContent = '';
                
                // Create container div
                const videoDetails = document.createElement('div');
                videoDetails.className = 'video-details';
                
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
                videoDetails.appendChild(durationSpan);
                videoDetails.appendChild(resolutionSpan);
                videoDetails.appendChild(fileSizeSpan);
                videoInfo.appendChild(videoDetails);
            }
            
            URL.revokeObjectURL(video.src);
        });

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

    async convertToMP3() {
        if (!this.currentFile || this.isProcessing) return;

        this.setProcessingState(true, 'Converting to MP3...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getConversionSettings();
            await this.performConversion(settings);
            
            this.showConversionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Conversion failed: ' + error.message);
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getConversionSettings() {
        return {
            bitrate: this.audioBitrate?.value || '192',
            format: this.audioFormat?.value || 'mp3',
            preserveMetadata: this.preserveMetadata?.checked || false,
            normalizeAudio: this.normalizeAudio?.checked || false
        };
    }

    async performConversion(settings) {
        this.showProgress(10);
        
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_to_audio',
                options: {
                    format: settings.format,
                    bitrate: settings.bitrate,
                    preserve_metadata: settings.preserveMetadata
                }
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        this.conversionResult = await response.json();
        this.showProgress(100);
    }

    showConversionResults() {
        if (!this.results) return;

        const audioStats = document.getElementById('audioStats');
        const audioPreview = document.getElementById('audioPreview');

        // Show file stats
        if (audioStats && this.conversionResult) {
            audioStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Format</span>
                        <span class="stat-value">${this.audioFormat?.value?.toUpperCase() || 'MP3'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bitrate</span>
                        <span class="stat-value">${this.audioBitrate?.value || '192'} kbps</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Size</span>
                        <span class="stat-value">${this.formatFileSize(this.conversionResult.file_size)}</span>
                    </div>
                </div>
            `;
        }

        // Show audio preview
        if (audioPreview && this.conversionResult.download_url) {
            audioPreview.innerHTML = `
                <div class="audio-preview-container">
                    <h4>Audio Preview</h4>
                    <audio controls style="width: 100%; margin-top: 10px;">
                        <source src="${this.conversionResult.download_url}" type="audio/${this.audioFormat?.value || 'mp3'}">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
        }

        this.results.style.display = 'block';
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `${this.currentFile.name.split('.')[0]}.${this.audioFormat?.value || 'mp3'}`;
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
                event_category: 'MP4 to MP3',
                event_label: this.audioFormat?.value || 'mp3'
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
    new MP4ToMP3Converter();
});