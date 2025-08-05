class Mp4ToMp3Converter {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.videoPreview = document.getElementById('videoPreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressStage = document.getElementById('progressStage');
        
        this.currentFile = null;
        this.outputBlob = null;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.extractAudio.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadAudio.bind(this));
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
        this.showFilePreview(file);
        
        // Load video for preview and info
        const url = URL.createObjectURL(file);
        this.videoPreview.src = url;
        
        this.videoPreview.onloadedmetadata = () => {
            const duration = this.formatDuration(this.videoPreview.duration);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            document.getElementById('videoInfo').innerHTML = `
                <div class="video-details">
                    <span class="detail-item">🎬 ${fileExtension.toUpperCase()}</span>
                    <span class="detail-item">⏱️ ${duration}</span>
                    <span class="detail-item">📏 ${this.videoPreview.videoWidth}x${this.videoPreview.videoHeight}</span>
                    <span class="detail-item">💾 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
        };
        
        this.convertBtn.disabled = false;
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
    }

    async extractAudio() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgressWithStages(0, 'Starting extraction...');
        this.results.style.display = 'none';

        try {
            const settings = this.getExtractionSettings();
            await this.performExtraction(settings);
            this.showExtractionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to extract audio: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getExtractionSettings() {
        return {
            format: document.getElementById('outputFormat')?.value || 'mp3',
            quality: document.getElementById('audioQuality')?.value || 'medium',
            bitrate: document.getElementById('customBitrate')?.value || 192
        };
    }

    async performExtraction(settings) {
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
            this.showProgressWithStages(30, 'Extracting audio...');
            
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
                        format: settings.format,
                        bitrate: this.getBitrateFromQuality(settings.quality, settings.bitrate)
                    }
                })
            });
            
            this.showProgressWithStages(90, 'Finalizing audio...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Audio extraction failed');
            }
            
            const result = await convertResponse.json();
            this.showProgressWithStages(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            this.audioInfo = {
                originalSize: this.currentFile.size,
                audioSize: result.file_size,
                format: settings.format.toUpperCase(),
                quality: settings.quality,
                compressionRatio: ((this.currentFile.size - result.file_size) / this.currentFile.size * 100).toFixed(1)
            };
            
        } catch (error) {
            throw new Error(`Audio extraction failed: ${error.message}`);
        }
    }

    getBitrateFromQuality(quality, customBitrate) {
        switch (quality) {
            case 'high': return 320;
            case 'medium': return 192;
            case 'standard': return 128;
            case 'custom': return parseInt(customBitrate) || 192;
            default: return 192;
        }
    }

    showExtractionResults() {
        const info = this.audioInfo;
        
        document.getElementById('audioInfo').innerHTML = `
            <div class="audio-details">
                <div class="detail-row">
                    <span class="detail-label">Original Video Size:</span>
                    <span class="detail-value">${this.formatFileSize(info.originalSize)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Extracted Audio Size:</span>
                    <span class="detail-value">${this.formatFileSize(info.audioSize)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Audio Format:</span>
                    <span class="detail-value">${info.format}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quality Level:</span>
                    <span class="detail-value">${info.quality}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Size Reduction:</span>
                    <span class="detail-value success">${info.compressionRatio}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadAudio() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat')?.value || 'mp3';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = `extracted_audio.${format}`;
            a.click();
        }
    }

    trackConversion() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Media Tools',
                'event_label': 'MP4 to MP3',
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

    showLoading(show) {
        const btnText = document.querySelector('.btn-text');
        const btnLoader = document.querySelector('.btn-loader');
        
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

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.converter-container');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
            
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }
}

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mp4ToMp3Converter = new Mp4ToMp3Converter();
});