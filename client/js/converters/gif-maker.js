class GIFMaker {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.videoPreview = document.getElementById('videoPreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.uploadResult = null;
        this.outputBlob = null;
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.createGIF.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadFile.bind(this));
    }

    handleUploadAreaClick(e) {
        // Click guard to prevent double file picker opening
        if (this.isFilePickerOpen) {
            return;
        }
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        // Reset flag after a delay to handle cancel cases
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            this.handleFile(file);
        }
    }

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        try {
            // Upload file to server
            await this.uploadFile(file);
            this.convertBtn.disabled = false;
            
        } catch (error) {
            this.showError('Failed to upload file: ' + error.message);
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        
        // Show video preview
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = URL.createObjectURL(file);
        
        videoPlayer.addEventListener('loadedmetadata', () => {
            const duration = this.formatDuration(videoPlayer.duration);
            const resolution = `${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`;
            
            document.getElementById('videoInfo').innerHTML = `
                <div class="video-details">
                    <span class="detail-item">🎬 ${duration}</span>
                    <span class="detail-item">📐 ${resolution}</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
            
            // Update max duration for settings
            document.getElementById('startTime').max = Math.floor(videoPlayer.duration);
            document.getElementById('duration').max = Math.min(10, videoPlayer.duration);
        });

        this.filePreview.style.display = 'block';
        this.videoPreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
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

    getGIFSettings() {
        return {
            start_time: parseFloat(document.getElementById('startTime').value),
            duration: parseFloat(document.getElementById('duration').value),
            fps: parseInt(document.getElementById('frameRate').value),
            width: document.getElementById('width').value === 'original' ? null : parseInt(document.getElementById('width').value),
            loop: document.getElementById('loop').checked,
            boomerang: document.getElementById('boomerang').checked
        };
    }

    async createGIF() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Get GIF settings
            const settings = this.getGIFSettings();
            
            // Create GIF
            await this.performGIFCreation(settings);
            
            this.showGIFResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to create GIF: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    async performGIFCreation(settings) {
        this.showProgress(10);
        
        // Call backend conversion API
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_to_gif',
                options: settings
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'GIF creation failed');
        }

        const result = await response.json();
        this.showProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
    }

    showGIFResults() {
        const originalSize = this.currentFile.size;
        const gifSize = this.fileSize;
        const settings = this.getGIFSettings();

        // Show GIF preview if possible
        document.getElementById('gifPreview').innerHTML = `
            <img src="${this.downloadUrl}" alt="Generated GIF" style="max-width: 100%; border-radius: 8px;">
        `;

        document.getElementById('gifStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${settings.duration}s</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Frame Rate:</span>
                    <span class="stat-value">${settings.fps} FPS</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${this.formatFileSize(originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">GIF Size:</span>
                    <span class="stat-value">${this.formatFileSize(gifSize)}</span>
                </div>
            </div>
        `;

        this.results.style.display = 'block';
    }

    downloadFile() {
        if (this.downloadUrl) {
            const a = document.createElement('a');
            a.href = this.downloadUrl;
            a.download = this.currentFile.name.replace(/\.[^/.]+$/, '') + '_animation.gif';
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Audio/Video Tools',
                'event_label': 'GIF Maker',
                'value': 1
            });
        }
    }

    showProgress(percent) {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showLoading(show) {
        const btnText = this.convertBtn.querySelector('.btn-text');
        const btnLoader = this.convertBtn.querySelector('.btn-loader');
        
        if (show) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
            this.convertBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
            this.convertBtn.disabled = false;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.results.innerHTML = '';
        this.results.appendChild(errorDiv);
        this.results.style.display = 'block';
    }
}

// Initialize the GIF maker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GIFMaker();
});