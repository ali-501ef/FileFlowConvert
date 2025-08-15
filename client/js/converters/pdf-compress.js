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
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.compressPDF.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadPDF.bind(this));
    }

    handleUploadAreaClick(e) {
        // Click guard to prevent double file picker opening
        if (this.isFilePickerOpen) {
            return;
        }
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        // Reset flag after a delay to handle cancel cases
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.handleFile(file);
        }
    }

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            const pdfInfoElement = document.getElementById('pdfInfo');
            pdfInfoElement.replaceChildren(); // Clear existing content
            
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'pdf-details';
            
            const pagesSpan = document.createElement('span');
            pagesSpan.className = 'detail-item';
            pagesSpan.textContent = `📄 ${pageCount} pages`;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'detail-item';
            sizeSpan.textContent = `📊 ${this.formatFileSize(file.size)}`;
            
            detailsDiv.appendChild(pagesSpan);
            detailsDiv.appendChild(sizeSpan);
            pdfInfoElement.appendChild(detailsDiv);
            
            this.convertBtn.disabled = false;
        } catch (error) {
            this.showError('Failed to load PDF file');
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        // Keep upload area visible but disable interactions during processing
        this.fileInput.disabled = false;
        this.uploadArea.classList.remove('busy');
    }

    async compressPDF() {
        if (!this.currentFile) return;

        this.showLoading(true);
        // Disable upload area during processing
        this.fileInput.disabled = true;
        this.uploadArea.classList.add('busy');
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
        // Re-enable upload area after processing
        this.fileInput.disabled = false;
        this.uploadArea.classList.remove('busy');
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
                objectsPerTick: this.getObjectsPerTick(settings.compressionLevel),
                updateFieldAppearances: false,
                prettyPrint: false
            };
            
            this.showProgress(60);
            
            let pdfBytes = await pdfDoc.save(saveOptions);
            
            // Apply additional optimization for high compression levels
            if (settings.optimizeImages || settings.compressionLevel === 'high' || settings.compressionLevel === 'maximum') {
                try {
                    const compressedDoc = await this.createCompressedPDF(pdfDoc, settings);
                    const optimizedBytes = await compressedDoc.save(saveOptions);
                    // Only use optimized version if it's actually smaller
                    if (optimizedBytes.length < pdfBytes.length) {
                        pdfBytes = optimizedBytes;
                    }
                } catch (error) {
                    console.warn('High compression optimization failed, using standard compression:', error);
                    // Fall back to standard compression
                }
            }
            
            this.showProgress(90);
            
            // Create the final output blob with valid PDF structure
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
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
            case 'low': return 5;
            case 'medium': return 15;
            case 'high': return 30;
            case 'maximum': return 50;
            default: return 15;
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
        // For high compression, create a new document and copy pages with optimization
        const compressedDoc = await PDFLib.PDFDocument.create();
        
        // Copy basic document information but clear metadata if requested
        if (!settings.removeMetadata) {
            try {
                if (originalDoc.getTitle()) compressedDoc.setTitle(originalDoc.getTitle());
                if (originalDoc.getSubject()) compressedDoc.setSubject(originalDoc.getSubject());
                if (originalDoc.getCreator()) compressedDoc.setCreator(originalDoc.getCreator());
            } catch (e) {
                // Ignore metadata errors
            }
        }
        
        // Copy all pages
        const pageIndices = originalDoc.getPageIndices();
        const pages = await compressedDoc.copyPages(originalDoc, pageIndices);
        
        pages.forEach(page => {
            compressedDoc.addPage(page);
        });
        
        return compressedDoc;
    }

    showCompressionResults() {
        const stats = this.compressionStats;
        const compressionStatsEl = document.getElementById('compressionStats');
        
        // Clear existing content
        compressionStatsEl.textContent = '';
        
        // Create stats grid container
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        
        // Create original size stat
        const originalStat = this.createStatItem('Original Size:', this.formatFileSize(stats.originalSize));
        
        // Create compressed size stat  
        const compressedStat = this.createStatItem('Compressed Size:', this.formatFileSize(stats.compressedSize));
        
        // Create size reduction stat
        const reductionStat = this.createStatItem('Size Reduction:', `${stats.compressionRatio}%`, 'success');
        
        // Append all stats to grid
        statsGrid.appendChild(originalStat);
        statsGrid.appendChild(compressedStat);
        statsGrid.appendChild(reductionStat);
        
        // Add grid to container
        compressionStatsEl.appendChild(statsGrid);
        
        this.results.style.display = 'block';
    }

    createStatItem(label, value, valueClass = '') {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'stat-label';
        labelSpan.textContent = label;
        
        const valueSpan = document.createElement('span');
        valueSpan.className = valueClass ? `stat-value ${valueClass}` : 'stat-value';
        valueSpan.textContent = value;
        
        statItem.appendChild(labelSpan);
        statItem.appendChild(valueSpan);
        
        return statItem;
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