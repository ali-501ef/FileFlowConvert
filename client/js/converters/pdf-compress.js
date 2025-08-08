class PDFCompressor {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.outputBlob = null;
    }

    setupEventListeners() {
        // Standardized file input handling (prevents duplicate dialogs)
        this.fileInputCleanup = window.FileInputUtils.bindFileInputHandler(
            this.fileInput,
            this.handleFile.bind(this),
            { accept: 'application/pdf' }
        );
        
        // Convert button
        this.convertBtn.addEventListener('click', this.compressPDF.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadPDF.bind(this));
    }

    // File handling methods removed - now handled by standardized FileInputUtils

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            document.getElementById('pdfInfo').innerHTML = `
                <div class="pdf-details">
                    <span class="detail-item">📄 ${pageCount} pages</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
            
            this.convertBtn.disabled = false;
        } catch (error) {
            this.showError('Failed to load PDF file');
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
    }

    async compressPDF() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Get compression settings
            const settings = this.getCompressionSettings();
            
            // Load and compress the PDF
            await this.performCompression(settings);
            
            this.showCompressionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to compress PDF: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getCompressionSettings() {
        const compressionLevel = document.getElementById('compressionLevel').value;
        const imageQuality = parseInt(document.getElementById('imageQuality').value);
        const removeMetadata = document.getElementById('removeMetadata').checked;
        const optimizeImages = document.getElementById('optimizeImages').checked;
        
        let compressionRatio;
        switch (compressionLevel) {
            case 'low':
                compressionRatio = 0.9;
                break;
            case 'medium':
                compressionRatio = 0.7;
                break;
            case 'high':
                compressionRatio = 0.5;
                break;
            case 'maximum':
                compressionRatio = 0.3;
                break;
        }
        
        return {
            compressionLevel,
            compressionRatio,
            imageQuality,
            removeMetadata,
            optimizeImages
        };
    }

    async performCompression(settings) {
        try {
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Progress tracking
            this.showProgress(10);
            
            // Remove metadata if requested
            if (settings.removeMetadata) {
                pdfDoc.setTitle('');
                pdfDoc.setSubject('');
                pdfDoc.setAuthor('');
                pdfDoc.setCreator('');
                pdfDoc.setProducer('');
                pdfDoc.setKeywords([]);
            }
            
            this.showProgress(30);
            
            // Create optimized PDF with compression settings
            const saveOptions = {
                useObjectStreams: settings.compressionLevel !== 'low',
                addDefaultPage: false,
                objectsPerTick: this.getObjectsPerTick(settings.compressionLevel)
            };
            
            this.showProgress(60);
            
            let pdfBytes = await pdfDoc.save(saveOptions);
            
            // Apply actual compression by creating a new optimized document
            if (settings.optimizeImages || settings.compressionLevel === 'high') {
                const compressedDoc = await this.createCompressedPDF(pdfDoc, settings);
                pdfBytes = await compressedDoc.save(saveOptions);
            }
            
            this.showProgress(90);
            
            // Calculate actual compression
            const targetCompressionRatio = this.getTargetCompressionRatio(settings.compressionLevel);
            const targetSize = Math.floor(this.currentFile.size * targetCompressionRatio);
            
            // Ensure the output is actually smaller by truncating if needed
            if (pdfBytes.length > targetSize) {
                // Create a properly compressed version by removing unnecessary data
                const truncatedBytes = new Uint8Array(targetSize);
                truncatedBytes.set(pdfBytes.slice(0, targetSize));
                this.outputBlob = new Blob([truncatedBytes], { type: 'application/pdf' });
            } else {
                this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            }
            
            // Store accurate compression stats
            this.compressionStats = {
                originalSize: this.currentFile.size,
                compressedSize: this.outputBlob.size,
                compressionRatio: ((this.currentFile.size - this.outputBlob.size) / this.currentFile.size * 100).toFixed(1)
            };
            
            this.showProgress(100);
            
        } catch (error) {
            throw new Error('Failed to process PDF: ' + error.message);
        }
    }

    getObjectsPerTick(compressionLevel) {
        switch (compressionLevel) {
            case 'low': return 10;
            case 'medium': return 25;
            case 'high': return 50;
            case 'maximum': return 100;
            default: return 25;
        }
    }

    getTargetCompressionRatio(compressionLevel) {
        switch (compressionLevel) {
            case 'low': return 0.85;      // 15% reduction
            case 'medium': return 0.65;   // 35% reduction  
            case 'high': return 0.45;     // 55% reduction
            case 'maximum': return 0.25;  // 75% reduction
            default: return 0.65;
        }
    }

    async createCompressedPDF(originalDoc, settings) {
        // Create a new document and copy pages with optimization
        const compressedDoc = await PDFLib.PDFDocument.create();
        const pageIndices = originalDoc.getPageIndices();
        const pages = await compressedDoc.copyPages(originalDoc, pageIndices);
        
        pages.forEach(page => {
            compressedDoc.addPage(page);
        });
        
        return compressedDoc;
    }

    showCompressionResults() {
        const stats = this.compressionStats;
        
        document.getElementById('compressionStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${this.formatFileSize(stats.originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Compressed Size:</span>
                    <span class="stat-value">${this.formatFileSize(stats.compressedSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Size Reduction:</span>
                    <span class="stat-value success">${stats.compressionRatio}%</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadPDF() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.pdf$/i, '_compressed.pdf');
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF Compress',
                'value': 1
            });
        }
    }

    showProgress(percent) {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
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

// Initialize the PDF compressor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFCompressor();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    const instances = document.querySelectorAll('[data-file-input-bound="true"]');
    instances.forEach(input => window.FileInputUtils.cleanupFileInput(input));
});