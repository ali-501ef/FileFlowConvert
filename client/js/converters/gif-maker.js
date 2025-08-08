class GifMaker {
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
        this.convertBtn.addEventListener('click', this.createGIF.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadFile.bind(this));
        
        // Duration validation
        document.getElementById('duration').addEventListener('input', this.validateDuration.bind(this));
        document.getElementById('startTime').addEventListener('input', this.validateTimes.bind(this));
        
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

        // Set default duration based on video length
        const defaultDuration = Math.min(this.videoDuration, 3);
        document.getElementById('duration').value = defaultDuration;
        document.getElementById('duration').max = Math.min(this.videoDuration, 10);
    }

    validateDuration() {
        const duration = parseFloat(document.getElementById('duration').value) || 0;
        const startTime = parseFloat(document.getElementById('startTime').value) || 0;
        
        if (this.videoDuration && startTime + duration > this.videoDuration) {
            document.getElementById('duration').value = Math.max(0.5, this.videoDuration - startTime);
        }
    }

    validateTimes() {
        const startTime = parseFloat(document.getElementById('startTime').value) || 0;
        const duration = parseFloat(document.getElementById('duration').value) || 3;
        
        if (this.videoDuration) {
            document.getElementById('startTime').max = Math.max(0, this.videoDuration - 0.5);
            
            if (startTime + duration > this.videoDuration) {
                document.getElementById('duration').value = Math.max(0.5, this.videoDuration - startTime);
            }
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

    async createGIF() {
        if (!this.uploadResult) {
            this.errorDisplay.showError('Please upload a file first');
            return;
        }

        try {
            this.buttonLoader.showLoading();
            this.progress.show(0);
            this.results.style.display = 'none';

            // Get GIF settings
            const settings = this.getGifSettings();
            console.log('GIF settings:', settings);

            // Validate settings
            if (settings.startTime + settings.duration > this.videoDuration) {
                throw new Error('Start time + duration exceeds video length');
            }

            // Start GIF creation
            await this.performGifCreation(settings);
            
            // Show results
            this.showResults(settings);
            
            // Track conversion for analytics
            AnalyticsTracker.trackConversion('Audio/Video Tools', 'GIF Maker');
            
        } catch (error) {
            console.error('GIF creation error:', error);
            this.errorDisplay.showError('GIF creation failed: ' + error.message);
        } finally {
            this.buttonLoader.hideLoading();
            this.progress.hide();
        }
    }

    getGifSettings() {
        return {
            startTime: parseFloat(document.getElementById('startTime').value) || 0,
            duration: parseFloat(document.getElementById('duration').value) || 3,
            frameRate: parseInt(document.getElementById('frameRate').value) || 10,
            quality: document.getElementById('quality').value,
            width: document.getElementById('width').value === 'original' ? null : parseInt(document.getElementById('width').value),
            loop: document.getElementById('loop').checked,
            boomerang: document.getElementById('boomerang').checked
        };
    }

    async performGifCreation(settings) {
        this.progress.updateProgress(10);
        
        // Call backend conversion API
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_to_gif',
                options: {
                    start_time: settings.startTime,
                    duration: settings.duration,
                    fps: settings.frameRate,
                    width: settings.width,
                    quality: settings.quality,
                    loop: settings.loop,
                    boomerang: settings.boomerang
                }
            })
        });

        this.progress.updateProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'GIF creation failed');
        }

        const result = await response.json();
        console.log('GIF creation result:', result);

        this.progress.updateProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
    }

    showResults(settings) {
        const originalSize = this.currentFile.size;
        const outputSize = this.fileSize;

        // Show GIF preview
        document.getElementById('gifPreview').innerHTML = `
            <img src="${this.downloadUrl}" alt="Generated GIF" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        `;

        // Show stats
        document.getElementById('gifStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${settings.duration}s</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Frame Rate:</span>
                    <span class="stat-value">${settings.frameRate} FPS</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Size:</span>
                    <span class="stat-value">${settings.width ? settings.width + 'px' : 'Original'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">File Size:</span>
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
            const baseName = this.currentFile.name.replace(/\.[^/.]+$/, "");
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
            a.download = `${baseName}_gif_${timestamp}.gif`;
            
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

// Initialize the GIF maker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GifMaker();
});