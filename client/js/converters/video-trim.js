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
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.timeline = document.getElementById('timeline');
        this.startHandle = document.getElementById('startHandle');
        this.endHandle = document.getElementById('endHandle');
        this.trimRegion = document.getElementById('trimRegion');
        this.startTime = document.getElementById('startTime');
        this.endTime = document.getElementById('endTime');
        this.duration = document.getElementById('duration');
        
        this.currentFile = null;
        this.outputBlob = null;
        this.videoDuration = 0;
        this.trimStart = 0;
        this.trimEnd = 10;
        
        this.isDragging = false;
        this.dragTarget = null;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Video player events
        this.videoPlayer.addEventListener('loadedmetadata', this.onVideoLoaded.bind(this));
        this.videoPlayer.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
        
        // Timeline events
        this.startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
        document.addEventListener('mousemove', this.onDrag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));
        
        // Time input events
        this.startTime.addEventListener('change', this.onTimeInputChange.bind(this));
        this.endTime.addEventListener('change', this.onTimeInputChange.bind(this));
        
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

    handleFile(file) {
        this.currentFile = file;
        const url = URL.createObjectURL(file);
        this.videoPlayer.src = url;
        this.uploadArea.style.display = 'none';
        this.videoPreview.style.display = 'block';
    }

    onVideoLoaded() {
        this.videoDuration = this.videoPlayer.duration;
        this.trimEnd = Math.min(10, this.videoDuration);
        
        this.updateTimeInputs();
        this.updateTimeline();
        this.convertBtn.disabled = false;
    }

    onTimeUpdate() {
        // Update timeline position indicator if needed
    }

    startDrag(e, target) {
        this.isDragging = true;
        this.dragTarget = target;
        e.preventDefault();
    }

    onDrag(e) {
        if (!this.isDragging) return;
        
        const timelineRect = this.timeline.getBoundingClientRect();
        const position = (e.clientX - timelineRect.left) / timelineRect.width;
        const time = Math.max(0, Math.min(this.videoDuration, position * this.videoDuration));
        
        if (this.dragTarget === 'start') {
            this.trimStart = Math.min(time, this.trimEnd - 1);
        } else {
            this.trimEnd = Math.max(time, this.trimStart + 1);
        }
        
        this.updateTimeInputs();
        this.updateTimeline();
    }

    stopDrag() {
        this.isDragging = false;
        this.dragTarget = null;
    }

    onTimeInputChange() {
        const start = this.parseTimeString(this.startTime.value);
        const end = this.parseTimeString(this.endTime.value);
        
        if (start !== null && end !== null && start < end && end <= this.videoDuration) {
            this.trimStart = start;
            this.trimEnd = end;
            this.updateTimeline();
        }
        
        this.updateTimeInputs();
    }

    parseTimeString(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseInt(parts[2]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        }
        return null;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateTimeInputs() {
        this.startTime.value = this.formatTime(this.trimStart);
        this.endTime.value = this.formatTime(this.trimEnd);
        this.duration.value = this.formatTime(this.trimEnd - this.trimStart);
    }

    updateTimeline() {
        const startPercent = (this.trimStart / this.videoDuration) * 100;
        const endPercent = (this.trimEnd / this.videoDuration) * 100;
        
        this.startHandle.style.left = startPercent + '%';
        this.endHandle.style.left = endPercent + '%';
        this.trimRegion.style.left = startPercent + '%';
        this.trimRegion.style.width = (endPercent - startPercent) + '%';
    }

    async trimVideo() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Simulate video trimming process
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 200));
                this.showProgress(i);
            }
            
            // For demonstration, create a simulated trimmed video
            // In real implementation, this would use FFmpeg.wasm
            this.outputBlob = new Blob([this.currentFile], { type: 'video/mp4' });
            
            this.showResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to trim video: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    showResults() {
        this.results.style.display = 'block';
    }

    downloadVideo() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const fileName = this.currentFile.name.replace(/\.[^/.]+$/, `_trimmed.${format}`);
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = fileName;
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

    showProgress(percent) {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
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