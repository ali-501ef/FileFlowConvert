

import { pruneByMatrix, bindOrPrune, pruneOnBackendError, checkAdvancedOptionsContainer, collectExistingOptions } from "../utils/pruneOptions.js";

/**
 * Video Compressor
 * Compresses video files with quality and size optimization
 */
class VideoCompressor {
    constructor() {
        this.currentFile = null;
        this.uploadResult = null;
        this.isFilePickerOpen = false;
        this.isProcessing = false;
        this.TOOL_KEY = "video-compress";
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
        this.compressionLevel = null;
        this.videoQuality = null;
        this.outputResolution = null;
        this.frameRate = null;
        this.targetSize = null;

        // Guarantee the upload area is clickable
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (uploadArea && fileInput) {
            uploadArea.style.position = 'relative'; // safety
            uploadArea.addEventListener('click', (e) => {
                // don't trigger if user clicked the hidden input itself
                if (!(e.target instanceof HTMLInputElement)) fileInput.click();
            });
        }
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
            this.convertBtn.addEventListener('click', () => this.compressVideo());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

    }

    initAdvancedOptionsPruning() {
        // Remove unsupported options first
        pruneByMatrix(this.TOOL_KEY, document);
        
        // Safely bind each advanced option
        bindOrPrune(this.TOOL_KEY, "targetBitrate", "#compressionLevel", (el) => {
            this.compressionLevel = el;
            el.value = 'medium';
            el.addEventListener("change", () => this.updateQualityOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "scale", "#videoQuality", (el) => {
            this.videoQuality = el;
            el.value = 'balanced';
            el.addEventListener("change", () => this.validateVideoOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "fps", "#outputResolution", (el) => {
            this.outputResolution = el;
            el.value = 'original';
            el.addEventListener("change", () => this.validateVideoOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "fps", "#frameRate", (el) => {
            this.frameRate = el;
            el.value = 'original';
            el.addEventListener("change", () => this.validateVideoOptions());
        });
        
        bindOrPrune(this.TOOL_KEY, "profile", "#targetSize", (el) => {
            this.targetSize = el;
            el.value = '';
            el.addEventListener("change", () => this.validateVideoOptions());
        });
        
        // Check if advanced options container should be hidden
        checkAdvancedOptionsContainer();
        
        console.info(`[Options] ${this.TOOL_KEY}: Advanced options initialization complete`);
    }

    validateVideoOptions() {
        // Basic validation for existing options
        if (this.targetSize && this.targetSize.value) {
            const sizeValue = parseFloat(this.targetSize.value);
            if (sizeValue <= 0) {
                this.targetSize.setCustomValidity('Target size must be greater than 0');
            } else {
                this.targetSize.setCustomValidity('');
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

        // Add video preview
        const previewSlot = document.getElementById('videoPreviewSlot');
        if (previewSlot && file && file.type.startsWith('video/')) {
            window.mountVideoPreview({ container: previewSlot, file, autoplay: false });
        }

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
                const duration = this.formatDuration(videoPlayer.duration);
                const resolution = `${videoPlayer.videoWidth}x${videoPlayer.videoHeight}`;
                
                if (videoInfo) {
                    // Clear existing content
                    videoInfo.textContent = '';
                    
                    // Create container safely
                    const videoDetailsDiv = document.createElement('div');
                    videoDetailsDiv.className = 'video-details';
                    
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
                    
                    // Append all elements safely
                    videoDetailsDiv.appendChild(durationSpan);
                    videoDetailsDiv.appendChild(resolutionSpan);
                    videoDetailsDiv.appendChild(fileSizeSpan);
                    videoInfo.appendChild(videoDetailsDiv);
                }
                
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

    async compressVideo() {
        if (!this.currentFile || this.isProcessing) return;

        this.setProcessingState(true, 'Compressing video...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getCompressionSettings();
            await this.performCompression(settings);
            
            this.showCompressionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Compression failed: ' + error.message);
            
            // Check if backend rejected specific options and remove them
            pruneOnBackendError(this.TOOL_KEY, error, document);
            checkAdvancedOptionsContainer();
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getCompressionSettings() {
        // Use the pruning utility to collect only existing options
        const optionSelectors = {
            compression: '#compressionLevel',
            quality: '#videoQuality',
            resolution: '#outputResolution',
            framerate: '#frameRate',
            target_size: '#targetSize'
        };
        
        const settings = collectExistingOptions(optionSelectors);
        
        // Set defaults for missing options
        if (!settings.compression) settings.compression = 'medium';
        if (!settings.quality) settings.quality = 'balanced';
        if (!settings.resolution) settings.resolution = 'original';
        if (settings.framerate === 'original') settings.framerate = undefined;
        
        return settings;
    }

    async performCompression(settings) {
        this.showProgress(10);
        
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: this.uploadResult.file_id,
                conversion_type: 'video_compress',
                options: {
                    compression: settings.compression,
                    resolution: settings.resolution,
                    framerate: settings.framerate,
                    format: 'mp4'
                }
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Compression failed');
        }

        this.conversionResult = await response.json();
        this.showProgress(100);
    }

    showCompressionResults() {
        if (!this.results) return;

        const videoStats = document.getElementById('videoStats');

        // Show compression stats
        if (videoStats && this.conversionResult) {
            const originalSize = this.currentFile.size;
            const compressedSize = this.conversionResult.file_size;
            const compressionRatio = this.conversionResult.compression_ratio || 
                Math.round((1 - compressedSize/originalSize) * 100);

            // Clear existing content safely
            videoStats.textContent = '';
            
            // Create stats grid container
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';
            
            // Create original size stat
            const originalStat = document.createElement('div');
            originalStat.className = 'stat-item';
            
            const originalLabel = document.createElement('span');
            originalLabel.className = 'stat-label';
            originalLabel.textContent = 'Original Size';
            
            const originalValue = document.createElement('span');
            originalValue.className = 'stat-value';
            originalValue.textContent = this.formatFileSize(originalSize);
            
            originalStat.appendChild(originalLabel);
            originalStat.appendChild(originalValue);
            
            // Create compressed size stat
            const compressedStat = document.createElement('div');
            compressedStat.className = 'stat-item';
            
            const compressedLabel = document.createElement('span');
            compressedLabel.className = 'stat-label';
            compressedLabel.textContent = 'Compressed Size';
            
            const compressedValue = document.createElement('span');
            compressedValue.className = 'stat-value';
            compressedValue.textContent = this.formatFileSize(compressedSize);
            
            compressedStat.appendChild(compressedLabel);
            compressedStat.appendChild(compressedValue);
            
            // Create space saved stat
            const savedStat = document.createElement('div');
            savedStat.className = 'stat-item';
            
            const savedLabel = document.createElement('span');
            savedLabel.className = 'stat-label';
            savedLabel.textContent = 'Space Saved';
            
            const savedValue = document.createElement('span');
            savedValue.className = 'stat-value';
            savedValue.textContent = String(compressionRatio) + '%';
            
            savedStat.appendChild(savedLabel);
            savedStat.appendChild(savedValue);
            
            // Append all stats to grid
            statsGrid.appendChild(originalStat);
            statsGrid.appendChild(compressedStat);
            statsGrid.appendChild(savedStat);
            
            // Append grid to container
            videoStats.appendChild(statsGrid);
        }

        this.results.style.display = 'block';
    }

    updateQualityOptions() {
        // Update quality recommendations based on compression level
        const level = this.compressionLevel?.value;
        const qualitySelect = this.videoQuality;
        
        if (qualitySelect) {
            const currentValue = qualitySelect.value;
            
            // Clear existing options safely
            while (qualitySelect.firstChild) {
                qualitySelect.removeChild(qualitySelect.firstChild);
            }
            
            let options = [];
            if (level === 'light') {
                options = [
                    { value: 'high', text: 'High Quality', selected: false },
                    { value: 'balanced', text: 'Balanced', selected: true }
                ];
            } else if (level === 'medium') {
                options = [
                    { value: 'balanced', text: 'Balanced', selected: true },
                    { value: 'good', text: 'Good', selected: false }
                ];
            } else if (level === 'heavy') {
                options = [
                    { value: 'good', text: 'Good', selected: false },
                    { value: 'acceptable', text: 'Acceptable', selected: true }
                ];
            }
            
            // Create options using safe DOM methods
            options.forEach(optionData => {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.text;
                if (optionData.selected) {
                    option.selected = true;
                }
                qualitySelect.appendChild(option);
            });
            
            // Restore previous value if available
            if (qualitySelect.querySelector(`option[value="${currentValue}"]`)) {
                qualitySelect.value = currentValue;
            }
        }
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `compressed_${this.currentFile.name}`;
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
            
            // Clear existing content safely
            overlay.textContent = '';
            
            // Create processing content structure
            const processingContent = document.createElement('div');
            processingContent.className = 'processing-content';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            
            const messageP = document.createElement('p');
            messageP.textContent = message;
            
            processingContent.appendChild(spinner);
            processingContent.appendChild(messageP);
            overlay.appendChild(processingContent);
            
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
        
        // Clear existing content
        errorDiv.innerHTML = '';
        
        // Create error content container
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        
        // Create SVG icon
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
        
        // Create message span with safe text content
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message; // Safe - automatically escapes HTML
        
        // Assemble the error content
        errorContent.appendChild(svg);
        errorContent.appendChild(messageSpan);
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
                event_category: 'Video Compress',
                event_label: this.compressionLevel?.value || 'medium'
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
    new VideoCompressor();
});