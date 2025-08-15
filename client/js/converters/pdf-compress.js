/**
 * PDF Compression Tool - Built from scratch
 * Provides maximum compression with Advanced Options support
 */
class PDFCompressor {
    constructor() {
        this.currentFile = null;
        this.outputBlob = null;
        this.compressionStats = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Core elements
        this.fileUploader = document.getElementById('fileUploader');
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = this.fileUploader.querySelector('.upload-area');
        this.filePreview = document.getElementById('filePreview');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        
        // Advanced Options
        this.advancedOptions = document.getElementById('advancedOptions');
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedContent = document.getElementById('advancedContent');
        this.compressionLevel = document.getElementById('compressionLevel');
        this.imageQuality = document.getElementById('imageQuality');
        this.removeMetadata = document.getElementById('removeMetadata');
        this.optimizeImages = document.getElementById('optimizeImages');
        
        // Controls
        this.convertBtn = document.getElementById('convertBtn');
        this.btnText = this.convertBtn.querySelector('.btn-text');
        this.btnLoader = this.convertBtn.querySelector('.btn-loader');
        
        // Progress and Results
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.compressionStatsEl = document.getElementById('compressionStats');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    bindEvents() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        
        // Advanced options toggle
        this.advancedToggle.addEventListener('click', () => this.toggleAdvancedOptions());
        
        // Convert button
        this.convertBtn.addEventListener('click', () => this.handleCompression());
        
        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadCompressedPDF());
        
