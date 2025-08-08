class VideoCompressor {
    constructor() {
        this.currentFile = null;
        this.outputBlob = null;
        this.uploadResult = null;
        this.init();
        this.setupEventListeners();
    }

    init() {
        console.log('VideoCompressor: Starting initialization');
        
        try {
            // Initialize shared components
            this.uploader = new FileUploader({
                uploadAreaId: 'uploadArea',
                fileInputId: 'fileInput',
                acceptedTypes: ['video/*'],
                onFileSelect: this.handleFile.bind(this)
            });
            console.log('VideoCompressor: FileUploader initialized');
    
            this.progress = new ProgressTracker({
                progressContainerId: 'progressContainer',
                progressFillId: 'progressFill',
                progressTextId: 'progressText'
            });
            console.log('VideoCompressor: ProgressTracker initialized');
    
            this.buttonLoader = new ButtonLoader('convertBtn');
            console.log('VideoCompressor: ButtonLoader initialized');
            
            this.errorDisplay = new ErrorDisplay('results');
            console.log('VideoCompressor: ErrorDisplay initialized');
    
            // Get DOM elements
            this.convertBtn = document.getElementById('convertBtn');
            this.downloadBtn = document.getElementById('downloadBtn');
            this.filePreview = document.getElementById('filePreview');
            this.results = document.getElementById('results');
            
            console.log('VideoCompressor: All components initialized successfully');
        } catch (error) {
            console.error('VideoCompressor: Initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.convertBtn.addEventListener('click', this.compressVideo.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadFile.bind(this));
    }

    async handleFile(file) {
        this.currentFile = file;
        console.log('File selected:', file.name, file.type, file.size);

        // Validate file type
        if (!file.type.startsWith('video/')) {
            this.errorDisplay.showError('Please select a valid video file');
            return;
        }

        try {
            // Show file preview
            this.showFilePreview(file);
            
            // Upload file to server
            await this.uploadFile(file);
            
            this.convertBtn.disabled = false;
            
        } catch (error) {
            console.error('Error handling file:', error);
            this.errorDisplay.showError('Error processing file: ' + error.message);
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = FileUtils.formatFileSize(file.size);
        
        // Create video element to get metadata
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        
        video.addEventListener('loadedmetadata', () => {
            const duration = FileUtils.formatDuration(video.duration);
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            
            document.getElementById('videoInfo').innerHTML = `
                <div class="video-details">
                    <span class="detail-item">🎬 ${duration}</span>
                    <span class="detail-item">📐 ${resolution}</span>
                    <span class="detail-item">📊 ${FileUtils.formatFileSize(file.size)}</span>
                </div>
            `;
            
            // Clean up object URL
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
        console.log('Upload successful:', this.uploadResult);
    }

    async compressVideo() {
        if (!this.uploadResult) {
            this.errorDisplay.showError('Please upload a file first');
            return;
        }

        try {
            this.buttonLoader.showLoading();
            this.progress.show(0);
            this.results.style.display = 'none';

            // Get compression settings
            const settings = this.getCompressionSettings();
            console.log('Compression settings:', settings);

            // Start compression
            await this.performCompression(settings);
            
            // Show results
            this.showResults();
            
            // Track conversion for analytics
            AnalyticsTracker.trackConversion('Audio/Video Tools', 'Video Compress');
            
        } catch (error) {
            console.error('Compression error:', error);
            this.errorDisplay.showError('Compression failed: ' + error.message);
        } finally {
            this.buttonLoader.hideLoading();
            this.progress.hide();
        }
    }

    getCompressionSettings() {
        return {
            compression: document.getElementById('compressionLevel').value,
            format: document.getElementById('outputFormat').value,
            resolution: document.getElementById('resolution').value,
            frameRate: document.getElementById('frameRate').value
        };
    }

    async performCompression(settings) {
        this.progress.updateProgress(10);
        
        // Call backend conversion API
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
                    resolution: settings.resolution === 'original' ? null : settings.resolution,
                    framerate: settings.frameRate === 'original' ? null : settings.frameRate
                }
            })
        });

        this.progress.updateProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Compression failed');
        }

        const result = await response.json();
        console.log('Compression result:', result);

        this.progress.updateProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
        this.compressionStats = result.compression_stats || {};
    }

    showResults() {
        const originalSize = this.currentFile.size;
        const outputSize = this.fileSize;
        const compressionRatio = this.compressionStats.compression_ratio || 
                               ((1 - outputSize/originalSize) * 100).toFixed(1);
        const format = document.getElementById('outputFormat').value.toUpperCase();

        document.getElementById('compressionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Format:</span>
                    <span class="stat-value">${format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Compressed Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(outputSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Size Reduction:</span>
                    <span class="stat-value success">${compressionRatio}%</span>
                </div>
            </div>
        `;

        this.results.style.display = 'block';
    }

    async downloadFile() {
        if (!this.downloadUrl) {
            this.errorDisplay.showError('No file ready for download');
            return;
        }

        try {
            const response = await fetch(this.downloadUrl);
            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            
            // Create proper filename based on original file and settings
            const format = document.getElementById('outputFormat').value;
            const baseName = this.currentFile.name.replace(/\.[^/.]+$/, "");
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
            a.download = `${baseName}_compressed_${timestamp}.${format}`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Download error:', error);
            this.errorDisplay.showError('Download failed: ' + error.message);
        }
    }
}

// Initialize the compressor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoCompressor();
});