class VideoTrimmer {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.videoPreview = document.getElementById('videoPreview');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.trimControls = document.getElementById('trimControls');
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
        this.endTime = 0;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Trim controls
        document.getElementById('startTime').addEventListener('input', this.updateStartTime.bind(this));
        document.getElementById('endTime').addEventListener('input', this.updateEndTime.bind(this));
        document.getElementById('trimSlider').addEventListener('input', this.updateTrimFromSlider.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.trimVideo.bind(this));
        
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
        
        // Show video preview
        const videoUrl = URL.createObjectURL(file);
        this.videoPlayer.src = videoUrl;
        
        this.videoPlayer.onloadedmetadata = () => {
            this.videoDuration = this.videoPlayer.duration;
            this.endTime = this.videoDuration;
            
            this.setupTrimControls();
            this.updatePreviewInfo();
            
            this.uploadArea.style.display = 'none';
            this.videoPreview.style.display = 'block';
            this.trimControls.style.display = 'block';
            this.convertBtn.disabled = false;
        };
    }

    setupTrimControls() {
        const startInput = document.getElementById('startTime');
        const endInput = document.getElementById('endTime');
        const trimSlider = document.getElementById('trimSlider');
        
        startInput.max = this.videoDuration;
        endInput.max = this.videoDuration;
        endInput.value = this.videoDuration;
        trimSlider.max = this.videoDuration;
        
        this.updateDurationDisplay();
    }

    updateStartTime() {
        this.startTime = parseFloat(document.getElementById('startTime').value);
        if (this.startTime >= this.endTime) {
            this.startTime = Math.max(0, this.endTime - 1);
            document.getElementById('startTime').value = this.startTime;
        }
        this.videoPlayer.currentTime = this.startTime;
        this.updateDurationDisplay();
    }

    updateEndTime() {
        this.endTime = parseFloat(document.getElementById('endTime').value);
        if (this.endTime <= this.startTime) {
            this.endTime = Math.min(this.videoDuration, this.startTime + 1);
            document.getElementById('endTime').value = this.endTime;
        }
        this.updateDurationDisplay();
    }

    updateTrimFromSlider() {
        const sliderValue = parseFloat(document.getElementById('trimSlider').value);
        this.videoPlayer.currentTime = sliderValue;
    }

    updateDurationDisplay() {
        const trimmedDuration = this.endTime - this.startTime;
        document.getElementById('trimmedDuration').textContent = this.formatTime(trimmedDuration);
        document.getElementById('originalDuration').textContent = this.formatTime(this.videoDuration);
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
                    <span class="detail-value" id="originalDuration">${this.formatTime(this.videoDuration)}</span>
                </div>
            </div>
        `;
    }

    async trimVideo() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgressWithStages(0, 'Analyzing video...');
        this.results.style.display = 'none';

        try {
            const settings = this.getTrimSettings();
            await this.performTrim(settings);
            this.showTrimResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to trim video: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getTrimSettings() {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            outputFormat: document.getElementById('outputFormat').value,
            quality: document.getElementById('quality').value,
            trimMode: document.getElementById('trimMode').value
        };
    }

    async performTrim(settings) {
        try {
            // Upload file first
            const formData = new FormData();
            formData.append('file', this.currentFile);
            
            this.showProgressWithStages(10, 'Uploading video...');
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }
            
            const uploadResult = await uploadResponse.json();
            this.showProgressWithStages(30, 'Processing video...');
            
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
                        duration: settings.endTime - settings.startTime
                    }
                })
            });
            
            this.showProgressWithStages(90, 'Finalizing...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Video trim failed');
            }
            
            const result = await convertResponse.json();
            this.showProgressWithStages(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            const trimmedDuration = settings.endTime - settings.startTime;
            this.trimInfo = {
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
        const info = this.trimInfo;
        
        document.getElementById('trimInfo').innerHTML = `
            <div class="trim-details">
                <div class="detail-row">
                    <span class="detail-label">Original Duration:</span>
                    <span class="detail-value">${this.formatTime(info.originalDuration)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Trimmed Duration:</span>
                    <span class="detail-value">${this.formatTime(info.trimmedDuration)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Trim Range:</span>
                    <span class="detail-value">${this.formatTime(info.startTime)} - ${this.formatTime(info.endTime)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Output Format:</span>
                    <span class="detail-value">${info.format}</span>
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

    downloadVideo() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = `trimmed_video.${format}`;
            a.click();
        }
    }

    trackConversion() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Media Tools',
                'event_label': 'Video Trim',
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

// Initialize the video trimmer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoTrimmer();
});