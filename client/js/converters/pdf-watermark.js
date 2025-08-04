class PDFWatermarker {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.watermarkSetup = document.getElementById('watermarkSetup');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.outputBlob = null;
        this.watermarkType = 'text';
        this.selectedPosition = 'center';
        this.watermarkImage = null;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Watermark type selection
        document.getElementById('textTypeBtn').addEventListener('click', () => this.setWatermarkType('text'));
        document.getElementById('imageTypeBtn').addEventListener('click', () => this.setWatermarkType('image'));
        
        // Position buttons
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPosition(e.target.dataset.position));
        });
        
        // Range inputs
        document.getElementById('fontSize').addEventListener('input', this.updateFontSizeValue.bind(this));
        document.getElementById('opacity').addEventListener('input', this.updateOpacityValue.bind(this));
        document.getElementById('rotation').addEventListener('input', this.updateRotationValue.bind(this));
        
        // Page range selection
        document.getElementById('pageRange').addEventListener('change', this.toggleCustomRange.bind(this));
        
        // Watermark image upload
        document.getElementById('watermarkImage').addEventListener('change', this.handleImageSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.addWatermark.bind(this));
        
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
        this.uploadArea.style.display = 'none';
        this.watermarkSetup.style.display = 'block';
        this.convertBtn.disabled = false;
    }

    setWatermarkType(type) {
        this.watermarkType = type;
        
        // Update button states
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${type}TypeBtn`).classList.add('active');
        
        // Show/hide config sections
        document.getElementById('textConfig').style.display = type === 'text' ? 'block' : 'none';
        document.getElementById('imageConfig').style.display = type === 'image' ? 'block' : 'none';
    }

    setPosition(position) {
        this.selectedPosition = position;
        
        // Update button states
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-position="${position}"]`).classList.add('active');
    }

    updateFontSizeValue() {
        const value = document.getElementById('fontSize').value;
        document.getElementById('fontSizeValue').textContent = value + 'px';
    }

    updateOpacityValue() {
        const value = document.getElementById('opacity').value;
        document.getElementById('opacityValue').textContent = value + '%';
    }

    updateRotationValue() {
        const value = document.getElementById('rotation').value;
        document.getElementById('rotationValue').textContent = value + '°';
    }

    toggleCustomRange() {
        const pageRange = document.getElementById('pageRange').value;
        const customRangeGroup = document.getElementById('customRangeGroup');
        customRangeGroup.style.display = pageRange === 'custom' ? 'block' : 'none';
    }

    handleImageSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.watermarkImage = file;
            const preview = document.getElementById('imagePreview');
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.borderRadius = '4px';
            preview.innerHTML = '';
            preview.appendChild(img);
        }
    }

    async addWatermark() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getWatermarkSettings();
            
            // Simulate watermark process
            for (let i = 0; i <= 100; i += 20) {
                await new Promise(resolve => setTimeout(resolve, 300));
                this.showProgress(i);
            }
            
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Apply watermark based on settings
            await this.applyWatermarkToPDF(pdfDoc, settings);
            
            const pdfBytes = await pdfDoc.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            this.showResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to add watermark: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getWatermarkSettings() {
        return {
            type: this.watermarkType,
            text: document.getElementById('watermarkText').value,
            fontSize: parseInt(document.getElementById('fontSize').value),
            textColor: document.getElementById('textColor').value,
            opacity: parseInt(document.getElementById('opacity').value) / 100,
            rotation: parseInt(document.getElementById('rotation').value),
            position: this.selectedPosition,
            pageRange: document.getElementById('pageRange').value,
            customPages: document.getElementById('customPages').value,
            behindText: document.getElementById('behindText').checked,
            repeatPattern: document.getElementById('repeatPattern').checked,
            image: this.watermarkImage
        };
    }

    async applyWatermarkToPDF(pdfDoc, settings) {
        const pages = pdfDoc.getPages();
        
        // Determine which pages to watermark
        let pagesToWatermark = [];
        switch (settings.pageRange) {
            case 'all':
                pagesToWatermark = Array.from({length: pages.length}, (_, i) => i);
                break;
            case 'first':
                pagesToWatermark = [0];
                break;
            case 'last':
                pagesToWatermark = [pages.length - 1];
                break;
            case 'custom':
                // Parse custom range (simplified)
                pagesToWatermark = [0]; // Default to first page for demo
                break;
        }
        
        // Apply watermark to selected pages
        for (const pageIndex of pagesToWatermark) {
            if (pageIndex < pages.length) {
                const page = pages[pageIndex];
                
                if (settings.type === 'text') {
                    // Add text watermark
                    const { width, height } = page.getSize();
                    const textSize = settings.fontSize;
                    
                    page.drawText(settings.text, {
                        x: width / 2,
                        y: height / 2,
                        size: textSize,
                        opacity: settings.opacity,
                        rotate: PDFLib.degrees(settings.rotation)
                    });
                }
            }
        }
    }

    showResults() {
        this.results.style.display = 'block';
    }

    downloadPDF() {
        if (this.outputBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = this.currentFile.name.replace(/\.pdf$/i, '_watermarked.pdf');
            a.click();
        }
    }

    trackConversion() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF Watermark',
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

// Initialize the PDF watermarker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFWatermarker();
});