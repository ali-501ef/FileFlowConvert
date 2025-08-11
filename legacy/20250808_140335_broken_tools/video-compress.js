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
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
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

    handleUploadAreaClick(e) {
        if (this.isFilePickerOpen) {
            return;
        }
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        // Reset flag after a short delay to handle cancel scenarios
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
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
            
            const videoInfoElement = document.getElementById('videoInfo');
            const videoDetailsDiv = document.createElement('div');
            videoDetailsDiv.className = 'video-details';
            
            const resolutionSpan = document.createElement('span');
            resolutionSpan.className = 'detail-item';
            resolutionSpan.textContent = `🎬 ${resolution}`;
            
            const durationSpan = document.createElement('span');
            durationSpan.className = 'detail-item';
            durationSpan.textContent = `⏱️ ${duration}`;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'detail-item';
            sizeSpan.textContent = `📊 ${this.formatFileSize(file.size)}`;
            
            videoDetailsDiv.appendChild(resolutionSpan);
            videoDetailsDiv.appendChild(durationSpan);
            videoDetailsDiv.appendChild(sizeSpan);
            
            videoInfoElement.innerHTML = ''; // Clear existing content
            videoInfoElement.appendChild(videoDetailsDiv);
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
        try {
            // Upload file first
            const formData = new FormData();
            formData.append('file', this.currentFile);
            
            this.showProgress(10);
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }
            
            const uploadResult = await uploadResponse.json();
            this.showProgress(30);
            
            // Convert with server-side processing
            const convertResponse = await fetch('/api/convert-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_id: uploadResult.file_id,
                    conversion_type: 'video_compress',
                    options: {
                        compression: settings.compressionRatio < 0.5 ? 'heavy' : settings.compressionRatio < 0.7 ? 'medium' : 'light',
                        format: settings.format,
                        bitrate: settings.bitrate,
                        resolution: settings.resolution,
                        framerate: settings.frameRate
                    }
                })
            });
            
            this.showProgress(90);
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Conversion failed');
            }
            
            const result = await convertResponse.json();
            this.showProgress(100);
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            // Store compression stats for display
            this.compressionStats = {
                originalSize: this.currentFile.size,
                compressedSize: result.file_size,
                compressionRatio: result.compression_ratio || ((this.currentFile.size - result.file_size) / this.currentFile.size * 100).toFixed(1)
            };
            
        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    showCompressionResults() {
        const stats = this.compressionStats;
        
        // Create elements safely to prevent XSS
        const statsContainer = document.getElementById('compressionStats');
        statsContainer.innerHTML = ''; // Clear existing content
        
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        
        // Original Size
        const originalItem = document.createElement('div');
        originalItem.className = 'stat-item';
        
        const originalLabel = document.createElement('span');
        originalLabel.className = 'stat-label';
        originalLabel.textContent = 'Original Size:';
        
        const originalValue = document.createElement('span');
        originalValue.className = 'stat-value';
        originalValue.textContent = this.formatFileSize(stats.originalSize);
        
        originalItem.appendChild(originalLabel);
        originalItem.appendChild(originalValue);
        
        // Compressed Size
        const compressedItem = document.createElement('div');
        compressedItem.className = 'stat-item';
        
        const compressedLabel = document.createElement('span');
        compressedLabel.className = 'stat-label';
        compressedLabel.textContent = 'Compressed Size:';
        
        const compressedValue = document.createElement('span');
        compressedValue.className = 'stat-value';
        compressedValue.textContent = this.formatFileSize(stats.compressedSize);
        
        compressedItem.appendChild(compressedLabel);
        compressedItem.appendChild(compressedValue);
        
        // Size Reduction
        const reductionItem = document.createElement('div');
        reductionItem.className = 'stat-item';
        
        const reductionLabel = document.createElement('span');
        reductionLabel.className = 'stat-label';
        reductionLabel.textContent = 'Size Reduction:';
        
        const reductionValue = document.createElement('span');
        reductionValue.className = 'stat-value success';
        reductionValue.textContent = stats.compressionRatio + '%';
        
        reductionItem.appendChild(reductionLabel);
        reductionItem.appendChild(reductionValue);
        
        // Append all items to grid
        statsGrid.appendChild(originalItem);
        statsGrid.appendChild(compressedItem);
        statsGrid.appendChild(reductionItem);
        
        // Append grid to container
        statsContainer.appendChild(statsGrid);
        
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