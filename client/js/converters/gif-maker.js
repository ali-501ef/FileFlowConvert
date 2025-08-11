import { pruneByMatrix, bindOrPrune, pruneOnBackendError, checkAdvancedOptionsContainer, collectExistingOptions } from "../utils/pruneOptions.js";

/**
 * GIF Maker
 * Creates animated GIFs from video files
 */
class GifMaker {
    constructor() {
        this.currentFile = null;
        this.uploadResult = null;
        this.isFilePickerOpen = false;
        this.isProcessing = false;
        this.videoDuration = 0;
        this.TOOL_KEY = "gif-maker";
        this.init();
        this.setupEventListeners();
        this.initAdvancedOptionsPruning();
    }

    init() {
        // DOM element references
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.videoPreview = document.getElementById('videoPreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Advanced options - will be set after pruning
        this.startTime = null;
        this.duration = null;
        this.frameRate = null;
        this.quality = null;
        this.width = null;
        this.loop = null;
        this.boomerang = null;
    }

    setupEventListeners() {
        // File input handlers
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => this.createGif());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

    }

    initAdvancedOptionsPruning() {
        // Remove unsupported options first
        pruneByMatrix(this.TOOL_KEY, document);
        
        // Safely bind each advanced option
        bindOrPrune(this.TOOL_KEY, "start", "#startTime", (el) => {
            this.startTime = el;
            el.value = '0';
            el.addEventListener("input", () => this.validateStartTime());
        });
        
        bindOrPrune(this.TOOL_KEY, "duration", "#duration", (el) => {
            this.duration = el;
            el.value = '3';
            el.addEventListener("input", () => this.validateDuration());
        });
        
        bindOrPrune(this.TOOL_KEY, "fps", "#frameRate", (el) => {
            this.frameRate = el;
            el.value = '10';
            el.addEventListener("change", () => this.validateGifOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "quality", "#quality", (el) => {
            this.quality = el;
            el.value = 'medium';
            el.addEventListener("change", () => this.validateGifOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "width", "#width", (el) => {
            this.width = el;
            el.value = '480';
            el.addEventListener("change", () => this.validateGifOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "loop", "#loop", (el) => {
            this.loop = el;
            el.checked = true;
            el.addEventListener("change", () => this.validateGifOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "boomerang", "#boomerang", (el) => {
            this.boomerang = el;
            el.checked = false;
            el.addEventListener("change", () => this.validateGifOptions());
        });
        
        // Check if advanced options container should be hidden
        checkAdvancedOptionsContainer();
        
        console.info(`[Options] ${this.TOOL_KEY}: Advanced options initialization complete`);
    }

    validateGifOptions() {
        // Basic validation for existing options
        if (this.frameRate && this.frameRate.value) {
            const fps = parseInt(this.frameRate.value);
            if (fps < 1 || fps > 60) {
                this.frameRate.setCustomValidity('Frame rate must be between 1 and 60 FPS');
            } else {
                this.frameRate.setCustomValidity('');
            }
        }
        
        if (this.width && this.width.value && this.width.value !== 'original') {
            const width = parseInt(this.width.value);
            if (width < 100 || width > 1920) {
                this.width.setCustomValidity('Width must be between 100 and 1920 pixels');
            } else {
                this.width.setCustomValidity('');
            }
        }
    }

    handleUploadAreaClick(e) {
        if (this.isFilePickerOpen || this.isProcessing) return;
        
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.isProcessing) {
            this.uploadArea.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleFileDrop(e) {
        e.preventDefault();
        if (this.isProcessing) return;
        
        this.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files } });
        }
    }

    async handleFileSelect(e) {
        if (this.isProcessing) return;
        
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            this.showError('Please select a video file.');
            return;
        }

        this.currentFile = file;
        this.showFileInfo(file);
        this.setProcessingState(true, 'Uploading file...');

        try {
            await this.uploadFile(file);
            this.setProcessingState(false);
            this.convertBtn.disabled = false;
        } catch (error) {
            this.setProcessingState(false);
            this.showError('Upload failed: ' + error.message);
        }
    }

    showFileInfo(file) {
        if (!this.filePreview) return;

        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const videoInfo = document.getElementById('videoInfo');
        const videoPlayer = document.getElementById('videoPlayer');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

        // Show video preview
        if (videoPlayer) {
            const videoURL = URL.createObjectURL(file);
            videoPlayer.src = videoURL;
            videoPlayer.addEventListener('loadedmetadata', () => {
                this.videoDuration = videoPlayer.duration;
                const duration = this.formatDuration(videoPlayer.duration);
                const resolution = `${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`;
                
                if (videoInfo) {
                    // Clear existing content
                    videoInfo.textContent = '';
                    
                    // Create container div
                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'video-details';
                    
                    // Create duration span
                    const durationSpan = document.createElement('span');
                    durationSpan.className = 'detail-item';
                    durationSpan.textContent = `🎬 ${duration}`;
                    
                    // Create resolution span
                    const resolutionSpan = document.createElement('span');
                    resolutionSpan.className = 'detail-item';
                    resolutionSpan.textContent = `📐 ${resolution}`;
                    
                    // Create file size span
                    const fileSizeSpan = document.createElement('span');
                    fileSizeSpan.className = 'detail-item';
                    fileSizeSpan.textContent = `📊 ${this.formatFileSize(file.size)}`;
                    
                    // Append all elements
                    detailsDiv.appendChild(durationSpan);
                    detailsDiv.appendChild(resolutionSpan);
                    detailsDiv.appendChild(fileSizeSpan);
                    videoInfo.appendChild(detailsDiv);
                }
                
                // Update time inputs with video duration limits
                this.validateDuration();
                this.validateStartTime();
                
                // Clean up object URL after a delay
                setTimeout(() => URL.revokeObjectURL(videoURL), 1000);
            });
        }

        if (this.videoPreview) this.videoPreview.style.display = 'block';
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
    }

    async createGif() {
        if (!this.currentFile || this.isProcessing) return;

        // Validate inputs
        const startTime = parseFloat(this.startTime?.value || '0');
        const duration = parseFloat(this.duration?.value || '3');
        
        if (startTime + duration > this.videoDuration) {
            this.showError('Start time + duration cannot exceed video length.');
            return;
        }

        this.setProcessingState(true, 'Creating GIF...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getGifSettings();
            await this.performGifCreation(settings);
            
            this.showGifResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('GIF creation failed: ' + error.message);
            
            // Check if backend rejected specific options and remove them
            pruneOnBackendError(this.TOOL_KEY, error, document);
            checkAdvancedOptionsContainer();
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getGifSettings() {
        // Use the pruning utility to collect only existing options
        const optionSelectors = {
            start_time: '#startTime',
            duration: '#duration',
            fps: '#frameRate',
            quality: '#quality',
            width: '#width',
            loop: '#loop',
            boomerang: '#boomerang'
        };
        
        const settings = collectExistingOptions(optionSelectors);
        
        // Set defaults and parse values for missing options
        if (!settings.start_time) settings.start_time = '0';
        if (!settings.duration) settings.duration = '3';
        if (!settings.fps) settings.fps = '10';
        if (!settings.quality) settings.quality = 'medium';
        if (!settings.width) settings.width = '480';
        if (!settings.loop) settings.loop = true;
        if (!settings.boomerang) settings.boomerang = false;
        
        // Parse numeric values
        settings.start_time = parseFloat(settings.start_time);
        settings.duration = parseFloat(settings.duration);
        settings.fps = parseInt(settings.fps);
        if (settings.width !== 'original') {
            settings.width = parseInt(settings.width);
        }
        
        return settings;
    }

    async performGifCreation(settings) {
        this.showProgress(10);
        
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_to_gif',
                options: {
                    start_time: settings.start_time,
                    duration: settings.duration,
                    fps: settings.fps,
                    width: settings.width
                }
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'GIF creation failed');
        }

        this.conversionResult = await response.json();
        this.showProgress(100);
    }

    showGifResults() {
        if (!this.results) return;

        const gifPreview = document.getElementById('gifPreview');
        const gifStats = document.getElementById('gifStats');

        // Show GIF preview
        if (gifPreview && this.conversionResult.download_url) {
            // Clear previous content safely
            gifPreview.textContent = '';
            
            // Create container using safe DOM methods
            const container = document.createElement('div');
            container.className = 'gif-preview-container';
            
            const heading = document.createElement('h4');
            heading.textContent = 'GIF Preview';
            
            const img = document.createElement('img');
            img.src = this.conversionResult.download_url;
            img.alt = 'Generated GIF';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            img.style.marginTop = '10px';
            
            container.appendChild(heading);
            container.appendChild(img);
            gifPreview.appendChild(container);
        }

        // Show GIF stats
        if (gifStats && this.conversionResult) {
            const duration = parseFloat(this.duration?.value || '3');
            const fps = parseInt(this.frameRate?.value || '10');
            const width = this.width?.value === 'original' ? 'Original' : `${this.width?.value}px`;

            // Clear previous content safely
            gifStats.textContent = '';
            
            // Create stats grid using safe DOM methods
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';
            
            // Create stat items
            const statItems = [
                { label: 'Duration', value: `${duration}s` },
                { label: 'Frame Rate', value: `${fps} FPS` },
                { label: 'Width', value: width },
                { label: 'File Size', value: this.formatFileSize(this.conversionResult.file_size) }
            ];
            
            statItems.forEach(({ label, value }) => {
                const statItem = document.createElement('div');
                statItem.className = 'stat-item';
                
                const statLabel = document.createElement('span');
                statLabel.className = 'stat-label';
                statLabel.textContent = label;
                
                const statValue = document.createElement('span');
                statValue.className = 'stat-value';
                statValue.textContent = value;
                
                statItem.appendChild(statLabel);
                statItem.appendChild(statValue);
                statsGrid.appendChild(statItem);
            });
            
            gifStats.appendChild(statsGrid);
        }

        this.results.style.display = 'block';
    }

    validateDuration() {
        if (!this.duration || !this.startTime || this.videoDuration === 0) return;
        
        const startTime = parseFloat(this.startTime.value || '0');
        const duration = parseFloat(this.duration.value || '3');
        const maxDuration = this.videoDuration - startTime;
        
        if (duration > maxDuration) {
            this.duration.value = Math.max(0.5, maxDuration).toFixed(1);
        }
        
        // Update max attribute
        this.duration.max = maxDuration.toFixed(1);
    }

    validateStartTime() {
        if (!this.startTime || this.videoDuration === 0) return;
        
        const startTime = parseFloat(this.startTime.value || '0');
        const duration = parseFloat(this.duration?.value || '3');
        
        if (startTime >= this.videoDuration) {
            this.startTime.value = Math.max(0, this.videoDuration - duration).toFixed(1);
        }
        
        // Update max attribute
        this.startTime.max = (this.videoDuration - 0.5).toFixed(1);
        
        this.validateDuration();
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `${this.currentFile.name.split('.')[0]}.gif`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    setProcessingState(processing, message = '') {
        this.isProcessing = processing;
        
        // Create/update processing overlay
        let overlay = this.uploadArea.querySelector('.processing-overlay');
        if (processing) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'processing-overlay';
                this.uploadArea.appendChild(overlay);
            }
            // Create content safely using DOM methods
            const contentDiv = document.createElement('div');
            contentDiv.className = 'processing-content';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            
            const messageP = document.createElement('p');
            messageP.textContent = message;
            
            contentDiv.appendChild(spinner);
            contentDiv.appendChild(messageP);
            
            // Clear and append new content
            overlay.innerHTML = '';
            overlay.appendChild(contentDiv);
            overlay.style.display = 'flex';
            
            // Disable upload area interactions
            this.uploadArea.style.pointerEvents = 'none';
            this.uploadArea.style.opacity = '0.7';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
            // Re-enable upload area interactions
            this.uploadArea.style.pointerEvents = 'auto';
            this.uploadArea.style.opacity = '1';
        }
        
        // Update convert button
        if (this.convertBtn) {
            this.convertBtn.disabled = processing || !this.currentFile;
            const btnText = this.convertBtn.querySelector('.btn-text');
            const btnLoader = this.convertBtn.querySelector('.btn-loader');
            
            if (btnText) btnText.style.display = processing ? 'none' : 'inline';
            if (btnLoader) btnLoader.style.display = processing ? 'inline-block' : 'none';
        }
    }

    showProgress(percent) {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'block';
            if (this.progressFill) {
                this.progressFill.style.width = `${percent}%`;
            }
            if (this.progressText) {
                this.progressText.textContent = `${percent}%`;
            }
        }
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }

    showError(message) {
        // Show error message inline
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            this.uploadArea.parentNode.insertBefore(errorDiv, this.uploadArea.nextSibling);
        }
        
        // Create safe DOM structure to prevent XSS
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        
        // Create SVG icon safely
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '15');
        line1.setAttribute('y1', '9');
        line1.setAttribute('x2', '9');
        line1.setAttribute('y2', '15');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '9');
        line2.setAttribute('y1', '9');
        line2.setAttribute('x2', '15');
        line2.setAttribute('y2', '15');
        
        svg.appendChild(circle);
        svg.appendChild(line1);
        svg.appendChild(line2);
        
        // Create text span safely using textContent
        const span = document.createElement('span');
        span.textContent = message; // Safe - prevents XSS
        
        // Assemble the structure
        errorContent.appendChild(svg);
        errorContent.appendChild(span);
        
        // Clear and set new content safely
        errorDiv.textContent = ''; // Clear existing content
        errorDiv.appendChild(errorContent);
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.style.display = 'none';
        }, 5000);
    }

    trackConversion() {
        // Analytics tracking for conversion
        if (window.gtag) {
            gtag('event', 'conversion', {
                event_category: 'GIF Maker',
                event_label: `${this.frameRate?.value}fps`
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GifMaker();
});