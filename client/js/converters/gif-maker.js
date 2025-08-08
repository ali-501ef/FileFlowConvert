/**
 * GIF Maker - Video to GIF Conversion Tool
 * Uses shared components and follows the PDF Compress pattern
 */
class GifMaker {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupComponents();
    }

    init() {
        this.currentFile = null;
        this.outputBlob = null;
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 3; // Default 3 seconds
        this.gifStats = null;
        
        // Initialize DOM elements
        this.videoPreview = document.getElementById('videoPreview');
        this.videoPlayer = document.getElementById('videoPlayer');
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
        // GIF settings
        document.getElementById('startTime').addEventListener('input', this.updateStartTime.bind(this));
        document.getElementById('duration').addEventListener('input', this.updateDuration.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.createGif.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadGif.bind(this));
    }

    async handleFile(file) {
        this.currentFile = file;
        
        // Load video metadata
        try {
            const metadata = await this.getVideoMetadata(file);
            this.videoDuration = metadata.duration;
            this.endTime = Math.min(3, this.videoDuration); // Default to 3 seconds or video duration
            
            this.showVideoPreview(file);
            this.setupGifControls();
            this.convertBtn.disabled = false;
        } catch (error) {
            this.errorDisplay.showError('Failed to load video metadata');
        }
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

    showVideoPreview(file) {
        const videoUrl = URL.createObjectURL(file);
        this.videoPlayer.src = videoUrl;
        
        this.uploader.hideUploadArea();
        this.videoPreview.style.display = 'block';
    }

    setupGifControls() {
        const startInput = document.getElementById('startTime');
        const durationInput = document.getElementById('duration');
        
        startInput.max = this.videoDuration;
        startInput.value = this.startTime;
        
        durationInput.max = Math.min(10, this.videoDuration); // Max 10 seconds for GIF
        durationInput.value = this.endTime - this.startTime;
    }

    updateStartTime() {
        this.startTime = parseFloat(document.getElementById('startTime').value);
        const duration = parseFloat(document.getElementById('duration').value);
        this.endTime = Math.min(this.startTime + duration, this.videoDuration);
        
        if (this.endTime > this.videoDuration) {
            this.endTime = this.videoDuration;
            document.getElementById('duration').value = this.endTime - this.startTime;
        }
        
        this.videoPlayer.currentTime = this.startTime;
    }

    updateDuration() {
        const duration = parseFloat(document.getElementById('duration').value);
        this.endTime = Math.min(this.startTime + duration, this.videoDuration);
        
        if (this.endTime > this.videoDuration) {
            this.endTime = this.videoDuration;
            document.getElementById('duration').value = this.endTime - this.startTime;
        }
    }


    async createGif() {
        if (!this.currentFile) return;

        this.buttonLoader.showLoading();
        this.progress.show(0, 'Preparing GIF creation...');
        this.results.style.display = 'none';

        try {
            const settings = this.getGifSettings();
            await this.performGifCreation(settings);
            this.showGifResults();
            AnalyticsTracker.trackConversion('Media Tools', 'GIF Maker');
            
        } catch (error) {
            this.errorDisplay.showError('Failed to create GIF: ' + error.message);
        }

        this.progress.hide();
        this.buttonLoader.hideLoading();
    }

    getGifSettings() {
        return {
            startTime: this.startTime,
            duration: this.endTime - this.startTime,
            frameRate: parseInt(document.getElementById('frameRate').value),
            width: document.getElementById('width').value,
            quality: document.getElementById('quality').value,
            loop: document.getElementById('loop').checked,
            boomerang: document.getElementById('boomerang').checked
        };
    }

    async performGifCreation(settings) {
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
                    conversion_type: 'video_to_gif',
                    options: {
                        start_time: settings.startTime,
                        duration: settings.duration,
                        fps: settings.frameRate,
                        width: settings.width === 'original' ? null : parseInt(settings.width),
                        quality: settings.quality,
                        loop: settings.loop,
                        boomerang: settings.boomerang
                    }
                })
            });
            
            this.progress.updateProgress(80, 'Generating GIF...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'GIF creation failed');
            }
            
            const result = await convertResponse.json();
            this.progress.updateProgress(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            this.gifStats = {
                duration: settings.duration,
                frames: Math.floor(settings.duration * settings.frameRate),
                frameRate: settings.frameRate,
                width: settings.width,
                outputSize: result.file_size,
                quality: settings.quality
            };
            
        } catch (error) {
            throw new Error(`GIF creation failed: ${error.message}`);
        }
    }

    showGifResults() {
        const stats = this.gifStats;
        
        document.getElementById('gifInfo').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${FileUtils.formatDuration(stats.duration)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Frames:</span>
                    <span class="stat-value">${stats.frames}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Frame Rate:</span>
                    <span class="stat-value">${stats.frameRate} fps</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Dimensions:</span>
                    <span class="stat-value">${stats.width}px width</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">File Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(stats.outputSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        // Show GIF preview if available
        const gifPreview = document.getElementById('gifPreview');
        if (gifPreview && this.outputBlob) {
            const gifUrl = URL.createObjectURL(this.outputBlob);
            gifPreview.innerHTML = `<img src="${gifUrl}" alt="Generated GIF" style="max-width: 100%; max-height: 300px; border-radius: 8px;">`;
        }
        
        this.results.style.display = 'block';
    }

    downloadGif() {
        if (this.outputBlob) {
            const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}.gif`;
            
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

// Initialize the GIF maker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GifMaker();
});