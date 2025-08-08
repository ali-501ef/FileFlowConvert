/**
 * Video Trimmer - Video Trimming Tool
 * Uses shared components and follows the PDF Compress pattern
 */
class VideoTrimmer {
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
        this.endTime = 0;
        this.trimStats = null;
        
        // Initialize DOM elements
        this.videoPreview = document.getElementById('videoPreview');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.trimControls = document.getElementById('trimControls');
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
        // Trim controls
        document.getElementById('startTime').addEventListener('input', this.updateStartTime.bind(this));
        document.getElementById('endTime').addEventListener('input', this.updateEndTime.bind(this));
        document.getElementById('duration').addEventListener('input', this.updateDuration.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.trimVideo.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadVideo.bind(this));
    }

    async handleFile(file) {
        this.currentFile = file;
        
        // Load video metadata
        try {
            const metadata = await this.getVideoMetadata(file);
            this.videoDuration = metadata.duration;
            this.endTime = this.videoDuration;
            
            this.showVideoPreview(file);
            this.setupTrimControls();
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

    setupTrimControls() {
        const startInput = document.getElementById('startTime');
        const endInput = document.getElementById('endTime');
        const durationInput = document.getElementById('duration');
        
        // Set up time inputs with proper format
        startInput.value = this.formatTimeInput(0);
        endInput.value = this.formatTimeInput(this.videoDuration);
        durationInput.value = this.formatTimeInput(this.videoDuration);
    }

    updateStartTime() {
        const timeStr = document.getElementById('startTime').value;
        this.startTime = this.parseTimeInput(timeStr);
        if (this.startTime >= this.endTime) {
            this.startTime = Math.max(0, this.endTime - 1);
            document.getElementById('startTime').value = this.formatTimeInput(this.startTime);
        }
        this.videoPlayer.currentTime = this.startTime;
        this.updateDurationDisplay();
    }

    updateEndTime() {
        const timeStr = document.getElementById('endTime').value;
        this.endTime = this.parseTimeInput(timeStr);
        if (this.endTime <= this.startTime) {
            this.endTime = Math.min(this.videoDuration, this.startTime + 1);
            document.getElementById('endTime').value = this.formatTimeInput(this.endTime);
        }
        this.updateDurationDisplay();
    }

    updateDuration() {
        const durationStr = document.getElementById('duration').value;
        const duration = this.parseTimeInput(durationStr);
        this.endTime = Math.min(this.startTime + duration, this.videoDuration);
        document.getElementById('endTime').value = this.formatTimeInput(this.endTime);
        this.updateDurationDisplay();
    }

    updateDurationDisplay() {
        const trimmedDuration = this.endTime - this.startTime;
        document.getElementById('duration').value = this.formatTimeInput(trimmedDuration);
    }

    formatTimeInput(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    parseTimeInput(timeStr) {
        const parts = timeStr.split(':').map(p => parseInt(p) || 0);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return parts[0] || 0;
    }

    async trimVideo() {
        if (!this.currentFile) return;

        this.buttonLoader.showLoading();
        this.progress.show(0, 'Preparing trim...');
        this.results.style.display = 'none';

        try {
            const settings = this.getTrimSettings();
            await this.performTrim(settings);
            this.showTrimResults();
            AnalyticsTracker.trackConversion('Media Tools', 'Video Trim');
            
        } catch (error) {
            this.errorDisplay.showError('Failed to trim video: ' + error.message);
        }

        this.progress.hide();
        this.buttonLoader.hideLoading();
    }

    getTrimSettings() {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            outputFormat: document.getElementById('outputFormat').value,
            quality: document.getElementById('quality').value,
            fadeIn: document.getElementById('fadeIn').checked,
            fadeOut: document.getElementById('fadeOut').checked
        };
    }

    async performTrim(settings) {
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
                    conversion_type: 'video_trim',
                    options: {
                        start_time: settings.startTime,
                        duration: settings.endTime - settings.startTime,
                        format: settings.outputFormat,
                        quality: settings.quality,
                        fade_in: settings.fadeIn,
                        fade_out: settings.fadeOut
                    }
                })
            });
            
            this.progress.updateProgress(80, 'Trimming video...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Video trim failed');
            }
            
            const result = await convertResponse.json();
            this.progress.updateProgress(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            const trimmedDuration = settings.endTime - settings.startTime;
            this.trimStats = {
                originalDuration: this.videoDuration,
                trimmedDuration: trimmedDuration,
                startTime: settings.startTime,
                endTime: settings.endTime,
                outputSize: result.file_size,
                format: settings.outputFormat.toUpperCase()
            };
            
        } catch (error) {
            throw new Error(`Video trim failed: ${error.message}`);
        }
    }

    showTrimResults() {
        const trimResultsDiv = document.createElement('div');
        trimResultsDiv.innerHTML = `
            <h3>Video Trimming Complete</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Duration:</span>
                    <span class="stat-value">${FileUtils.formatDuration(this.trimStats.originalDuration)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Trimmed Duration:</span>
                    <span class="stat-value">${FileUtils.formatDuration(this.trimStats.trimmedDuration)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Trim Range:</span>
                    <span class="stat-value">${FileUtils.formatDuration(this.trimStats.startTime)} - ${FileUtils.formatDuration(this.trimStats.endTime)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Format:</span>
                    <span class="stat-value">${this.trimStats.format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">File Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(this.trimStats.outputSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.innerHTML = '';
        this.results.appendChild(trimResultsDiv);
        this.results.style.display = 'block';
    }

    downloadVideo() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}_trimmed.${format}`;
            
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

// Initialize the video trimmer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoTrimmer();
});