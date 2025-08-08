/**
 * Video Compressor - Video Compression Tool
 * Uses shared components and follows the PDF Compress pattern
 */
class VideoCompressor {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupComponents();
    }

    init() {
        this.currentFile = null;
        this.outputBlob = null;
        this.compressionStats = null;
        
        // Initialize DOM elements
        this.filePreview = document.getElementById('filePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.compressionLevel = document.getElementById('compressionLevel');
        this.customSettings = document.getElementById('customSettings');
    }

    setupComponents() {
        // Initialize shared components
        this.uploader = new FileUploader({
            uploadAreaId: 'uploadArea',
            fileInputId: 'fileInput',
            acceptedTypes: ['video/*'],
            multiple: false,
            onFileSelect: this.handleFile.bind(this)
        });

        this.progress = new ProgressTracker({
            progressContainerId: 'progressContainer',
            progressFillId: 'progressFill',
            progressTextId: 'progressText',
            progressStageId: 'progressStage',
            showStages: true
        });

        this.buttonLoader = new ButtonLoader('convertBtn');
        this.errorDisplay = new ErrorDisplay('results');
    }

    setupEventListeners() {
        // Convert button
        this.convertBtn.addEventListener('click', this.compressVideo.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadVideo.bind(this));
        
        // Compression level change
        this.compressionLevel.addEventListener('change', this.handleCompressionChange.bind(this));
    }

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        // Load video metadata
        try {
            const metadata = await this.getVideoMetadata(file);
            this.displayVideoInfo(metadata);
            this.convertBtn.disabled = false;
        } catch (error) {
            this.errorDisplay.showError('Failed to load video metadata');
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = FileUtils.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
    }

    async getVideoMetadata(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                const metadata = {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight
                };
                URL.revokeObjectURL(video.src);
                resolve(metadata);
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Invalid video file'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    displayVideoInfo(metadata) {
        const duration = FileUtils.formatDuration(metadata.duration);
        const resolution = `${metadata.width}x${metadata.height}`;
        const fileSize = FileUtils.formatFileSize(this.currentFile.size);
        
        document.getElementById('videoInfo').innerHTML = `
            <div class="video-details">
                <span class="detail-item">🎬 ${resolution}</span>
                <span class="detail-item">⏱️ ${duration}</span>
                <span class="detail-item">📊 ${fileSize}</span>
            </div>
        `;
    }

    handleCompressionChange() {
        const isCustom = this.compressionLevel.value === 'custom';
        this.customSettings.style.display = isCustom ? 'block' : 'none';
    }

    async compressVideo() {
        if (!this.currentFile) return;

        this.buttonLoader.showLoading();
        this.progress.show(0, 'Preparing compression...');
        this.results.style.display = 'none';

        try {
            const settings = this.getCompressionSettings();
            await this.performCompression(settings);
            this.showCompressionResults();
            AnalyticsTracker.trackConversion('Media Tools', 'Video Compress');
            
        } catch (error) {
            this.errorDisplay.showError('Failed to compress video: ' + error.message);
        }

        this.progress.hide();
        this.buttonLoader.hideLoading();
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
            
            this.progress.updateProgress(10, 'Uploading video...');
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }
            
            const uploadResult = await uploadResponse.json();
            this.progress.updateProgress(30, 'Analyzing video...');
            
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
            
            this.progress.updateProgress(80, 'Compressing video...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Compression failed');
            }
            
            const result = await convertResponse.json();
            this.progress.updateProgress(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            // Store compression stats for display
            this.compressionStats = {
                originalSize: this.currentFile.size,
                compressedSize: result.file_size,
                compressionRatio: result.compression_ratio || ((this.currentFile.size - result.file_size) / this.currentFile.size * 100).toFixed(1)
            };
            
        } catch (error) {
            throw new Error(`Video compression failed: ${error.message}`);
        }
    }

    showCompressionResults() {
        const stats = this.compressionStats;
        
        document.getElementById('compressionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(stats.originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Compressed Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(stats.compressedSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Size Reduction:</span>
                    <span class="stat-value success">${stats.compressionRatio}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadVideo() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}_compressed.${format}`;
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = fileName;
            a.click();
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
            }, 100);
        }
    }
}

// Initialize the video compressor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoCompressor();
});