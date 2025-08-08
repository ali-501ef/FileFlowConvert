class PDFRotator {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.rotationOptions = document.getElementById('rotationOptions');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.pdfDoc = null;
        this.outputBlob = null;
        this.selectedAngle = 90;
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Rotation angle buttons
        document.querySelectorAll('.angle-btn').forEach(btn => {
            btn.addEventListener('click', this.handleAngleSelect.bind(this));
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', this.rotatePDF.bind(this));
        
        // Download button
        document.getElementById('downloadBtn')?.addEventListener('click', this.downloadPDF.bind(this));
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
            this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = this.pdfDoc.getPageCount();
            
            document.getElementById('pdfInfo').innerHTML = `
                <div class="pdf-details">
                    <span class="detail-item">📄 ${pageCount} pages</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                </div>
            `;
            
            this.showRotationOptions();
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

    showRotationOptions() {
        this.rotationOptions.style.display = 'block';
        // Select first angle button by default
        document.querySelector('.angle-btn[data-angle="90"]').classList.add('selected');
    }

    handleAngleSelect(e) {
        // Remove previous selection
        document.querySelectorAll('.angle-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add selection to clicked button
        e.currentTarget.classList.add('selected');
        this.selectedAngle = parseInt(e.currentTarget.dataset.angle);
    }

    async rotatePDF() {
        if (!this.currentFile || !this.pdfDoc) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Create new PDF document for rotated pages
            const rotatedPdf = await PDFLib.PDFDocument.create();
            const pageCount = this.pdfDoc.getPageCount();
            
            this.showProgress(20);
            
            // Copy and rotate each page
            for (let i = 0; i < pageCount; i++) {
                const progress = 20 + ((i + 1) / pageCount) * 60;
                this.showProgress(Math.round(progress));
                
                // Get the page from original document
                const [originalPage] = await rotatedPdf.copyPages(this.pdfDoc, [i]);
                
                // Apply rotation
                const rotationDegrees = this.selectedAngle;
                originalPage.setRotation(PDFLib.degrees(rotationDegrees));
                
                // Add rotated page to new document
                rotatedPdf.addPage(originalPage);
            }
            
            this.showProgress(85);
            
            // Generate final PDF
            const pdfBytes = await rotatedPdf.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            // Store rotation stats
            this.rotationStats = {
                pagesRotated: pageCount,
                rotationAngle: this.selectedAngle,
                outputSize: this.outputBlob.size
            };
            
            this.showProgress(100);
            this.showRotationResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to rotate PDF: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    showRotationResults() {
        const stats = this.rotationStats;
        const directionText = this.getRotationDirection(stats.rotationAngle);
        
        document.getElementById('rotationStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Pages Rotated:</span>
                    <span class="stat-value">${stats.pagesRotated}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Rotation Applied:</span>
                    <span class="stat-value">${stats.rotationAngle}° ${directionText}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Size:</span>
                    <span class="stat-value">${this.formatFileSize(stats.outputSize)}</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    getRotationDirection(angle) {
        switch (angle) {
            case 90: return 'Clockwise';
            case 180: return 'Upside Down';
            case 270: return 'Counter-clockwise';
            default: return '';
        }
    }

    downloadPDF() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.pdf$/i, `_rotated_${this.selectedAngle}deg.pdf`);
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF Rotate',
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

// Initialize the PDF rotator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFRotator();
});