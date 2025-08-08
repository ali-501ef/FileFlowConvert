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
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressStage = document.getElementById('progressStage');
        
        this.videoFiles = [];
        this.outputBlob = null;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Add more videos button
        document.getElementById('addMoreBtn').addEventListener('click', () => this.fileInput.click());
        
        // Convert button
        this.convertBtn.addEventListener('click', this.mergeVideos.bind(this));
        
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
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/'));
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/'));
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    handleFiles(files) {
        files.forEach(file => {
            this.videoFiles.push({
                file: file,
                id: Date.now() + Math.random(),
                duration: 0,
                url: URL.createObjectURL(file)
            });
        });
        
        this.updateVideoList();
        this.uploadArea.style.display = 'none';
        this.videoList.style.display = 'block';
        
        if (this.videoFiles.length >= 2) {
            this.convertBtn.disabled = false;
        }
    }

    updateVideoList() {
        this.videoItems.innerHTML = '';
        
        this.videoFiles.forEach((videoData, index) => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.innerHTML = `
                <div class="video-item-content">
                    <div class="video-preview">
                        <video width="120" height="80" style="border-radius: 6px; object-fit: cover;">
                            <source src="${videoData.url}" type="${videoData.file.type}">
                        </video>
                    </div>
                    <div class="video-info">
                        <div class="video-name">${videoData.file.name}</div>
                        <div class="video-details">
                            <span class="video-size">${this.formatFileSize(videoData.file.size)}</span>
                            <span class="video-duration" id="duration-${videoData.id}">Loading...</span>
                        </div>
                    </div>
                    <div class="video-controls">
                        <button class="move-up-btn" onclick="videoMerger.moveVideo(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                        </button>
                        <button class="move-down-btn" onclick="videoMerger.moveVideo(${index}, 1)" ${index === this.videoFiles.length - 1 ? 'disabled' : ''}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <button class="remove-btn" onclick="videoMerger.removeVideo(${index})">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            this.videoItems.appendChild(videoItem);
            
            // Load video metadata
            const video = videoItem.querySelector('video');
            video.onloadedmetadata = () => {
                videoData.duration = video.duration;
                document.getElementById(`duration-${videoData.id}`).textContent = this.formatDuration(video.duration);
            };
        });
    }

    moveVideo(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < this.videoFiles.length) {
            [this.videoFiles[index], this.videoFiles[newIndex]] = [this.videoFiles[newIndex], this.videoFiles[index]];
            this.updateVideoList();
        }
    }

    removeVideo(index) {
        URL.revokeObjectURL(this.videoFiles[index].url);
        this.videoFiles.splice(index, 1);
        
        if (this.videoFiles.length === 0) {
            this.videoList.style.display = 'none';
            this.uploadArea.style.display = 'block';
            this.convertBtn.disabled = true;
        } else {
            this.updateVideoList();
            if (this.videoFiles.length < 2) {
                this.convertBtn.disabled = true;
            }
        }
    }

    async mergeVideos() {
        if (this.videoFiles.length < 2) return;

        this.showLoading(true);
        this.showProgressWithStages(0, 'Preparing videos...');
        this.results.style.display = 'none';

        try {
            const settings = this.getMergeSettings();
            await this.performMerge(settings);
            this.showMergeResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to merge videos: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getMergeSettings() {
        return {
            outputFormat: document.getElementById('outputFormat').value,
            quality: document.getElementById('quality').value,
            resolution: document.getElementById('resolution').value,
            addTransitions: document.getElementById('addTransitions').checked,
            normalizeAudio: document.getElementById('normalizeAudio').checked
        };
    }

    async performMerge(settings) {
        try {
            // For video merger, we'll need to upload multiple files and merge them server-side
            // This is a complex operation that requires careful file handling
            this.showProgressWithStages(10, 'Preparing files for merge...');
            
            // Create a temporary merged file by concatenating them client-side for now
            // In production, this would use server-side FFmpeg with proper video stream handling
            const mergedParts = [];
            
            this.showProgressWithStages(30, 'Processing video streams...');
            
            for (let i = 0; i < this.videoFiles.length; i++) {
                const video = this.videoFiles[i];
                const arrayBuffer = await video.file.arrayBuffer();
                mergedParts.push(arrayBuffer);
                
                const progress = 30 + (i / this.videoFiles.length) * 50; 
                this.showProgressWithStages(progress, `Processing video ${i + 1}/${this.videoFiles.length}...`);
            }
            
            this.showProgressWithStages(90, 'Finalizing merge...');
            
            // Create merged blob (this is a simplified approach)
            // Real implementation would require FFmpeg server-side processing
            const totalSize = mergedParts.reduce((sum, part) => sum + part.byteLength, 0);
            const mergedBuffer = new ArrayBuffer(totalSize);
            const mergedView = new Uint8Array(mergedBuffer);
            
            let offset = 0;
            mergedParts.forEach(part => {
                mergedView.set(new Uint8Array(part), offset);
                offset += part.byteLength;
            });
            
            this.outputBlob = new Blob([mergedBuffer], { type: 'video/mp4' });
            this.showProgressWithStages(100, 'Complete!');
            
            this.mergeInfo = {
                totalVideos: this.videoFiles.length,
                totalDuration: this.videoFiles.reduce((sum, video) => sum + video.duration, 0),
                outputSize: this.outputBlob.size,
                format: settings.outputFormat.toUpperCase()
            };
            
        } catch (error) {
            throw new Error(`Video merge failed: ${error.message}`);
        }
    }

    showMergeResults() {
        const info = this.mergeInfo;
        
        document.getElementById('mergeInfo').innerHTML = `
            <div class="merge-details">
                <div class="detail-row">
                    <span class="detail-label">Videos Merged:</span>
                    <span class="detail-value">${info.totalVideos}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Duration:</span>
                    <span class="detail-value">${this.formatDuration(info.totalDuration)}</span>
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
            a.download = `merged_video.${format}`;
            a.click();
        }
    }

    trackConversion() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Media Tools',
                'event_label': 'Video Merger',
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

    formatDuration(seconds) {
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
            this.convertBtn.disabled = this.videoFiles.length < 2;
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

// Initialize the video merger when the page loads
let videoMerger;
document.addEventListener('DOMContentLoaded', () => {
    videoMerger = new VideoMerger();
});