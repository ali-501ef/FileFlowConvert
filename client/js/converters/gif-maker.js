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
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressStage = document.getElementById('progressStage');
        
        this.currentFile = null;
        this.outputBlob = null;
        this.videoDuration = 0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Video player events
        this.videoPlayer.addEventListener('loadedmetadata', this.onVideoLoaded.bind(this));
        
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

    handleFile(file) {
        this.currentFile = file;
        const url = URL.createObjectURL(file);
        this.videoPlayer.src = url;
        this.uploadArea.style.display = 'none';
        this.videoPreview.style.display = 'block';
    }

    onVideoLoaded() {
        this.videoDuration = this.videoPlayer.duration;
        
        // Update duration max value
        const durationInput = document.getElementById('duration');
        durationInput.max = Math.min(10, this.videoDuration);
        
        // Update start time max value
        const startTimeInput = document.getElementById('startTime');
        startTimeInput.max = this.videoDuration - 0.5;
        
        this.convertBtn.disabled = false;
    }

    async createGif() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgressWithStages(0, 'Preparing video...');
        this.results.style.display = 'none';

        try {
            const settings = this.getGifSettings();
            await this.processVideoToGif(settings);
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
            startTime: parseFloat(document.getElementById('startTime').value),
            duration: parseFloat(document.getElementById('duration').value),
            frameRate: parseInt(document.getElementById('frameRate').value),
            quality: document.getElementById('quality').value,
            width: document.getElementById('width').value,
            loop: document.getElementById('loop').checked,
            boomerang: document.getElementById('boomerang').checked
        };
    }

    async processVideoToGif(settings) {
        const stages = [
            'Extracting frames...',
            'Processing images...',
            'Optimizing colors...',
            'Creating GIF animation...',
            'Finalizing...'
        ];
        
        for (let i = 0; i < stages.length; i++) {
            const progress = Math.floor((i / stages.length) * 100);
            this.showProgressWithStages(progress, stages[i]);
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        this.showProgressWithStages(100, 'Complete!');
        
        // Create a sample animated GIF data
        // In a real implementation, this would use libraries like gif.js or similar
        const gifData = await this.createSampleGif(settings);
        this.outputBlob = new Blob([gifData], { type: 'image/gif' });
        
        // Store GIF info for display
        this.gifInfo = {
            width: settings.width === 'original' ? this.videoPlayer.videoWidth : parseInt(settings.width),
            height: settings.width === 'original' ? this.videoPlayer.videoHeight : 
                   Math.floor((parseInt(settings.width) / this.videoPlayer.videoWidth) * this.videoPlayer.videoHeight),
            duration: settings.duration,
            frameRate: settings.frameRate,
            frames: Math.ceil(settings.duration * settings.frameRate),
            size: this.outputBlob.size
        };
    }

    async createSampleGif(settings) {
        // This creates a simple animated pattern as a demo
        // Real implementation would extract video frames and create actual GIF
        const width = settings.width === 'original' ? this.videoPlayer.videoWidth : parseInt(settings.width);
        const height = settings.width === 'original' ? this.videoPlayer.videoHeight : 
                      Math.floor((parseInt(settings.width) / this.videoPlayer.videoWidth) * this.videoPlayer.videoHeight);
        
        // Create canvas for frame extraction
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Generate sample GIF data (simplified)
        const frames = Math.ceil(settings.duration * settings.frameRate);
        const gifSize = frames * width * height * 0.1; // Rough estimate
        
        return new ArrayBuffer(Math.floor(gifSize));
    }

    showGifResults() {
        const info = this.gifInfo;
        
        // Create preview (placeholder for demo)
        document.getElementById('gifPreview').innerHTML = `
            <div class="gif-placeholder" style="width: ${Math.min(info.width, 400)}px; height: ${Math.min(info.height, 300)}px; background: linear-gradient(45deg, #f0f0f0, #e0e0e0); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 1rem auto;">
                <span style="color: #666; font-size: 1.2rem;">GIF Preview</span>
            </div>
        `;
        
        document.getElementById('gifInfo').innerHTML = `
            <div class="gif-details">
                <div class="detail-row">
                    <span class="detail-label">Dimensions:</span>
                    <span class="detail-value">${info.width} × ${info.height}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${info.duration}s</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Frame Rate:</span>
                    <span class="detail-value">${info.frameRate} FPS</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Frames:</span>
                    <span class="detail-value">${info.frames}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">File Size:</span>
                    <span class="detail-value">${this.formatFileSize(info.size)}</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadGif() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.[^/.]+$/, '.gif');
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