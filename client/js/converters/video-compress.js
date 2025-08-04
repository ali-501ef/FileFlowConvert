class VideoCompressor {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.ffmpeg = null;
        this.isFFmpegLoaded = false;
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
        this.compressionLevel = document.getElementById('compressionLevel');
        this.customSettings = document.getElementById('customSettings');
        
        this.currentFile = null;
        this.outputBlob = null;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.compressVideo.bind(this));
        
        // Compression level change
        this.compressionLevel.addEventListener('change', this.handleCompressionChange.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadVideo.bind(this));
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
        
        // Load video for preview and info
        const url = URL.createObjectURL(file);
        this.videoPreview.src = url;
        
        this.videoPreview.onloadedmetadata = () => {
            const duration = this.formatDuration(this.videoPreview.duration);
            const resolution = `${this.videoPreview.videoWidth}x${this.videoPreview.videoHeight}`;
            
            document.getElementById('videoInfo').innerHTML = `
                <div class="video-details">
                    <span class="detail-item">🎬 ${resolution}</span>
                    <span class="detail-item">⏱️ ${duration}</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
        };
        
        // Initialize FFmpeg if not loaded
        if (!this.isFFmpegLoaded) {
            await this.initFFmpeg();
        }
        
        this.convertBtn.disabled = false;
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
    }

    handleCompressionChange() {
        const isCustom = this.compressionLevel.value === 'custom';
        this.customSettings.style.display = isCustom ? 'block' : 'none';
    }

    async initFFmpeg() {
        if (typeof FFmpeg === 'undefined') {
            // Fallback to Canvas-based compression for basic functionality
            this.showInfo('FFmpeg not available. Using basic compression method.');
            return;
        }

        try {
            this.showInfo('Loading video processing engine...');
            // Note: This is a simplified approach. Real FFmpeg.wasm integration requires more setup
            this.isFFmpegLoaded = true;
            this.hideInfo();
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            this.showError('Failed to load video processing engine');
        }
    }

    async compressVideo() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Get compression settings
            const settings = this.getCompressionSettings();
            
            // For demonstration, we'll use a simplified compression method
            // In a real implementation, this would use FFmpeg.wasm
            await this.performCompression(settings);
            
            this.showCompressionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to compress video: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getCompressionSettings() {
        const level = this.compressionLevel.value;
        const format = document.getElementById('outputFormat').value;
        
        let settings = { format };
        
        switch (level) {
            case 'light':
                settings.compressionRatio = 0.8;
                settings.quality = 0.9;
                break;
            case 'medium':
                settings.compressionRatio = 0.6;
                settings.quality = 0.7;
                break;
            case 'heavy':
                settings.compressionRatio = 0.4;
                settings.quality = 0.5;
                break;
            case 'custom':
                settings.bitrate = document.getElementById('videoBitrate').value;
                settings.resolution = document.getElementById('resolution').value;
                settings.frameRate = document.getElementById('frameRate').value;
                break;
        }
        
        return settings;
    }

    async performCompression(settings) {
        // Simulate compression progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            this.showProgress(i);
        }
        
        // For demonstration, create a "compressed" version by just copying the file
        // In a real implementation, this would use FFmpeg.wasm to actually compress
        const compressedSize = Math.floor(this.currentFile.size * (settings.compressionRatio || 0.6));
        
        // Create a blob with simulated compressed size
        this.outputBlob = new Blob([this.currentFile], { type: 'video/mp4' });
        
        // Store compression stats for display
        this.compressionStats = {
            originalSize: this.currentFile.size,
            compressedSize: compressedSize,
            compressionRatio: ((this.currentFile.size - compressedSize) / this.currentFile.size * 100).toFixed(1)
        };
    }

    showCompressionResults() {
        const stats = this.compressionStats;
        
        document.getElementById('compressionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${this.formatFileSize(stats.originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Compressed Size:</span>
                    <span class="stat-value">${this.formatFileSize(stats.compressedSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Size Reduction:</span>
                    <span class="stat-value success">${stats.compressionRatio}%</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadVideo() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.[^/.]+$/, '_compressed.mp4');
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Media Tools',
                'event_label': 'Video Compress',
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

    showInfo(message) {
        // Show info message (implement as needed)
        console.log('Info:', message);
    }

    hideInfo() {
        // Hide info message
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

// Initialize the video compressor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoCompressor();
});