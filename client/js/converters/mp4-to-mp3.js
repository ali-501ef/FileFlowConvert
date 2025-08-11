

/**
 * MP4 to MP3 Converter
 * Converts video files to audio format with advanced options
 */
class MP4ToMP3Converter {
    constructor() {
        this.currentFile = null;
        this.uploadResult = null;
        this.isFilePickerOpen = false;
        this.isProcessing = false;
        this.init();
        this.setupEventListeners();
    }

    init() {
        // DOM element references
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Advanced options
        this.audioBitrate = document.getElementById('audioBitrate');
        this.audioFormat = document.getElementById('audioFormat');
        this.preserveMetadata = document.getElementById('preserveMetadata');
        this.normalizeAudio = document.getElementById('normalizeAudio');
        
        // Initialize with default values
        if (this.audioBitrate) this.audioBitrate.value = '192';
        if (this.audioFormat) this.audioFormat.value = 'mp3';
        if (this.preserveMetadata) this.preserveMetadata.checked = true;
        if (this.normalizeAudio) this.normalizeAudio.checked = false;

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
            this.convertBtn.addEventListener('click', () => this.convertToMP3());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
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

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

        // Get video metadata
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.addEventListener('loadedmetadata', () => {
            const duration = this.formatDuration(video.duration);
            const resolution = `${video.videoWidth}x${video.videoHeight}`;
            
            if (videoInfo) {
                // Clear existing content
                videoInfo.textContent = '';
                
                // Create container div
                const videoDetails = document.createElement('div');
                videoDetails.className = 'video-details';
                
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
                videoDetails.appendChild(durationSpan);
                videoDetails.appendChild(resolutionSpan);
                videoDetails.appendChild(fileSizeSpan);
                videoInfo.appendChild(videoDetails);
            }
            
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
    }

    async convertToMP3() {
        if (!this.currentFile || this.isProcessing) return;

        this.setProcessingState(true, 'Converting to MP3...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getConversionSettings();
            await this.performConversion(settings);
            
            this.showConversionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Conversion failed: ' + error.message);
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getConversionSettings() {
        return {
            bitrate: this.audioBitrate?.value || '192',
            format: this.audioFormat?.value || 'mp3',
            preserveMetadata: this.preserveMetadata?.checked || false,
            normalizeAudio: this.normalizeAudio?.checked || false
        };
    }

    async performConversion(settings) {
        this.showProgress(10);
        
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
                    preserve_metadata: settings.preserveMetadata
                }
            })
        });

        this.showProgress(50);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        this.conversionResult = await response.json();
        this.showProgress(100);
    }

    showConversionResults() {
        if (!this.results) return;

        const audioStats = document.getElementById('audioStats');
        const audioPreview = document.getElementById('audioPreview');

        // Show file stats
        if (audioStats && this.conversionResult) {
            // Clear existing content
            audioStats.textContent = '';
            
            // Create stats container using safe DOM methods
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';
            
            // Format stat item
            const formatItem = document.createElement('div');
            formatItem.className = 'stat-item';
            const formatLabel = document.createElement('span');
            formatLabel.className = 'stat-label';
            formatLabel.textContent = 'Format';
            const formatValue = document.createElement('span');
            formatValue.className = 'stat-value';
            formatValue.textContent = this.audioFormat?.value?.toUpperCase() || 'MP3';
            formatItem.appendChild(formatLabel);
            formatItem.appendChild(formatValue);
            
            // Bitrate stat item
            const bitrateItem = document.createElement('div');
            bitrateItem.className = 'stat-item';
            const bitrateLabel = document.createElement('span');
            bitrateLabel.className = 'stat-label';
            bitrateLabel.textContent = 'Bitrate';
            const bitrateValue = document.createElement('span');
            bitrateValue.className = 'stat-value';
            bitrateValue.textContent = `${this.audioBitrate?.value || '192'} kbps`;
            bitrateItem.appendChild(bitrateLabel);
            bitrateItem.appendChild(bitrateValue);
            
            // Size stat item
            const sizeItem = document.createElement('div');
            sizeItem.className = 'stat-item';
            const sizeLabel = document.createElement('span');
            sizeLabel.className = 'stat-label';
            sizeLabel.textContent = 'Size';
            const sizeValue = document.createElement('span');
            sizeValue.className = 'stat-value';
            sizeValue.textContent = this.formatFileSize(this.conversionResult.file_size);
            sizeItem.appendChild(sizeLabel);
            sizeItem.appendChild(sizeValue);
            
            // Append all items to grid
            statsGrid.appendChild(formatItem);
            statsGrid.appendChild(bitrateItem);
            statsGrid.appendChild(sizeItem);
            
            // Append grid to container
            audioStats.appendChild(statsGrid);
        }

        // Show audio preview
        if (audioPreview && this.conversionResult.download_url) {
            // Clear existing content
            audioPreview.textContent = '';
            
            // Create preview container using safe DOM methods
            const previewContainer = document.createElement('div');
            previewContainer.className = 'audio-preview-container';
            
            // Create title
            const title = document.createElement('h4');
            title.textContent = 'Audio Preview';
            
            // Create audio element
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.style.width = '100%';
            audio.style.marginTop = '10px';
            
            // Create source element
            const source = document.createElement('source');
            source.src = this.conversionResult.download_url;
            source.type = `audio/${this.audioFormat?.value || 'mp3'}`;
            
            // Create fallback text
            const fallbackText = document.createTextNode('Your browser does not support the audio element.');
            
            // Append elements
            audio.appendChild(source);
            audio.appendChild(fallbackText);
            previewContainer.appendChild(title);
            previewContainer.appendChild(audio);
            audioPreview.appendChild(previewContainer);
        }

        this.results.style.display = 'block';
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `${this.currentFile.name.split('.')[0]}.${this.audioFormat?.value || 'mp3'}`;
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
            // Clear and create processing content using safe DOM methods
            overlay.textContent = '';
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
        
        // Clear and create error content using safe DOM methods
        errorDiv.textContent = '';
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        
        // Create SVG icon using DOM methods
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
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
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
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
                event_category: 'MP4 to MP3',
                event_label: this.audioFormat?.value || 'mp3'
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
    new MP4ToMP3Converter();
});