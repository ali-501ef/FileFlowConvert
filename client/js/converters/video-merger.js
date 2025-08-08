class VideoMerger {
    constructor() {
        this.currentFiles = [];
        this.uploadResults = [];
        this.outputBlob = null;
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Initialize shared components
        this.uploader = new FileUploader({
            uploadAreaId: 'uploadArea',
            fileInputId: 'fileInput',
            acceptedTypes: ['video/*'],
            multiple: true,
            onFilesSelect: this.handleFiles.bind(this)
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
        this.videoList = document.getElementById('videoList');
        this.videoItems = document.getElementById('videoItems');
        this.addMoreBtn = document.getElementById('addMoreBtn');
        this.results = document.getElementById('results');
    }

    setupEventListeners() {
        this.convertBtn.addEventListener('click', this.mergeVideos.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadFile.bind(this));
        this.addMoreBtn.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    async handleFiles(files) {
        console.log('Files selected:', files.map(f => f.name));

        // Validate file types
        const invalidFiles = files.filter(file => !file.type.startsWith('video/'));
        if (invalidFiles.length > 0) {
            this.errorDisplay.showError(`Invalid files detected: ${invalidFiles.map(f => f.name).join(', ')}`);
            return;
        }

        // Add new files to current list
        this.currentFiles = [...this.currentFiles, ...files];

        try {
            // Upload all new files
            for (const file of files) {
                const uploadResult = await this.uploadFile(file);
                this.uploadResults.push({
                    file: file,
                    result: uploadResult
                });
            }
            
            // Update UI
            this.updateVideoList();
            this.convertBtn.disabled = this.currentFiles.length < 2;
            
        } catch (error) {
            console.error('Error handling files:', error);
            this.errorDisplay.showError('Error processing files: ' + error.message);
        }
    }

    updateVideoList() {
        // Show video list
        this.videoList.style.display = 'block';
        
        // Clear existing items
        this.videoItems.innerHTML = '';
        
        // Add video items
        this.currentFiles.forEach((file, index) => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.innerHTML = `
                <div class="video-item-info">
                    <div class="video-item-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                    </div>
                    <div class="video-item-details">
                        <div class="video-item-name">${file.name}</div>
                        <div class="video-item-size">${FileUtils.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="video-item-actions">
                    <button class="video-item-remove" onclick="videoMerger.removeVideo(${index})" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            this.videoItems.appendChild(videoItem);
        });
    }

    removeVideo(index) {
        this.currentFiles.splice(index, 1);
        this.uploadResults.splice(index, 1);
        this.updateVideoList();
        this.convertBtn.disabled = this.currentFiles.length < 2;
        
        if (this.currentFiles.length === 0) {
            this.videoList.style.display = 'none';
            this.uploader.showUploadArea();
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

        const result = await response.json();
        console.log('Upload successful:', file.name, result);
        return result;
    }

    async mergeVideos() {
        if (this.uploadResults.length < 2) {
            this.errorDisplay.showError('Please upload at least 2 video files');
            return;
        }

        try {
            this.buttonLoader.showLoading();
            this.progress.show(0);
            this.results.style.display = 'none';

            // Get merge settings
            const settings = this.getMergeSettings();
            console.log('Merge settings:', settings);

            // Start merging
            await this.performMerge(settings);
            
            // Show results
            this.showResults();
            
            // Track conversion for analytics
            AnalyticsTracker.trackConversion('Audio/Video Tools', 'Video Merger');
            
        } catch (error) {
            console.error('Merge error:', error);
            this.errorDisplay.showError('Merge failed: ' + error.message);
        } finally {
            this.buttonLoader.hideLoading();
            this.progress.hide();
        }
    }

    getMergeSettings() {
        return {
            format: document.getElementById('outputFormat').value,
            quality: document.getElementById('quality').value,
            resolution: document.getElementById('resolution').value,
            addTransitions: document.getElementById('addTransitions').checked,
            normalizeAudio: document.getElementById('normalizeAudio').checked
        };
    }

    async performMerge(settings) {
        this.progress.updateProgress(10);
        
        // Call backend conversion API
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_ids: this.uploadResults.map(ur => ur.result.file_id),
                conversion_type: 'video_merge',
                options: {
                    quality: settings.quality,
                    resolution: settings.resolution === 'auto' ? null : settings.resolution,
                    add_transitions: settings.addTransitions,
                    normalize_audio: settings.normalizeAudio
                }
            })
        });

        this.progress.updateProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Merge failed');
        }

        const result = await response.json();
        console.log('Merge result:', result);

        this.progress.updateProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
    }

    showResults() {
        const totalOriginalSize = this.currentFiles.reduce((sum, file) => sum + file.size, 0);
        const outputSize = this.fileSize;
        const format = document.getElementById('outputFormat').value.toUpperCase();
        const videoCount = this.currentFiles.length;

        document.getElementById('mergeStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Videos Merged:</span>
                    <span class="stat-value">${videoCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Format:</span>
                    <span class="stat-value">${format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Input Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(totalOriginalSize)}</span>
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
            
            // Create proper filename based on settings
            const format = document.getElementById('outputFormat').value;
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
            a.download = `merged_video_${timestamp}.${format}`;
            
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

// Global variable to make functions accessible from onclick handlers
let videoMerger;

// Initialize the merger when the page loads
document.addEventListener('DOMContentLoaded', () => {
    videoMerger = new VideoMerger();
});