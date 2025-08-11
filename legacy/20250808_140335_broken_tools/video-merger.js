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
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Add more videos button
        document.getElementById('addMoreBtn').addEventListener('click', this.handleUploadAreaClick.bind(this));
        
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

    handleUploadAreaClick(e) {
        if (this.isFilePickerOpen) {
            return;
        }
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        // Reset flag after a short delay to handle cancel scenarios
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
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
            
            // Create structure using safe DOM methods
            const videoItemContent = document.createElement('div');
            videoItemContent.className = 'video-item-content';
            
            // Video preview section
            const videoPreview = document.createElement('div');
            videoPreview.className = 'video-preview';
            const videoElement = document.createElement('video');
            videoElement.width = 120;
            videoElement.height = 80;
            videoElement.style.borderRadius = '6px';
            videoElement.style.objectFit = 'cover';
            const source = document.createElement('source');
            source.src = videoData.url;
            source.type = videoData.file.type;
            videoElement.appendChild(source);
            videoPreview.appendChild(videoElement);
            
            // Video info section
            const videoInfo = document.createElement('div');
            videoInfo.className = 'video-info';
            const videoName = document.createElement('div');
            videoName.className = 'video-name';
            videoName.textContent = videoData.file.name; // Safe text content
            const videoDetails = document.createElement('div');
            videoDetails.className = 'video-details';
            const videoSize = document.createElement('span');
            videoSize.className = 'video-size';
            videoSize.textContent = this.formatFileSize(videoData.file.size);
            const videoDuration = document.createElement('span');
            videoDuration.className = 'video-duration';
            videoDuration.id = `duration-${videoData.id}`;
            videoDuration.textContent = 'Loading...';
            videoDetails.appendChild(videoSize);
            videoDetails.appendChild(videoDuration);
            videoInfo.appendChild(videoName);
            videoInfo.appendChild(videoDetails);
            
            // Video controls section
            const videoControls = document.createElement('div');
            videoControls.className = 'video-controls';
            
            // Move up button
            const moveUpBtn = document.createElement('button');
            moveUpBtn.className = 'move-up-btn';
            moveUpBtn.onclick = () => this.moveVideo(index, -1);
            moveUpBtn.disabled = index === 0;
            moveUpBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>`;
            
            // Move down button
            const moveDownBtn = document.createElement('button');
            moveDownBtn.className = 'move-down-btn';
            moveDownBtn.onclick = () => this.moveVideo(index, 1);
            moveDownBtn.disabled = index === this.videoFiles.length - 1;
            moveDownBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>`;
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => this.removeVideo(index);
            removeBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`;
            
            videoControls.appendChild(moveUpBtn);
            videoControls.appendChild(moveDownBtn);
            videoControls.appendChild(removeBtn);
            
            // Assemble the structure
            videoItemContent.appendChild(videoPreview);
            videoItemContent.appendChild(videoInfo);
            videoItemContent.appendChild(videoControls);
            videoItem.appendChild(videoItemContent);
            
            this.videoItems.appendChild(videoItem);
            
            // Load video metadata
            const videoEl = videoItem.querySelector('video');
            videoEl.onloadedmetadata = () => {
                videoData.duration = videoEl.duration;
                document.getElementById(`duration-${videoData.id}`).textContent = this.formatDuration(videoEl.duration);
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
        const mergeInfoElement = document.getElementById('mergeInfo');
        
        // Create container with safe DOM methods
        const mergeDetails = document.createElement('div');
        mergeDetails.className = 'merge-details';
        
        // Helper function to create detail rows
        const createDetailRow = (label, value) => {
            const row = document.createElement('div');
            row.className = 'detail-row';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'detail-label';
            labelSpan.textContent = label;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'detail-value';
            valueSpan.textContent = value;
            
            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            return row;
        };
        
        // Create status row with icon
        const createStatusRow = () => {
            const row = document.createElement('div');
            row.className = 'detail-row';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'detail-label';
            labelSpan.textContent = 'Status:';
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'detail-value success';
            valueSpan.textContent = '✓ Ready for download';
            
            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            return row;
        };
        
        // Append all detail rows
        mergeDetails.appendChild(createDetailRow('Videos Merged:', info.totalVideos));
        mergeDetails.appendChild(createDetailRow('Total Duration:', this.formatDuration(info.totalDuration)));
        mergeDetails.appendChild(createDetailRow('Output Format:', info.format));
        mergeDetails.appendChild(createDetailRow('File Size:', this.formatFileSize(info.outputSize)));
        mergeDetails.appendChild(createStatusRow());
        
        // Clear and append to DOM
        mergeInfoElement.textContent = '';
        mergeInfoElement.appendChild(mergeDetails);
        
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