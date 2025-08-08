/**
 * Video Merger - Multiple Video Merging Tool
 * Uses shared components and follows the PDF Compress pattern
 */
class VideoMerger {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupComponents();
    }

    init() {
        this.videoFiles = [];
        this.outputBlob = null;
        this.mergeStats = null;
        
        // Initialize DOM elements
        this.videoList = document.getElementById('videoList');
        this.videoItems = document.getElementById('videoItems');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
    }

    setupComponents() {
        // Initialize shared components
        this.uploader = new FileUploader({
            uploadAreaId: 'uploadArea',
            fileInputId: 'fileInput',
            acceptedTypes: ['video/*'],
            multiple: true,
            onFileSelect: this.handleFiles.bind(this)
        });

        this.progress = new ProgressTracker({
            progressContainerId: 'progressContainer',
            progressFillId: 'progressFill',
            progressTextId: 'progressText',
            progressStageId: 'progressStage',
            showStages: true
        });

        this.buttonLoader = new ButtonLoader('convertBtn');
        this.errorDisplay = new ErrorDisplay('results');
    }

    setupEventListeners() {
        // Add more videos button
        document.getElementById('addMoreBtn').addEventListener('click', () => {
            this.uploader.triggerFileSelect();
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', this.mergeVideos.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadVideo.bind(this));
    }

    async handleFiles(files) {
        // Add new files to existing collection
        for (const file of files) {
            try {
                const metadata = await this.getVideoMetadata(file);
                this.videoFiles.push({
                    file: file,
                    id: Date.now() + Math.random(),
                    duration: metadata.duration,
                    width: metadata.width,
                    height: metadata.height,
                    url: URL.createObjectURL(file)
                });
            } catch (error) {
                this.errorDisplay.showError(`Failed to load metadata for ${file.name}`);
            }
        }
        
        this.updateVideoList();
        this.uploader.hideUploadArea();
        this.videoList.style.display = 'block';
        
        if (this.videoFiles.length >= 2) {
            this.convertBtn.disabled = false;
        }
    }

    async getVideoMetadata(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                const metadata = {
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight
                };
                URL.revokeObjectURL(video.src);
                resolve(metadata);
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Invalid video file'));
            };
            
            video.src = URL.createObjectURL(file);
        });
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
                            <span class="video-size">${FileUtils.formatFileSize(videoData.file.size)}</span>
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
                document.getElementById(`duration-${videoData.id}`).textContent = FileUtils.formatDuration(videoData.duration);
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
            this.uploader.showUploadArea();
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

        this.buttonLoader.showLoading();
        this.progress.show(0, 'Preparing videos...');
        this.results.style.display = 'none';

        try {
            const settings = this.getMergeSettings();
            await this.performMerge(settings);
            this.showMergeResults();
            AnalyticsTracker.trackConversion('Media Tools', 'Video Merger');
            
        } catch (error) {
            this.errorDisplay.showError('Failed to merge videos: ' + error.message);
        }

        this.progress.hide();
        this.buttonLoader.hideLoading();
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
            // Upload all video files to server
            const uploadedFiles = [];
            
            for (let i = 0; i < this.videoFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', this.videoFiles[i].file);
                
                const progress = 10 + (i / this.videoFiles.length) * 30;
                this.progress.updateProgress(progress, `Uploading video ${i + 1}/${this.videoFiles.length}...`);
                
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!uploadResponse.ok) {
                    throw new Error(`Failed to upload ${this.videoFiles[i].file.name}`);
                }
                
                const uploadResult = await uploadResponse.json();
                uploadedFiles.push(uploadResult.file_id);
            }
            
            this.progress.updateProgress(50, 'Merging videos...');
            
            // Merge videos with server-side processing
            const convertResponse = await fetch('/api/convert-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_ids: uploadedFiles,
                    conversion_type: 'video_merge',
                    options: {
                        format: settings.outputFormat,
                        quality: settings.quality,
                        resolution: settings.resolution,
                        add_transitions: settings.addTransitions,
                        normalize_audio: settings.normalizeAudio
                    }
                })
            });
            
            this.progress.updateProgress(80, 'Finalizing merge...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Video merge failed');
            }
            
            const result = await convertResponse.json();
            this.progress.updateProgress(100, 'Complete!');
            
            // Download the merged file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            // Store merge stats
            this.mergeStats = {
                totalVideos: this.videoFiles.length,
                totalDuration: this.videoFiles.reduce((sum, video) => sum + video.duration, 0),
                outputSize: result.file_size,
                format: settings.outputFormat.toUpperCase()
            };
            
        } catch (error) {
            throw new Error(`Video merge failed: ${error.message}`);
        }
    }

    showMergeResults() {
        const stats = this.mergeStats;
        
        document.getElementById('mergeInfo').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Videos Merged:</span>
                    <span class="stat-value">${stats.totalVideos}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Duration:</span>
                    <span class="stat-value">${FileUtils.formatDuration(stats.totalDuration)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Format:</span>
                    <span class="stat-value">${stats.format}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">File Size:</span>
                    <span class="stat-value">${FileUtils.formatFileSize(stats.outputSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">✓ Ready for download</span>
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

}

// Global variable for onclick handlers
let videoMerger;

// Initialize the video merger when the page loads
let videoMerger;
document.addEventListener('DOMContentLoaded', () => {
    videoMerger = new VideoMerger();
});