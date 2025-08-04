class PDFRotator {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.pagePreview = document.getElementById('pagePreview');
        this.pagesGrid = document.getElementById('pagesGrid');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.outputBlob = null;
        this.pageRotations = {}; // Track rotation for each page
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Rotation buttons
        document.getElementById('rotateAllLeft').addEventListener('click', () => this.rotateAllPages(-90));
        document.getElementById('rotateAllRight').addEventListener('click', () => this.rotateAllPages(90));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.applyRotations.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadPDF.bind(this));
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
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            // Initialize page rotations
            this.pageRotations = {};
            for (let i = 0; i < pageCount; i++) {
                this.pageRotations[i] = 0;
            }
            
            this.renderPagePreviews(pageCount);
            
            this.uploadArea.style.display = 'none';
            this.pagePreview.style.display = 'block';
            this.convertBtn.disabled = false;
            
        } catch (error) {
            this.showError('Failed to load PDF file');
        }
    }

    renderPagePreviews(pageCount) {
        this.pagesGrid.innerHTML = '';
        
        for (let i = 0; i < pageCount; i++) {
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';
            pageItem.innerHTML = `
                <div class="page-preview-container">
                    <div class="page-thumbnail" style="transform: rotate(${this.pageRotations[i]}deg)">
                        <div class="page-content">Page ${i + 1}</div>
                    </div>
                    <div class="page-controls">
                        <button class="rotate-btn" onclick="pdfRotator.rotatePage(${i}, -90)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                        </button>
                        <span class="rotation-angle">${this.pageRotations[i]}°</span>
                        <button class="rotate-btn" onclick="pdfRotator.rotatePage(${i}, 90)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                                <path d="M21 3v5h-5"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            this.pagesGrid.appendChild(pageItem);
        }
    }

    rotatePage(pageIndex, angle) {
        this.pageRotations[pageIndex] = (this.pageRotations[pageIndex] + angle) % 360;
        if (this.pageRotations[pageIndex] < 0) {
            this.pageRotations[pageIndex] += 360;
        }
        
        const pageItem = this.pagesGrid.children[pageIndex];
        const thumbnail = pageItem.querySelector('.page-thumbnail');
        const angleSpan = pageItem.querySelector('.rotation-angle');
        
        thumbnail.style.transform = `rotate(${this.pageRotations[pageIndex]}deg)`;
        angleSpan.textContent = `${this.pageRotations[pageIndex]}°`;
    }

    rotateAllPages(angle) {
        Object.keys(this.pageRotations).forEach(pageIndex => {
            this.rotatePage(parseInt(pageIndex), angle);
        });
    }

    async applyRotations() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Simulate rotation process
            for (let i = 0; i <= 100; i += 20) {
                await new Promise(resolve => setTimeout(resolve, 200));
                this.showProgress(i);
            }
            
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Apply rotations to pages
            Object.keys(this.pageRotations).forEach(pageIndex => {
                const rotation = this.pageRotations[pageIndex];
                if (rotation !== 0) {
                    const page = pdfDoc.getPage(parseInt(pageIndex));
                    page.setRotation(PDFLib.degrees(rotation));
                }
            });
            
            const pdfBytes = await pdfDoc.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            this.showResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to apply rotations: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    showResults() {
        this.results.style.display = 'block';
    }

    downloadPDF() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.pdf$/i, '_rotated.pdf');
            a.click();
        }
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
let pdfRotator;
document.addEventListener('DOMContentLoaded', () => {
    pdfRotator = new PDFRotator();
});