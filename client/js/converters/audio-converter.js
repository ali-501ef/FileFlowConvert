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
        this.audioBitrate = document.getElementById('audioBitrate');
        this.sampleRate = document.getElementById('sampleRate');
        this.audioQuality = document.getElementById('audioQuality');
        this.preserveMetadata = document.getElementById('preserveMetadata');
        
        // Initialize with default values
        if (this.outputFormat) this.outputFormat.value = 'mp3';
        if (this.audioBitrate) this.audioBitrate.value = '192';
        if (this.sampleRate) this.sampleRate.value = 'keep';
        if (this.audioQuality) this.audioQuality.value = 'standard';
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

        // Format change handler
        if (this.outputFormat) {
            this.outputFormat.addEventListener('change', () => this.updateBitrateOptions());
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
            audioInfo.innerHTML = `
                <div class="audio-preview-container">
                    <h4>Current Audio</h4>
                    <audio controls style="width: 100%; margin-top: 10px;">
                        <source src="${URL.createObjectURL(file)}" type="${file.type}">
                        Your browser does not support the audio element.
                    </audio>
                    <div class="audio-details">
                        <span class="detail-item">🎵 ${file.type.split('/')[1]?.toUpperCase()}</span>
                        <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
            `;
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
            bitrate: this.audioBitrate?.value || '192',
            sample_rate: this.sampleRate?.value === 'keep' ? undefined : this.sampleRate?.value,
            quality: this.audioQuality?.value || 'standard',
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
            audioStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Format</span>
                        <span class="stat-value">${this.outputFormat?.value?.toUpperCase() || 'MP3'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bitrate</span>
                        <span class="stat-value">${this.audioBitrate?.value || '192'} kbps</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Size</span>
                        <span class="stat-value">${this.formatFileSize(this.conversionResult.file_size)}</span>
                    </div>
                </div>
            `;
        }

        // Show audio preview
        if (audioPreview && this.conversionResult.download_url) {
            audioPreview.innerHTML = `
                <div class="audio-preview-container">
                    <h4>Converted Audio</h4>
                    <audio controls style="width: 100%; margin-top: 10px;">
                        <source src="${this.conversionResult.download_url}" type="audio/${this.outputFormat?.value || 'mp3'}">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
        }

        this.results.style.display = 'block';
    }

    updateBitrateOptions() {
        if (!this.audioBitrate || !this.outputFormat) return;
        
        const format = this.outputFormat.value;
        const bitrateSelect = this.audioBitrate;
        
        // Clear existing options
        bitrateSelect.innerHTML = '';
        
        let bitrates = [];
        if (format === 'mp3') {
            bitrates = ['96', '128', '192', '256', '320'];
        } else if (format === 'aac') {
            bitrates = ['96', '128', '192', '256'];
        } else if (format === 'ogg') {
            bitrates = ['96', '128', '192', '256', '320'];
        } else if (format === 'wav') {
            // WAV is lossless, no bitrate options
            bitrateSelect.innerHTML = '<option value="lossless">Lossless</option>';
            bitrateSelect.disabled = true;
            return;
        } else if (format === 'flac') {
            // FLAC is lossless, no bitrate options
            bitrateSelect.innerHTML = '<option value="lossless">Lossless</option>';
            bitrateSelect.disabled = true;
            return;
        }
        
        bitrateSelect.disabled = false;
        bitrates.forEach(bitrate => {
            const option = document.createElement('option');
            option.value = bitrate;
            option.textContent = `${bitrate} kbps`;
            if (bitrate === '192') option.selected = true;
            bitrateSelect.appendChild(option);
        });
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
            overlay.innerHTML = `
                <div class="processing-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
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
        
        errorDiv.innerHTML = `
            <div class="error-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>${message}</span>
            </div>
        `;
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