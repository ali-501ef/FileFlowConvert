class VideoTrimmer {
    constructor() {
        this.currentFile = null;
        this.outputBlob = null;
        this.uploadResult = null;
        this.videoDuration = 0;
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Initialize shared components
        this.uploader = new FileUploader({
            uploadAreaId: 'uploadArea',
            fileInputId: 'fileInput',
            acceptedTypes: ['video/*'],
            onFileSelect: this.handleFile.bind(this)
        });

        this.progress = new ProgressTracker({
            progressContainerId: 'progressContainer',
            progressFillId: 'progressFill',
            progressTextId: 'progressText'
        });

        this.buttonLoader = new ButtonLoader('convertBtn');
        this.errorDisplay = new ErrorDisplay('results');

        // Get DOM elements
        this.convertBtn = document.getElementById('convertBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.filePreview = document.getElementById('filePreview');
        this.videoPreview = document.getElementById('videoPreview');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.results = document.getElementById('results');
    }

    setupEventListeners() {
        this.convertBtn.addEventListener('click', this.trimVideo.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadFile.bind(this));
        
        // Time input validation
        document.getElementById('startTime').addEventListener('input', this.validateTimeInputs.bind(this));
        document.getElementById('endTime').addEventListener('input', this.validateTimeInputs.bind(this));
        
        // Video player events
        this.videoPlayer.addEventListener('loadedmetadata', this.onVideoLoaded.bind(this));
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
        
        // Show video preview
        this.videoPlayer.src = URL.createObjectURL(file);
        this.videoPreview.style.display = 'block';
        this.filePreview.style.display = 'block';
    }

    onVideoLoaded() {
        this.videoDuration = this.videoPlayer.duration;
        const duration = FileUtils.formatDuration(this.videoDuration);
        const resolution = `${this.videoPlayer.videoWidth}x${this.videoPlayer.videoHeight}`;
        
        document.getElementById('videoInfo').innerHTML = `
            <div class="video-details">
                <span class="detail-item">🎬 ${duration}</span>
                <span class="detail-item">📐 ${resolution}</span>
                <span class="detail-item">📊 ${FileUtils.formatFileSize(this.currentFile.size)}</span>
            </div>
        `;

        // Set default end time to video duration or 10 seconds, whichever is smaller
        const defaultDuration = Math.min(this.videoDuration, 10);
        document.getElementById('endTime').value = this.formatTimeInput(defaultDuration);
    }

    formatTimeInput(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    parseTimeInput(timeString) {
        const parts = timeString.split(':').map(part => parseInt(part) || 0);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1]; // MM:SS
        }
        return parts[0] || 0; // SS
    }

    validateTimeInputs() {
        const startTime = this.parseTimeInput(document.getElementById('startTime').value);
        const endTime = this.parseTimeInput(document.getElementById('endTime').value);
        
        if (startTime >= endTime) {
            document.getElementById('endTime').value = this.formatTimeInput(startTime + 1);
        }
        
        if (this.videoDuration && endTime > this.videoDuration) {
            document.getElementById('endTime').value = this.formatTimeInput(this.videoDuration);
        }
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

    async trimVideo() {
        if (!this.uploadResult) {
            this.errorDisplay.showError('Please upload a file first');
            return;
        }

        try {
            this.buttonLoader.showLoading();
            this.progress.show(0);
            this.results.style.display = 'none';

            // Get trim settings
            const settings = this.getTrimSettings();
            console.log('Trim settings:', settings);

            // Validate settings
            if (settings.startTime >= settings.endTime) {
                throw new Error('Start time must be before end time');
            }

            // Start trimming
            await this.performTrim(settings);
            
            // Show results
            this.showResults(settings);
            
            // Track conversion for analytics
            AnalyticsTracker.trackConversion('Audio/Video Tools', 'Video Trim');
            
        } catch (error) {
            console.error('Trim error:', error);
            this.errorDisplay.showError('Trim failed: ' + error.message);
        } finally {
            this.buttonLoader.hideLoading();
            this.progress.hide();
        }
    }

    getTrimSettings() {
        const startTime = this.parseTimeInput(document.getElementById('startTime').value);
        const endTime = this.parseTimeInput(document.getElementById('endTime').value);
        
        return {
            startTime: startTime,
            duration: endTime - startTime,
            format: document.getElementById('outputFormat').value,
            fastCopy: document.getElementById('fastCopy').checked
        };
    }

    async performTrim(settings) {
        this.progress.updateProgress(10);
        
        // Call backend conversion API
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_trim',
                options: {
                    start_time: settings.startTime,
                    duration: settings.duration,
                    fast_copy: settings.fastCopy
                }
            })
        });

        this.progress.updateProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Trim failed');
        }

        const result = await response.json();
        console.log('Trim result:', result);

        this.progress.updateProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
    }

    showResults(settings) {
        const originalSize = this.currentFile.size;
        const outputSize = this.fileSize;
        const format = document.getElementById('outputFormat').value.toUpperCase();
        const trimmedDuration = FileUtils.formatDuration(settings.duration);

        document.getElementById('trimStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Format:</span>
                    <span class="stat-value">${format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Trimmed Duration:</span>
                    <span class="stat-value">${trimmedDuration}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(outputSize)}</span>
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
            a.download = `${baseName}_trimmed_${timestamp}.${format}`;
            
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

// Initialize the trimmer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoTrimmer();
});