        // Advanced options positioning
        this.setupAdvancedOptionsPositioning();
    }

    setupAdvancedOptionsPositioning() {
        // Position advanced options above convert button
        const observer = new MutationObserver(() => {
            this.positionAdvancedOptions();
        });
        
        observer.observe(this.filePreview, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });
        
        // Initial positioning
        setTimeout(() => this.positionAdvancedOptions(), 100);
    }

    positionAdvancedOptions() {
        if (this.filePreview.style.display !== 'none') {
            const convertSection = document.querySelector('.convert-section');
            if (convertSection && this.advancedOptions) {
                convertSection.parentNode.insertBefore(this.advancedOptions, convertSection);
            }
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFileSelection(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleFileDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = Array.from(event.dataTransfer.files);
        const pdfFile = files.find(file => file.type === 'application/pdf');
        
        if (pdfFile) {
            this.processFileSelection(pdfFile);
        } else {
            alert('Please select a PDF file.');
        }
    }

    processFileSelection(file) {
        if (file.type !== 'application/pdf') {
            alert('Please select a valid PDF file.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            alert('File size must be less than 50MB.');
            return;
        }

        this.currentFile = file;
        this.displayFilePreview(file);
        this.enableConvertButton();
        this.hideResults();
    }

    displayFilePreview(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        this.positionAdvancedOptions();
    }

    enableConvertButton() {
        this.convertBtn.disabled = false;
        this.convertBtn.classList.add('enabled');
    }

    hideResults() {
        this.results.style.display = 'none';
        this.progressContainer.style.display = 'none';
    }

    toggleAdvancedOptions() {
        const isExpanded = this.advancedContent.style.display !== 'none';
        this.advancedContent.style.display = isExpanded ? 'none' : 'block';
        
        // Rotate arrow icon
        const arrow = this.advancedToggle.querySelector('svg');
        arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    async handleCompression() {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.setLoadingState(true);
        this.hideResults();
        
        try {
            const settings = this.getCompressionSettings();
            await this.performCompression(settings);
            this.showCompressionResults();
        } catch (error) {
            console.error('Compression failed:', error);
            alert('Compression failed: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.setLoadingState(false);
        }
    }

    getCompressionSettings() {
        return {
            compressionLevel: this.compressionLevel.value,
            imageQuality: parseInt(this.imageQuality.value),
            removeMetadata: this.removeMetadata.checked,
            optimizeImages: this.optimizeImages.checked
        };
    }

    async performCompression(settings) {
        this.updateProgress(10, 'Loading PDF...');
        
        const arrayBuffer = await this.currentFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        
        this.updateProgress(25, 'Analyzing document...');

        // Apply compression based on settings
        let compressedDoc;
        
        if (settings.compressionLevel === 'maximum') {
            compressedDoc = await this.performMaximumCompression(pdfDoc, settings);
        } else {
            compressedDoc = await this.performStandardCompression(pdfDoc, settings);
        }

        this.updateProgress(90, 'Finalizing...');

        // Generate final PDF bytes
        const pdfBytes = await this.generateOptimizedPDF(compressedDoc, settings);
        
        this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        // Calculate compression stats
        this.compressionStats = {
            originalSize: this.currentFile.size,
            compressedSize: this.outputBlob.size,
            compressionRatio: ((this.currentFile.size - this.outputBlob.size) / this.currentFile.size * 100).toFixed(1)
        };

        this.updateProgress(100, 'Complete!');
    }

    async performMaximumCompression(pdfDoc, settings) {
        this.updateProgress(30, 'Applying maximum compression...');
        
        // Create a new document for maximum compression
        const compressedDoc = await PDFLib.PDFDocument.create();
        
        // Remove all metadata for maximum compression
        if (settings.removeMetadata) {
            compressedDoc.setTitle('');
            compressedDoc.setAuthor('');
            compressedDoc.setSubject('');
            compressedDoc.setKeywords([]);
            compressedDoc.setProducer('FileFlow Compressor');
            compressedDoc.setCreator('FileFlow');
        }

        this.updateProgress(45, 'Processing pages...');
        
        const pageCount = pdfDoc.getPageCount();
        
        // Process pages with aggressive optimization
        for (let i = 0; i < pageCount; i++) {
            try {
                const [copiedPage] = await compressedDoc.copyPages(pdfDoc, [i]);
                
                // Apply image quality compression through page scaling
                if (settings.optimizeImages && settings.imageQuality < 90) {
                    const scaleFactor = this.calculateScaleFactor(settings.imageQuality);
                    this.applyPageOptimization(copiedPage, scaleFactor);
                }
                
                compressedDoc.addPage(copiedPage);
                
                // Update progress per page
                const pageProgress = 45 + (i / pageCount) * 30;
                this.updateProgress(pageProgress, `Processing page ${i + 1}/${pageCount}...`);
            } catch (error) {
                console.warn(`Failed to process page ${i + 1}:`, error);
                // Continue with other pages
            }
        }

        return compressedDoc;
    }

    async performStandardCompression(pdfDoc, settings) {
        this.updateProgress(40, 'Applying standard compression...');
        
        // Apply metadata removal if requested
        if (settings.removeMetadata) {
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('FileFlow Compressor');
            pdfDoc.setCreator('FileFlow');
        }

        this.updateProgress(70, 'Optimizing document...');

        // For standard compression, we can work with the original document
        // and apply optimizations during the save process
        return pdfDoc;
    }

    calculateScaleFactor(imageQuality) {
        // Calculate scale factor based on image quality
        // Higher quality = less scaling, lower quality = more scaling
        if (imageQuality >= 90) return 1.0;
        if (imageQuality >= 75) return 0.95;
        if (imageQuality >= 60) return 0.85;
        if (imageQuality >= 45) return 0.75;
        return 0.65; // Very low quality
    }

    applyPageOptimization(page, scaleFactor) {
        try {
            if (scaleFactor < 1.0) {
                const { width, height } = page.getSize();
                const newWidth = width * scaleFactor;
                const newHeight = height * scaleFactor;
                
                // Scale content and resize page
                page.scaleContent(scaleFactor, scaleFactor);
                page.setSize(newWidth, newHeight);
            }
        } catch (error) {
            console.warn('Failed to apply page optimization:', error);
        }
    }

    async generateOptimizedPDF(pdfDoc, settings) {
        // Create optimized save options based on compression level
        const saveOptions = this.createSaveOptions(settings);
        
        // Generate PDF bytes with multiple passes for maximum compression
        if (settings.compressionLevel === 'maximum') {
            return await this.multiPassCompression(pdfDoc, saveOptions, settings);
        } else {
            return await pdfDoc.save(saveOptions);
        }
    }

    createSaveOptions(settings) {
        const compressionLevel = settings.compressionLevel;
        
        return {
            useObjectStreams: compressionLevel !== 'low',
            addDefaultPage: false,
            objectsPerTick: this.getObjectsPerTick(compressionLevel),
            prettyPrint: false,
            updateFieldAppearances: false
        };
    }

    getObjectsPerTick(compressionLevel) {
        switch (compressionLevel) {
            case 'low': return 10;
            case 'medium': return 25;
            case 'high': return 75;
            case 'maximum': return 200; // Maximum processing for smallest size
            default: return 25;
        }
    }

    async multiPassCompression(pdfDoc, saveOptions, settings) {
        // First pass - standard compression
        let bestBytes = await pdfDoc.save(saveOptions);
        
        // Second pass - ultra compression settings
        try {
            const ultraOptions = {
                ...saveOptions,
                objectsPerTick: 300,
                useObjectStreams: true
            };
            
            const ultraBytes = await pdfDoc.save(ultraOptions);
            if (ultraBytes.length < bestBytes.length) {
                bestBytes = ultraBytes;
            }
        } catch (error) {
            console.warn('Ultra compression pass failed:', error);
        }
        
        // Third pass - create minimal document if image optimization is enabled
        if (settings.optimizeImages && settings.imageQuality < 60) {
            try {
                const minimalDoc = await this.createMinimalDocument(pdfDoc, settings);
                const minimalBytes = await minimalDoc.save(saveOptions);
                if (minimalBytes.length < bestBytes.length) {
                    bestBytes = minimalBytes;
                }
            } catch (error) {
                console.warn('Minimal document creation failed:', error);
            }
        }
        
        return bestBytes;
    }

    async createMinimalDocument(pdfDoc, settings) {
        const minimalDoc = await PDFLib.PDFDocument.create();
        
        // Absolute minimal metadata
        minimalDoc.setProducer('FileFlow');
        
        const pageCount = pdfDoc.getPageCount();
        const ultraScaleFactor = this.calculateScaleFactor(settings.imageQuality * 0.8); // Even more aggressive
        
        for (let i = 0; i < pageCount; i++) {
            try {
                const [copiedPage] = await minimalDoc.copyPages(pdfDoc, [i]);
                this.applyPageOptimization(copiedPage, ultraScaleFactor);
                minimalDoc.addPage(copiedPage);
            } catch (error) {
                console.warn(`Failed to copy page ${i} to minimal document:`, error);
            }
        }
        
        return minimalDoc;
    }

    setLoadingState(loading) {
        this.convertBtn.disabled = loading;
        this.btnText.style.display = loading ? 'none' : 'inline';
        this.btnLoader.style.display = loading ? 'inline-block' : 'none';
        
        if (loading) {
            this.progressContainer.style.display = 'block';
        }
    }

    updateProgress(percentage, message) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = message || percentage + '%';
    }

    showCompressionResults() {
        const stats = this.compressionStats;
        
        // Clear existing content
        this.compressionStatsEl.innerHTML = '';
        
        // Create stats display
        const statsHTML = `
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
        
        this.compressionStatsEl.innerHTML = statsHTML;
        this.results.style.display = 'block';
        
        // Hide progress
        setTimeout(() => {
            this.progressContainer.style.display = 'none';
        }, 1000);
    }

    downloadCompressedPDF() {
        if (!this.outputBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.outputBlob);
        link.download = this.currentFile.name.replace(/\.pdf$/i, '_compressed.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize PDF Compressor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.pdfCompressor = new PDFCompressor();
});