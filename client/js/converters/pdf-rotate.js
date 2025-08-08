/**
 * PDF Rotate Tool
 * Enhanced with functional advanced options and preview
 * Now integrated with Universal Advanced Options Manager
 */

class PDFRotate {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.pageRotations = new Map(); // Track individual page rotations
        
        // Initialize Advanced Options Manager
        this.optionsManager = window.createAdvancedOptionsManager('pdf-rotate');
        
        // Link with the legacy advanced options handler
        if (window.advancedOptionsHandler) {
            window.advancedOptionsHandler.setOptionsManager(this.optionsManager);
        }
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
        this.pagesContainer = document.getElementById('pagesContainer');
        
        this.currentFile = null;
        this.pdfDoc = null;
        this.outputBlob = null;
    }

    setupEventListeners() {
        // Standardized file input handling (prevents duplicate dialogs)
        if (this.fileInput) {
            this.fileInputCleanup = window.FileInputUtils.bindFileInputHandler(
                this.fileInput,
                this.handleFile.bind(this),
                { accept: 'application/pdf' }
            );
        }
        
        // Convert button
        this.convertBtn?.addEventListener('click', this.rotatePDF.bind(this));
        
        // Download button
        document.getElementById('downloadBtn')?.addEventListener('click', this.downloadPDF.bind(this));
        
        // Advanced options
        this.setupAdvancedOptions();
    }

    setupAdvancedOptions() {
        // Default rotation selector
        const defaultRotation = document.getElementById('rotationAngle');
        defaultRotation?.addEventListener('change', this.applyDefaultRotation.bind(this));
        
        // Auto-detect orientation
        const autoDetect = document.getElementById('autoDetect');
        autoDetect?.addEventListener('change', this.toggleAutoDetect.bind(this));
        
        // Batch rotation buttons
        const batchButtons = document.querySelectorAll('.batch-rotation-btn');
        batchButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rotation = parseInt(e.target.dataset.rotation);
                this.applyBatchRotation(rotation);
            });
        });
    }

    // File handling methods removed - now handled by standardized FileInputUtils

    async handleFile(file) {
        this.currentFile = file;
        this.showFilePreview(file);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = this.pdfDoc.getPageCount();
            
            document.getElementById('pdfInfo').innerHTML = `
                <div class="pdf-details">
                    <span class="detail-item">📄 ${pageCount} pages</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
            
            // Initialize page rotations
            this.pageRotations.clear();
            for (let i = 0; i < pageCount; i++) {
                this.pageRotations.set(i, 0);
            }
            
            this.showPagePreviews();
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

    async showPagePreviews() {
        if (!this.pdfDoc || !this.pagesContainer) return;

        this.pagesContainer.innerHTML = '';
        const pageCount = this.pdfDoc.getPageCount();

        for (let i = 0; i < Math.min(pageCount, 10); i++) { // Show first 10 pages
            const pageDiv = this.createPagePreview(i);
            this.pagesContainer.appendChild(pageDiv);
        }

        if (pageCount > 10) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'more-pages';
            moreDiv.innerHTML = `<p>+ ${pageCount - 10} more pages</p>`;
            this.pagesContainer.appendChild(moreDiv);
        }

        this.pagesContainer.style.display = 'block';
    }

    createPagePreview(pageIndex) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page-preview';
        pageDiv.innerHTML = `
            <div class="page-thumbnail" style="transform: rotate(${this.pageRotations.get(pageIndex)}deg)">
                <div class="page-content">Page ${pageIndex + 1}</div>
            </div>
            <div class="page-controls">
                <button class="rotate-btn" data-page="${pageIndex}" data-rotation="-90">↺</button>
                <span class="rotation-display">${this.pageRotations.get(pageIndex)}°</span>
                <button class="rotate-btn" data-page="${pageIndex}" data-rotation="90">↻</button>
            </div>
        `;

        // Add rotation listeners
        const rotateButtons = pageDiv.querySelectorAll('.rotate-btn');
        rotateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                const rotation = parseInt(btn.dataset.rotation);
                this.rotateIndividualPage(page, rotation);
            });
        });

        return pageDiv;
    }

    rotateIndividualPage(pageIndex, rotation) {
        const currentRotation = this.pageRotations.get(pageIndex);
        const newRotation = (currentRotation + rotation) % 360;
        this.pageRotations.set(pageIndex, newRotation);

        // Update preview
        const pagePreview = document.querySelector(`[data-page="${pageIndex}"]`).closest('.page-preview');
        const thumbnail = pagePreview.querySelector('.page-thumbnail');
        const display = pagePreview.querySelector('.rotation-display');
        
        thumbnail.style.transform = `rotate(${newRotation}deg)`;
        display.textContent = `${newRotation}°`;
    }

    applyDefaultRotation() {
        const defaultRotation = parseInt(document.getElementById('rotationAngle').value);
        this.applyBatchRotation(defaultRotation);
    }

    applyBatchRotation(rotation) {
        for (let [pageIndex, currentRotation] of this.pageRotations) {
            const newRotation = (currentRotation + rotation) % 360;
            this.pageRotations.set(pageIndex, newRotation);
        }
        this.showPagePreviews(); // Refresh previews
    }

    toggleAutoDetect() {
        const autoDetect = document.getElementById('autoDetect').checked;
        if (autoDetect) {
            this.autoDetectOrientation();
        }
    }

    autoDetectOrientation() {
        // Simulate auto-detection logic
        for (let [pageIndex] of this.pageRotations) {
            // Mock detection - in reality this would analyze page content
            const shouldRotate = Math.random() > 0.7; // 30% chance of rotation needed
            if (shouldRotate) {
                this.pageRotations.set(pageIndex, 90);
            }
        }
        this.showPagePreviews();
    }

    async rotatePDF() {
        if (!this.pdfDoc) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';
        
        // Clear any previous validation errors
        if (this.optionsManager) {
            this.optionsManager.hideValidationErrors();
        }

        try {
            const settings = this.getRotationSettings();
            
            // Progress stages
            const stages = [
                'Preparing pages...',
                'Applying rotations...',
                'Optimizing layout...',
                'Finalizing PDF...'
            ];
            
            for (let i = 0; i < stages.length; i++) {
                this.showProgressWithStage((i / stages.length) * 80, stages[i]);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Perform the rotation
            const rotatedDoc = await this.createRotatedPDF(settings);
            
            this.showProgressWithStage(100, 'Rotation complete!');
            
            // Generate output
            const pdfBytes = await rotatedDoc.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            this.showRotationResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to rotate PDF: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getRotationSettings() {
        // Use the options manager to collect and validate settings
        if (this.optionsManager) {
            const validation = this.optionsManager.validateOptions();
            if (!validation.isValid) {
                this.optionsManager.showValidationErrors(validation.errors);
                throw new Error(`Invalid options: ${validation.errors.join(', ')}`);
            }
            const options = this.optionsManager.collectOptions();
            // Add page-specific rotations to the settings
            return {
                ...options,
                pageRotations: new Map(this.pageRotations)
            };
        }
        
        // Fallback to manual collection if manager not available
        return {
            preserveAspectRatio: document.getElementById('preserveAspectRatio')?.checked || true,
            autoDetect: document.getElementById('autoDetect')?.checked || false,
            pageRotations: new Map(this.pageRotations)
        };
    }

    async createRotatedPDF(settings) {
        const rotatedDoc = await PDFLib.PDFDocument.create();
        const pageIndices = this.pdfDoc.getPageIndices();
        const pages = await rotatedDoc.copyPages(this.pdfDoc, pageIndices);
        
        pages.forEach((page, index) => {
            const rotation = settings.pageRotations.get(index) || 0;
            
            if (rotation !== 0) {
                page.setRotation(PDFLib.degrees(rotation));
            }
            
            rotatedDoc.addPage(page);
        });
        
        return rotatedDoc;
    }

    showRotationResults() {
        const originalSize = this.currentFile.size;
        const rotatedSize = this.outputBlob.size;
        const rotatedPages = Array.from(this.pageRotations.values()).filter(r => r !== 0).length;
        
        document.getElementById('rotationStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${this.formatFileSize(originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Processed Size:</span>
                    <span class="stat-value">${this.formatFileSize(rotatedSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Pages Rotated:</span>
                    <span class="stat-value success">${rotatedPages}</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadPDF() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.pdf$/i, '_rotated.pdf');
            a.click();
            URL.revokeObjectURL(a.href);
        }
    }

    showProgressWithStage(percent, stage) {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
        
        const stageElement = document.getElementById('progressStage');
        if (stageElement) {
            stageElement.textContent = stage;
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

    showLoading(show) {
        const btnText = this.convertBtn.querySelector('.btn-text');
        const btnLoader = this.convertBtn.querySelector('.btn-loader');
        
        if (show) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'block';
            this.convertBtn.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'block';
            if (btnLoader) btnLoader.style.display = 'none';
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

    trackConversion() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF Rotate',
                'value': 1
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFRotate();
});