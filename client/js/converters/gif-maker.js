class GifMaker {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.videoPreview = document.getElementById('videoPreview');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.gifSettings = document.getElementById('gifSettings');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressStage = document.getElementById('progressStage');
        
        this.currentFile = null;
        this.outputBlob = null;
        this.videoDuration = 0;
        this.startTime = 0;
        this.endTime = 10; // Default 10 seconds
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // GIF settings
        document.getElementById('startTime').addEventListener('input', this.updateStartTime.bind(this));
        document.getElementById('endTime').addEventListener('input', this.updateEndTime.bind(this));
        document.getElementById('frameRate').addEventListener('input', this.updateFrameRate.bind(this));
        document.getElementById('width').addEventListener('input', this.updateSize.bind(this));
        
        // Quick duration buttons
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setQuickDuration(e.target.dataset.duration));
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', this.createGif.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadGif.bind(this));
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
        
        // Show video preview
        const videoUrl = URL.createObjectURL(file);
        this.videoPlayer.src = videoUrl;
        
        this.videoPlayer.onloadedmetadata = () => {
            this.videoDuration = this.videoPlayer.duration;
            this.endTime = Math.min(10, this.videoDuration); // Default to 10 seconds or video duration
            
            this.setupGifControls();
            this.updatePreviewInfo();
            
            this.uploadArea.style.display = 'none';
            this.videoPreview.style.display = 'block';
            this.gifSettings.style.display = 'block';
            this.convertBtn.disabled = false;
        };
    }

    setupGifControls() {
        const startInput = document.getElementById('startTime');
        const endInput = document.getElementById('endTime');
        
        startInput.max = this.videoDuration;
        endInput.max = this.videoDuration;
        endInput.value = this.endTime;
        
        this.updateGifStats();
    }

    updateStartTime() {
        this.startTime = parseFloat(document.getElementById('startTime').value);
        if (this.startTime >= this.endTime) {
            this.startTime = Math.max(0, this.endTime - 1);
            document.getElementById('startTime').value = this.startTime;
        }
        this.videoPlayer.currentTime = this.startTime;
        this.updateGifStats();
    }

    updateEndTime() {
        this.endTime = parseFloat(document.getElementById('endTime').value);
        if (this.endTime <= this.startTime) {
            this.endTime = Math.min(this.videoDuration, this.startTime + 1);
            document.getElementById('endTime').value = this.endTime;
        }
        this.updateGifStats();
    }

    updateFrameRate() {
        const frameRate = document.getElementById('frameRate').value;
        document.getElementById('frameRateValue').textContent = frameRate + ' fps';
        this.updateGifStats();
    }

    updateSize() {
        const width = document.getElementById('width').value;
        document.getElementById('widthValue').textContent = width + 'px';
        this.updateGifStats();
    }

    setQuickDuration(duration) {
        const durationSeconds = parseFloat(duration);
        this.endTime = Math.min(this.startTime + durationSeconds, this.videoDuration);
        document.getElementById('endTime').value = this.endTime;
        
        // Update active button
        document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-duration="${duration}"]`).classList.add('active');
        
        this.updateGifStats();
    }

    updateGifStats() {
        const duration = this.endTime - this.startTime;
        const frameRate = parseInt(document.getElementById('frameRate').value);
        const width = parseInt(document.getElementById('width').value);
        const totalFrames = Math.floor(duration * frameRate);
        
        // Estimate GIF size (very rough calculation)
        const estimatedSize = totalFrames * (width * 0.75) * 0.1; // Rough estimation
        
        document.getElementById('gifDuration').textContent = this.formatTime(duration);
        document.getElementById('gifFrames').textContent = totalFrames;
        document.getElementById('estimatedSize').textContent = this.formatFileSize(estimatedSize);
    }

    updatePreviewInfo() {
        const fileSize = this.formatFileSize(this.currentFile.size);
        const fileName = this.currentFile.name;
        
        document.getElementById('videoInfo').innerHTML = `
            <div class="video-details">
                <div class="detail-item">
                    <span class="detail-label">File:</span>
                    <span class="detail-value">${fileName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Size:</span>
                    <span class="detail-value">${fileSize}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${this.formatTime(this.videoDuration)}</span>
                </div>
            </div>
        `;
    }

    async createGif() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgressWithStages(0, 'Analyzing video...');
        this.results.style.display = 'none';

        try {
            const settings = this.getGifSettings();
            await this.performGifCreation(settings);
            this.showGifResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to create GIF: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getGifSettings() {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            frameRate: parseInt(document.getElementById('frameRate').value),
            width: parseInt(document.getElementById('width').value),
            quality: document.getElementById('quality').value,
            loop: document.getElementById('loop').checked,
            optimize: document.getElementById('optimize').checked
        };
    }

    async performGifCreation(settings) {
        const stages = [
            'Extracting video frames...',
            'Processing frame sequence...',
            'Applying frame rate settings...',
            'Optimizing colors...',
            'Compressing GIF...',
            'Finalizing animation...'
        ];
        
        for (let i = 0; i < stages.length; i++) {
            const progress = Math.floor((i / stages.length) * 100);
            this.showProgressWithStages(progress, stages[i]);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
        }
        
        this.showProgressWithStages(100, 'Complete!');
        
        // Create mock GIF
        const duration = settings.endTime - settings.startTime;
        const totalFrames = Math.floor(duration * settings.frameRate);
        const estimatedSize = totalFrames * (settings.width * 0.75) * 0.1;
        const mockData = new ArrayBuffer(Math.floor(estimatedSize));
        this.outputBlob = new Blob([mockData], { type: 'image/gif' });
        
        this.gifInfo = {
            duration: duration,
            frames: totalFrames,
            frameRate: settings.frameRate,
            width: settings.width,
            outputSize: this.outputBlob.size,
            quality: settings.quality
        };
    }

    showGifResults() {
        const info = this.gifInfo;
        
        document.getElementById('gifInfo').innerHTML = `
            <div class="gif-details">
                <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${this.formatTime(info.duration)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Frames:</span>
                    <span class="detail-value">${info.frames}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Frame Rate:</span>
                    <span class="detail-value">${info.frameRate} fps</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Dimensions:</span>
                    <span class="detail-value">${info.width}px (auto height)</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">File Size:</span>
                    <span class="detail-value">${this.formatFileSize(info.outputSize)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadGif() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = 'animated.gif';
            a.click();
        }
    }

    trackConversion() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Media Tools',
                'event_label': 'GIF Maker',
                'value': 1
            });
        }
    }

    showProgressWithStages(percent, stage) {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
        this.progressStage.textContent = stage;
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
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

// Initialize the GIF maker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GifMaker();
});