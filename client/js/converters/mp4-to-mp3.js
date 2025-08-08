/**
 * MP4 to MP3 Converter - Audio Extraction Tool
 * Uses shared components and follows the PDF Compress pattern
 */
class MP4ToMP3Converter {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupComponents();
    }

    init() {
        this.currentFile = null;
        this.outputBlob = null;
        this.conversionStats = null;
        
        // Initialize DOM elements
        this.filePreview = document.getElementById('filePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
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
        this.convertBtn.addEventListener('click', this.convertToAudio.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadAudio.bind(this));
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

    async convertToAudio() {
        if (!this.currentFile) return;

        this.buttonLoader.showLoading();
        this.progress.show(0, 'Preparing conversion...');
        this.results.style.display = 'none';

        try {
            const settings = this.getConversionSettings();
            await this.performConversion(settings);
            this.showConversionResults();
            AnalyticsTracker.trackConversion('Media Tools', 'MP4 to MP3');
            
        } catch (error) {
            this.errorDisplay.showError('Failed to convert video: ' + error.message);
        }

        this.progress.hide();
        this.buttonLoader.hideLoading();
    }

    getConversionSettings() {
        return {
            outputFormat: document.getElementById('outputFormat').value,
            audioQuality: parseInt(document.getElementById('audioQuality').value),
            preserveMetadata: document.getElementById('preserveMetadata').checked,
            normalizeAudio: document.getElementById('normalizeAudio').checked
        };
    }

    async performConversion(settings) {
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
            this.progress.updateProgress(30, 'Processing video...');
            
            // Convert with server-side processing
            const convertResponse = await fetch('/api/convert-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_id: uploadResult.file_id,
                    conversion_type: 'video_to_audio',
                    options: {
                        format: settings.outputFormat,
                        bitrate: settings.audioQuality,
                        normalize: settings.normalizeAudio,
                        preserve_metadata: settings.preserveMetadata
                    }
                })
            });
            
            this.progress.updateProgress(80, 'Extracting audio...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Conversion failed');
            }
            
            const result = await convertResponse.json();
            this.progress.updateProgress(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            // Store conversion stats
            this.conversionStats = {
                originalSize: this.currentFile.size,
                outputSize: result.file_size,
                format: settings.outputFormat.toUpperCase(),
                quality: settings.audioQuality + ' kbps',
                duration: result.duration || 'N/A'
            };
            
        } catch (error) {
            throw new Error(`Audio conversion failed: ${error.message}`);
        }
    }

    showConversionResults() {
        const stats = this.conversionStats;
        
        document.getElementById('conversionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(stats.originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Audio Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(stats.outputSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Format:</span>
                    <span class="stat-value">${stats.format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Quality:</span>
                    <span class="stat-value">${stats.quality}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadAudio() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}.${format}`;
            
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

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MP4ToMP3Converter();
});