class MP4ToMP3Converter {
    constructor() {
        this.currentFile = null;
        this.outputBlob = null;
        this.uploadResult = null;
        this.init();
        this.setupEventListeners();
    }

    init() {
        console.log('MP4ToMP3Converter: Starting initialization');
        
        try {
            // Initialize shared components
            this.uploader = new FileUploader({
                uploadAreaId: 'uploadArea',
                fileInputId: 'fileInput',
                acceptedTypes: ['video/*'],
                onFileSelect: this.handleFile.bind(this)
            });
            console.log('MP4ToMP3Converter: FileUploader initialized');
    
            this.progress = new ProgressTracker({
                progressContainerId: 'progressContainer',
                progressFillId: 'progressFill',
                progressTextId: 'progressText'
            });
            console.log('MP4ToMP3Converter: ProgressTracker initialized');
    
            this.buttonLoader = new ButtonLoader('convertBtn');
            console.log('MP4ToMP3Converter: ButtonLoader initialized');
            
            this.errorDisplay = new ErrorDisplay('results');
            console.log('MP4ToMP3Converter: ErrorDisplay initialized');
    
            // Get DOM elements
            this.convertBtn = document.getElementById('convertBtn');
            this.downloadBtn = document.getElementById('downloadBtn');
            this.filePreview = document.getElementById('filePreview');
            this.results = document.getElementById('results');
            
            console.log('MP4ToMP3Converter: All components initialized successfully');
        } catch (error) {
            console.error('MP4ToMP3Converter: Initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.convertBtn.addEventListener('click', this.convertToMP3.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadFile.bind(this));
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
        
        // Create video element to get metadata
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        
        video.addEventListener('loadedmetadata', () => {
            const duration = FileUtils.formatDuration(video.duration);
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            
            document.getElementById('videoInfo').innerHTML = `
                <div class="video-details">
                    <span class="detail-item">🎬 ${duration}</span>
                    <span class="detail-item">📐 ${resolution}</span>
                    <span class="detail-item">📊 ${FileUtils.formatFileSize(file.size)}</span>
                </div>
            `;
            
            // Clean up object URL
            URL.revokeObjectURL(video.src);
        });

        this.filePreview.style.display = 'block';
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

    async convertToMP3() {
        if (!this.uploadResult) {
            this.errorDisplay.showError('Please upload a file first');
            return;
        }

        try {
            this.buttonLoader.showLoading();
            this.progress.show(0);
            this.results.style.display = 'none';

            // Get conversion settings
            const settings = this.getConversionSettings();
            console.log('Conversion settings:', settings);

            // Start conversion
            await this.performConversion(settings);
            
            // Show results
            this.showResults();
            
            // Track conversion for analytics
            AnalyticsTracker.trackConversion('Audio/Video Tools', 'MP4 to MP3');
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.errorDisplay.showError('Conversion failed: ' + error.message);
        } finally {
            this.buttonLoader.hideLoading();
            this.progress.hide();
        }
    }

    getConversionSettings() {
        return {
            bitrate: document.getElementById('audioBitrate').value,
            format: document.getElementById('audioFormat').value,
            preserveMetadata: document.getElementById('preserveMetadata').checked,
            normalizeAudio: document.getElementById('normalizeAudio').checked
        };
    }

    async performConversion(settings) {
        this.progress.updateProgress(10);
        
        // Call backend conversion API
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_to_audio',
                options: {
                    format: settings.format,
                    bitrate: settings.bitrate,
                    preserve_metadata: settings.preserveMetadata,
                    normalize_audio: settings.normalizeAudio
                }
            })
        });

        this.progress.updateProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        const result = await response.json();
        console.log('Conversion result:', result);

        this.progress.updateProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
    }

    showResults() {
        const originalSize = this.currentFile.size;
        const outputSize = this.fileSize;
        const format = document.getElementById('audioFormat').value.toUpperCase();
        const bitrate = document.getElementById('audioBitrate').value;

        document.getElementById('conversionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Format:</span>
                    <span class="stat-value">${format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Bitrate:</span>
                    <span class="stat-value">${bitrate} kbps</span>
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
            const format = document.getElementById('audioFormat').value;
            const baseName = this.currentFile.name.replace(/\.[^/.]+$/, "");
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
            a.download = `${baseName}_mp4tomp3_${timestamp}.${format}`;
            
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

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MP4ToMP3Converter();
});