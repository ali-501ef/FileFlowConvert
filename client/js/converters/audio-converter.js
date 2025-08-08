/**
 * Audio Converter - Multi-format Audio Conversion Tool
 * Uses shared components and follows the PDF Compress pattern
 */
class AudioConverter {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupComponents();
    }

    init() {
        this.currentFile = null;
        this.outputBlob = null;
        this.conversionStats = null;
        
        // Initialize DOM elements
        this.filePreview = document.getElementById('filePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.audioQuality = document.getElementById('audioQuality');
        this.customBitrateGroup = document.getElementById('customBitrateGroup');
    }

    setupComponents() {
        // Initialize shared components
        this.uploader = new FileUploader({
            uploadAreaId: 'uploadArea',
            fileInputId: 'fileInput',
            acceptedTypes: ['audio/*'],
            multiple: false,
            onFileSelect: this.handleFile.bind(this)
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
        // Convert button
        this.convertBtn.addEventListener('click', this.convertAudio.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadAudio.bind(this));
        
        // Quality setting change
        this.audioQuality.addEventListener('change', this.handleQualityChange.bind(this));
    }

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        // Load audio metadata
        try {
            const metadata = await this.getAudioMetadata(file);
            this.displayAudioInfo(metadata);
            this.convertBtn.disabled = false;
        } catch (error) {
            this.errorDisplay.showError('Failed to load audio metadata');
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = FileUtils.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        
        // Set up audio preview
        const audioPreview = document.getElementById('audioPreview');
        audioPreview.src = URL.createObjectURL(file);
    }

    async getAudioMetadata(file) {
        return new Promise((resolve, reject) => {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';
            
            audio.onloadedmetadata = () => {
                const metadata = {
                    duration: audio.duration,
                    sampleRate: audio.sampleRate || 'Unknown'
                };
                URL.revokeObjectURL(audio.src);
                resolve(metadata);
            };
            
            audio.onerror = () => {
                URL.revokeObjectURL(audio.src);
                reject(new Error('Invalid audio file'));
            };
            
            audio.src = URL.createObjectURL(file);
        });
    }

    displayAudioInfo(metadata) {
        const duration = FileUtils.formatDuration(metadata.duration);
        const fileExtension = this.currentFile.name.split('.').pop().toLowerCase();
        const fileSize = FileUtils.formatFileSize(this.currentFile.size);
        
        document.getElementById('audioInfo').innerHTML = `
            <div class="audio-details">
                <span class="detail-item">🎵 ${fileExtension.toUpperCase()}</span>
                <span class="detail-item">⏱️ ${duration}</span>
                <span class="detail-item">📊 ${fileSize}</span>
            </div>
        `;
    }

    handleQualityChange() {
        const isCustom = this.audioQuality.value === 'custom';
        this.customBitrateGroup.style.display = isCustom ? 'block' : 'none';
    }

    async convertAudio() {
        if (!this.currentFile) return;

        this.buttonLoader.showLoading();
        this.progress.show(0, 'Preparing conversion...');
        this.results.style.display = 'none';

        try {
            const settings = this.getConversionSettings();
            await this.performConversion(settings);
            this.showConversionResults();
            AnalyticsTracker.trackConversion('Media Tools', 'Audio Converter');
            
        } catch (error) {
            this.errorDisplay.showError('Failed to convert audio: ' + error.message);
        }

        this.progress.hide();
        this.buttonLoader.hideLoading();
    }

    getConversionSettings() {
        const quality = this.audioQuality.value;
        let bitrate;
        
        switch (quality) {
            case 'standard':
                bitrate = 128;
                break;
            case 'medium':
                bitrate = 192;
                break;
            case 'high':
                bitrate = 320;
                break;
            case 'custom':
                bitrate = parseInt(document.getElementById('customBitrate').value);
                break;
            default:
                bitrate = 192;
        }
        
        return {
            outputFormat: document.getElementById('outputFormat').value,
            bitrate: bitrate,
            sampleRate: document.getElementById('sampleRate').value,
            preserveMetadata: document.getElementById('preserveMetadata').checked,
            normalizeAudio: document.getElementById('normalizeAudio')?.checked || false
        };
    }

    async performConversion(settings) {
        try {
            // Upload file first
            const formData = new FormData();
            formData.append('file', this.currentFile);
            
            this.progress.updateProgress(10, 'Uploading audio...');
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }
            
            const uploadResult = await uploadResponse.json();
            this.progress.updateProgress(30, 'Processing audio...');
            
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
                        format: settings.outputFormat,
                        bitrate: settings.bitrate,
                        sample_rate: settings.sampleRate === 'keep' ? null : parseInt(settings.sampleRate),
                        preserve_metadata: settings.preserveMetadata,
                        normalize: settings.normalizeAudio
                    }
                })
            });
            
            this.progress.updateProgress(80, 'Converting audio...');
            
            if (!convertResponse.ok) {
                const error = await convertResponse.json();
                throw new Error(error.error || 'Conversion failed');
            }
            
            const result = await convertResponse.json();
            this.progress.updateProgress(100, 'Complete!');
            
            // Download the converted file
            this.outputBlob = await fetch(result.download_url).then(r => r.blob());
            
            // Store conversion stats
            this.conversionStats = {
                originalSize: this.currentFile.size,
                outputSize: result.file_size,
                originalFormat: this.currentFile.name.split('.').pop().toUpperCase(),
                outputFormat: settings.outputFormat.toUpperCase(),
                quality: settings.bitrate + ' kbps',
                duration: result.duration || 'N/A'
            };
            
        } catch (error) {
            throw new Error(`Audio conversion failed: ${error.message}`);
        }
    }

    showConversionResults() {
        const stats = this.conversionStats;
        
        document.getElementById('conversionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original:</span>
                    <span class="stat-value">${stats.originalFormat} • ${FileUtils.formatFileSize(stats.originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Converted:</span>
                    <span class="stat-value">${stats.outputFormat} • ${FileUtils.formatFileSize(stats.outputSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Quality:</span>
                    <span class="stat-value">${stats.quality}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${stats.duration}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadAudio() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const originalName = this.currentFile.name.replace(/\.[^/.]+$/, '');
            const fileName = `${originalName}.${format}`;
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = fileName;
            a.click();
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
            }, 100);
        }
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioConverter();
});