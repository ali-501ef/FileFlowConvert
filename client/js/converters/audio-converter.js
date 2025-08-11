/**
 * Audio Converter
 * Converts between different audio formats with advanced options
 */
class AudioConverter {
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
        this.outputFormat = document.getElementById('outputFormat');
        this.audioQuality = document.getElementById('audioQuality');
        this.sampleRate = document.getElementById('sampleRate');
        this.preserveMetadata = document.getElementById('preserveMetadata');
        
        // Initialize with default values
        if (this.outputFormat) this.outputFormat.value = 'mp3';
        if (this.audioQuality) this.audioQuality.value = '192';
        if (this.sampleRate) this.sampleRate.value = 'keep';
        if (this.preserveMetadata) this.preserveMetadata.checked = true;
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
            this.convertBtn.addEventListener('click', () => this.convertAudio());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

        // Format change handler (removed bitrate update since audioQuality is now static)
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
        if (!file.type.startsWith('audio/')) {
            this.showError('Please select an audio file.');
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
        const audioInfo = document.getElementById('audioInfo');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

        // Show audio preview
        if (audioInfo) {
            // Clear existing content
            audioInfo.innerHTML = '';
            
            // Create container
            const container = document.createElement('div');
            container.className = 'audio-preview-container';
            
            // Create title
            const title = document.createElement('h4');
            title.textContent = 'Current Audio';
            container.appendChild(title);
            
            // Create audio element
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.style.width = '100%';
            audio.style.marginTop = '10px';
            
            const source = document.createElement('source');
            source.src = URL.createObjectURL(file);
            source.type = file.type;
            audio.appendChild(source);
            
            // Fallback text
            audio.appendChild(document.createTextNode('Your browser does not support the audio element.'));
            container.appendChild(audio);
            
            // Create details section
            const details = document.createElement('div');
            details.className = 'audio-details';
            
            // Format type span
            const typeSpan = document.createElement('span');
            typeSpan.className = 'detail-item';
            typeSpan.textContent = `🎵 ${file.type.split('/')[1]?.toUpperCase()}`;
            details.appendChild(typeSpan);
            
            // Size span
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'detail-item';
            sizeSpan.textContent = `📊 ${this.formatFileSize(file.size)}`;
            details.appendChild(sizeSpan);
            
            container.appendChild(details);
            audioInfo.appendChild(container);
        }

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

    async convertAudio() {
        if (!this.currentFile || this.isProcessing) return;

        this.setProcessingState(true, 'Converting audio...');
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
            format: this.outputFormat?.value || 'mp3',
            bitrate: this.audioQuality?.value || '192',
            sample_rate: this.sampleRate?.value === 'keep' ? undefined : this.sampleRate?.value,
            quality: this.audioQuality?.value || '192',
            preserve_metadata: this.preserveMetadata?.checked || false
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
                conversion_type: 'audio_convert',
                options: {
                    format: settings.format,
                    bitrate: settings.bitrate,
                    sample_rate: settings.sample_rate,
                    preserve_metadata: settings.preserve_metadata
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
            
            // Create stats grid using safe DOM methods
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';
            
            // Format stat
            const formatItem = document.createElement('div');
            formatItem.className = 'stat-item';
            const formatLabel = document.createElement('span');
            formatLabel.className = 'stat-label';
            formatLabel.textContent = 'Format';
            const formatValue = document.createElement('span');
            formatValue.className = 'stat-value';
            formatValue.textContent = (this.outputFormat?.value?.toUpperCase() || 'MP3');
            formatItem.appendChild(formatLabel);
            formatItem.appendChild(formatValue);
            
            // Bitrate stat
            const bitrateItem = document.createElement('div');
            bitrateItem.className = 'stat-item';
            const bitrateLabel = document.createElement('span');
            bitrateLabel.className = 'stat-label';
            bitrateLabel.textContent = 'Bitrate';
            const bitrateValue = document.createElement('span');
            bitrateValue.className = 'stat-value';
            bitrateValue.textContent = `${this.audioQuality?.value || '192'} kbps`;
            bitrateItem.appendChild(bitrateLabel);
            bitrateItem.appendChild(bitrateValue);
            
            // Size stat
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
            
            statsGrid.appendChild(formatItem);
            statsGrid.appendChild(bitrateItem);
            statsGrid.appendChild(sizeItem);
            audioStats.appendChild(statsGrid);
        }

        // Show audio preview
        if (audioPreview && this.conversionResult.download_url) {
            // Clear existing content
            audioPreview.textContent = '';
            
            // Create audio preview using safe DOM methods
            const container = document.createElement('div');
            container.className = 'audio-preview-container';
            
            const title = document.createElement('h4');
            title.textContent = 'Converted Audio';
            
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.style.width = '100%';
            audio.style.marginTop = '10px';
            
            const source = document.createElement('source');
            // Validate URL is from our domain/server for security
            if (this.conversionResult.download_url.startsWith('/api/download/') || 
                this.conversionResult.download_url.startsWith('./output/') ||
                this.conversionResult.download_url.startsWith('/output/')) {
                source.src = this.conversionResult.download_url;
            }
            source.type = `audio/${this.outputFormat?.value || 'mp3'}`;
            
            audio.appendChild(source);
            audio.appendChild(document.createTextNode('Your browser does not support the audio element.'));
            
            container.appendChild(title);
            container.appendChild(audio);
            audioPreview.appendChild(container);
        }

        this.results.style.display = 'block';
    }



    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `${this.currentFile.name.split('.')[0]}.${this.outputFormat?.value || 'mp3'}`;
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
            // Clear and create processing content safely
            overlay.textContent = '';
            const content = document.createElement('div');
            content.className = 'processing-content';
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            const text = document.createElement('p');
            text.textContent = message;
            content.appendChild(spinner);
            content.appendChild(text);
            overlay.appendChild(content);
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
        
        // Clear and create error content safely
        errorDiv.textContent = '';
        const content = document.createElement('div');
        content.className = 'error-content';
        
        // Create error icon SVG
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
        
        const span = document.createElement('span');
        span.textContent = message;
        
        content.appendChild(svg);
        content.appendChild(span);
        errorDiv.appendChild(content);
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
                event_category: 'Audio Convert',
                event_label: this.outputFormat?.value || 'mp3'
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
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioConverter();
});