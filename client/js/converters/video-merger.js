class VideoMerger {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.videoList = document.getElementById('videoList');
        this.videoItems = document.getElementById('videoItems');
        this.addMoreBtn = document.getElementById('addMoreBtn');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFiles = [];
        this.uploadResults = [];
        this.outputBlob = null;
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Add more files button
        this.addMoreBtn.addEventListener('click', this.handleAddMoreClick.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.mergeVideos.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadFile.bind(this));
    }

    handleUploadAreaClick(e) {
        // Click guard to prevent double file picker opening
        if (this.isFilePickerOpen) {
            return;
        }
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        // Reset flag after a delay to handle cancel cases
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleAddMoreClick(e) {
        // Click guard to prevent double file picker opening
        if (this.isFilePickerOpen) {
            return;
        }
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        // Reset flag after a delay to handle cancel cases
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('video/'));
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    async handleFiles(newFiles) {
        // Add new files to current list
        this.currentFiles = [...this.currentFiles, ...newFiles];
        
        try {
            // Upload all new files
            for (const file of newFiles) {
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
            this.showError('Failed to upload files: ' + error.message);
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

        return await response.json();
    }

    updateVideoList() {
        // Show video list and hide upload area
        this.videoList.style.display = 'block';
        this.uploadArea.style.display = 'none';
        
        // Clear existing items
        this.videoItems.innerHTML = '';
        
        // Add video items
        this.currentFiles.forEach((file, index) => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.innerHTML = `
                <div class="video-item-info">
                    <div class="video-item-name">${file.name}</div>
                    <div class="video-item-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="video-item-actions">
                    <button class="remove-video-btn" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            // Add remove functionality
            const removeBtn = videoItem.querySelector('.remove-video-btn');
            removeBtn.addEventListener('click', () => this.removeVideo(index));
            
            this.videoItems.appendChild(videoItem);
        });
    }

    removeVideo(index) {
        this.currentFiles.splice(index, 1);
        this.uploadResults.splice(index, 1);
        
        if (this.currentFiles.length === 0) {
            this.videoList.style.display = 'none';
            this.uploadArea.style.display = 'block';
            this.convertBtn.disabled = true;
        } else {
            this.updateVideoList();
            this.convertBtn.disabled = this.currentFiles.length < 2;
        }
    }

    getMergeSettings() {
        return {
            output_format: document.getElementById('outputFormat').value,
            quality: document.getElementById('quality').value,
            resolution: document.getElementById('resolution').value,
            add_transitions: document.getElementById('addTransitions').checked,
            normalize_audio: document.getElementById('normalizeAudio').checked
        };
    }

    async mergeVideos() {
        if (this.currentFiles.length < 2) {
            this.showError('Please select at least 2 video files to merge');
            return;
        }

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Get merge settings
            const settings = this.getMergeSettings();
            
            // For now, show an error that this feature needs backend implementation
            // In a real implementation, this would call the backend API
            throw new Error('Video merging backend not yet implemented. This feature requires server-side FFmpeg processing to concatenate multiple video files.');
            
            // TODO: Once backend is implemented, use this:
            // await this.performMerging(settings);
            // this.showMergeResults();
            // this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to merge videos: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    async performMerging(settings) {
        this.showProgress(10);
        
        // Call backend conversion API with multiple files
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_ids: this.uploadResults.map(ur => ur.result.file_id),
                conversion_type: 'video_merge',
                options: settings
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Video merging failed');
        }

        const result = await response.json();
        this.showProgress(100);

        // Store download URL for later use
        this.downloadUrl = result.download_url;
        this.outputFilename = result.output_file;
        this.fileSize = result.file_size;
    }

    showMergeResults() {
        const totalOriginalSize = this.currentFiles.reduce((sum, file) => sum + file.size, 0);
        const mergedSize = this.fileSize;
        const fileCount = this.currentFiles.length;

        document.getElementById('mergeStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Files Merged:</span>
                    <span class="stat-value">${fileCount} videos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Input Size:</span>
                    <span class="stat-value">${this.formatFileSize(totalOriginalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Size:</span>
                    <span class="stat-value">${this.formatFileSize(mergedSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Format:</span>
                    <span class="stat-value">${document.getElementById('outputFormat').value.toUpperCase()}</span>
                </div>
            </div>
        `;

        this.results.style.display = 'block';
    }

    downloadFile() {
        if (this.downloadUrl) {
            const a = document.createElement('a');
            a.href = this.downloadUrl;
            a.download = 'merged_video.' + document.getElementById('outputFormat').value;
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Audio/Video Tools',
                'event_label': 'Video Merger',
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
            this.convertBtn.disabled = this.currentFiles.length < 2;
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

// Initialize the merger when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoMerger();
});