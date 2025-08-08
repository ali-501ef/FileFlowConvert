class AudioConverter {
    constructor() {
        this.init();
        this.setupEventListeners();
        
        // Initialize Advanced Options Manager
        this.optionsManager = window.createAdvancedOptionsManager('audio-converter');
        
        // Link with the legacy advanced options handler
        if (window.advancedOptionsHandler) {
            window.advancedOptionsHandler.setOptionsManager(this.optionsManager);
        }
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.audioPreview = document.getElementById('audioPreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.outputFormat = document.getElementById('outputFormat');
        this.audioQuality = document.getElementById('audioQuality');
        this.customBitrateGroup = document.getElementById('customBitrateGroup');
        this.customBitrate = document.getElementById('customBitrate');
        
        this.currentFile = null;
        this.outputBlob = null;
    }

    setupEventListeners() {
        // Standardized file input handling (prevents duplicate dialogs)
        this.fileInputCleanup = window.FileInputUtils.bindFileInputHandler(
            this.fileInput,
            this.handleFile.bind(this),
            { accept: 'audio/*' }
        );
        
        // Convert button
        this.convertBtn.addEventListener('click', this.convertAudio.bind(this));
        
        // Quality setting change
        this.audioQuality.addEventListener('change', this.handleQualityChange.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadAudio.bind(this));
    }

    // File handling methods removed - now handled by standardized FileInputUtils

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        // Load audio for preview and info
        const url = URL.createObjectURL(file);
        this.audioPreview.src = url;
        
        this.audioPreview.onloadedmetadata = () => {
            const duration = this.formatDuration(this.audioPreview.duration);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            document.getElementById('audioInfo').innerHTML = `
                <div class="audio-details">
                    <span class="detail-item">🎵 ${fileExtension.toUpperCase()}</span>
                    <span class="detail-item">⏱️ ${duration}</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
        };
        
        this.convertBtn.disabled = false;
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
    }

    handleQualityChange() {
        const isCustom = this.audioQuality.value === 'custom';
        this.customBitrateGroup.style.display = isCustom ? 'block' : 'none';
    }

    async convertAudio() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.results.style.display = 'none';
        
        // Clear any previous validation errors
        if (this.optionsManager) {
            this.optionsManager.hideValidationErrors();
        }

        try {
            // Get conversion settings with validation
            const settings = this.getConversionSettings();
            
            // Perform the conversion using Web Audio API
            await this.performConversion(settings);
            
            this.showResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to convert audio: ' + error.message);
        }

        this.showLoading(false);
    }

    getConversionSettings() {
        // Use the options manager to collect and validate settings
        if (this.optionsManager) {
            const validation = this.optionsManager.validateOptions();
            if (!validation.isValid) {
                this.optionsManager.showValidationErrors(validation.errors);
                throw new Error(`Invalid options: ${validation.errors.join(', ')}`);
            }
            const options = this.optionsManager.collectOptions();
            
            // Process quality to bitrate mapping
            let bitrate;
            switch (options.audioQuality) {
                case 'high':
                    bitrate = 320;
                    break;
                case 'medium':
                    bitrate = 192;
                    break;
                case 'standard':
                    bitrate = 128;
                    break;
                case 'custom':
                    bitrate = parseInt(options.customBitrate);
                    break;
                default:
                    bitrate = 192;
            }
            
            return {
                format: options.outputFormat,
                bitrate,
                sampleRate: options.sampleRate === 'keep' ? null : parseInt(options.sampleRate),
                preserveMetadata: options.preserveMetadata
            };
        }
        
        // Fallback to manual collection if manager not available
        const format = this.outputFormat.value;
        const quality = this.audioQuality.value;
        const sampleRate = document.getElementById('sampleRate').value;
        const preserveMetadata = document.getElementById('preserveMetadata').checked;
        
        let bitrate;
        switch (quality) {
            case 'high':
                bitrate = 320;
                break;
            case 'medium':
                bitrate = 192;
                break;
            case 'standard':
                bitrate = 128;
                break;
            case 'custom':
                bitrate = parseInt(this.customBitrate.value);
                break;
        }
        
        return {
            format,
            bitrate,
            sampleRate: sampleRate === 'keep' ? null : parseInt(sampleRate),
            preserveMetadata
        };
    }

    async performConversion(settings) {
        try {
            // Upload file first
            const formData = new FormData();
            formData.append('file', this.currentFile);
            
            this.showProgress(20);
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }
            
            const uploadResult = await uploadResponse.json();
            this.showProgress(50);
            
            // Convert with server-side processing
            const convertResponse = await fetch('/api/convert-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_id: uploadResult.file_id,
                    conversion_type: 'audio_convert',
                    options: {
                        format: settings.format,
                        bitrate: settings.bitrate,
                        sample_rate: settings.sampleRate
                    }
                })
            });
            
            this.showProgress(90);
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Conversion failed');
            }
            
            const result = await convertResponse.json();
            this.showProgress(100);
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
        } catch (error) {
            throw new Error(`Audio conversion failed: ${error.message}`);
        }
    }

    async encodeAudioBuffer(audioBuffer, settings) {
        // This is a simplified approach for demonstration
        // Real audio conversion would require libraries like lamejs for MP3, etc.
        
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            settings.sampleRate || audioBuffer.sampleRate
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV format (simplified)
        const wavData = this.audioBufferToWav(renderedBuffer);
        
        // Create blob with appropriate MIME type
        const mimeType = this.getMimeType(settings.format);
        this.outputBlob = new Blob([wavData], { type: mimeType });
    }

    audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, arrayBuffer.byteLength - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);
        
        // Audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        return arrayBuffer;
    }

    getMimeType(format) {
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg'
        };
        return mimeTypes[format] || 'audio/wav';
    }

    showResults() {
        this.results.style.display = 'block';
    }

    downloadAudio() {
        if (this.outputBlob) {
            const format = this.outputFormat.value;
            const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}.${format}`;
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = fileName;
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'Media Tools',
                'event_label': 'Audio Converter',
                'value': 1
            });
        }
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
            this.convertBtn.disabled = false;
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

// Initialize the audio converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioConverter();
});