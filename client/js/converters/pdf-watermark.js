class PDFWatermarker {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.watermarkOptions = document.getElementById('watermarkOptions');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.pdfDoc = null;
        this.outputBlob = null;
        this.watermarkImage = null;
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Watermark settings
        document.getElementById('watermarkType').addEventListener('change', this.handleWatermarkTypeChange.bind(this));
        document.getElementById('watermarkImage').addEventListener('change', this.handleWatermarkImageSelect.bind(this));
        document.getElementById('watermarkOpacity').addEventListener('input', this.updateOpacityDisplay.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.addWatermark.bind(this));
        
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
            
            this.showWatermarkOptions();
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

    showWatermarkOptions() {
        this.watermarkOptions.style.display = 'block';
    }

    handleWatermarkTypeChange(e) {
        const type = e.target.value;
        const textSettings = document.getElementById('textWatermarkSettings');
        const imageSettings = document.getElementById('imageWatermarkSettings');
        
        if (type === 'text') {
            textSettings.style.display = 'block';
            imageSettings.style.display = 'none';
        } else {
            textSettings.style.display = 'none';
            imageSettings.style.display = 'block';
        }
    }

    async handleWatermarkImageSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.watermarkImage = arrayBuffer;
            } catch (error) {
                this.showError('Failed to load watermark image');
            }
        }
    }

    updateOpacityDisplay(e) {
        const value = e.target.value;
        document.getElementById('opacityValue').textContent = `${value}%`;
    }

    async addWatermark() {
        if (!this.currentFile || !this.pdfDoc) return;

        const watermarkType = document.getElementById('watermarkType').value;
        
        if (watermarkType === 'image' && !this.watermarkImage) {
            this.showError('Please select a watermark image');
            return;
        }

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Create new PDF document for watermarked pages
            const watermarkedPdf = await PDFLib.PDFDocument.create();
            const pageCount = this.pdfDoc.getPageCount();
            
            // Get watermark settings
            const settings = this.getWatermarkSettings();
            
            this.showProgress(20);
            
            // Copy all pages and add watermark
            for (let i = 0; i < pageCount; i++) {
                const progress = 20 + ((i + 1) / pageCount) * 60;
                this.showProgress(Math.round(progress));
                
                // Get the page from original document
                const [originalPage] = await watermarkedPdf.copyPages(this.pdfDoc, [i]);
                
                // Add watermark to page
                if (watermarkType === 'text') {
                    await this.addTextWatermark(originalPage, settings, watermarkedPdf);
                } else {
                    await this.addImageWatermark(originalPage, settings, watermarkedPdf);
                }
                
                // Add page to new document
                watermarkedPdf.addPage(originalPage);
            }
            
            this.showProgress(85);
            
            // Generate final PDF
            const pdfBytes = await watermarkedPdf.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            // Store watermark stats
            this.watermarkStats = {
                pagesProcessed: pageCount,
                watermarkType: watermarkType,
                outputSize: this.outputBlob.size
            };
            
            this.showProgress(100);
            this.showWatermarkResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to add watermark: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getWatermarkSettings() {
        return {
            type: document.getElementById('watermarkType').value,
            text: document.getElementById('watermarkText').value,
            fontSize: parseInt(document.getElementById('fontSize').value),
            fontColor: document.getElementById('fontColor').value,
            opacity: parseInt(document.getElementById('watermarkOpacity').value) / 100,
            position: document.getElementById('watermarkPosition').value,
            repeat: document.getElementById('repeatWatermark').checked
        };
    }

    async addTextWatermark(page, settings, pdfDoc) {
        const { width, height } = page.getSize();
        
        // Embed font
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        
        // Convert hex color to RGB
        const rgb = this.hexToRgb(settings.fontColor);
        
        if (settings.repeat) {
            // Repeat watermark across the page
            const stepX = 200; // Horizontal spacing
            const stepY = 150; // Vertical spacing
            
            for (let x = 50; x < width - 100; x += stepX) {
                for (let y = 50; y < height - 50; y += stepY) {
                    page.drawText(settings.text, {
                        x: x,
                        y: y,
                        size: settings.fontSize,
                        font: font,
                        color: PDFLib.rgb(rgb.r / 255, rgb.g / 255, rgb.b / 255),
                        opacity: settings.opacity,
                        rotate: PDFLib.degrees(-45)
                    });
                }
            }
        } else {
            const { x, y } = this.getWatermarkPosition(settings.position, width, height);
            
            page.drawText(settings.text, {
                x: x,
                y: y,
                size: settings.fontSize,
                font: font,
                color: PDFLib.rgb(rgb.r / 255, rgb.g / 255, rgb.b / 255),
                opacity: settings.opacity,
                rotate: settings.position === 'slanted' ? PDFLib.degrees(-45) : PDFLib.degrees(0)
            });
        }
    }

    async addImageWatermark(page, settings, pdfDoc) {
        if (!this.watermarkImage) return;
        
        const { width, height } = page.getSize();
        
        // Embed image (assuming PNG for simplicity - you might want to detect type)
        let embeddedImage;
        try {
            embeddedImage = await pdfDoc.embedPng(this.watermarkImage);
        } catch {
            try {
                embeddedImage = await pdfDoc.embedJpg(this.watermarkImage);
            } catch (error) {
                throw new Error('Unsupported image format');
            }
        }
        
        const imageWidth = embeddedImage.width * 0.3; // Scale down for repeating
        const imageHeight = embeddedImage.height * 0.3;
        
        if (settings.repeat) {
            // Repeat watermark across the page
            const stepX = 200; // Horizontal spacing
            const stepY = 150; // Vertical spacing
            
            for (let x = 50; x < width - imageWidth; x += stepX) {
                for (let y = 50; y < height - imageHeight; y += stepY) {
                    page.drawImage(embeddedImage, {
                        x: x,
                        y: y,
                        width: imageWidth,
                        height: imageHeight,
                        opacity: settings.opacity,
                        rotate: PDFLib.degrees(-45)
                    });
                }
            }
        } else {
            const { x, y } = this.getWatermarkPosition(settings.position, width, height, imageWidth, imageHeight);
            
            page.drawImage(embeddedImage, {
                x: x,
                y: y,
                width: imageWidth,
                height: imageHeight,
                opacity: settings.opacity,
                rotate: settings.position === 'slanted' ? PDFLib.degrees(-45) : PDFLib.degrees(0)
            });
        }
    }

    getWatermarkPosition(position, pageWidth, pageHeight, itemWidth = 100, itemHeight = 20) {
        switch (position) {
            case 'top-left':
                return { x: 50, y: pageHeight - 50 - itemHeight };
            case 'top-right':
                return { x: pageWidth - 50 - itemWidth, y: pageHeight - 50 - itemHeight };
            case 'bottom-left':
                return { x: 50, y: 50 };
            case 'bottom-right':
                return { x: pageWidth - 50 - itemWidth, y: 50 };
            case 'slanted':
                return { 
                    x: pageWidth * 0.5, 
                    y: pageHeight * 0.5 
                };
            case 'center':
            default:
                return { 
                    x: (pageWidth - itemWidth) / 2, 
                    y: (pageHeight - itemHeight) / 2 
                };
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 0, b: 0 }; // Default to red
    }

    showWatermarkResults() {
        const stats = this.watermarkStats;
        
        document.getElementById('watermarkStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Pages Processed:</span>
                    <span class="stat-value">${stats.pagesProcessed}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Watermark Type:</span>
                    <span class="stat-value">${stats.watermarkType.charAt(0).toUpperCase() + stats.watermarkType.slice(1)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Output Size:</span>
                    <span class="stat-value">${this.formatFileSize(stats.outputSize)}</span>
                </div>
            </div>
        `;
        
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
        // Track the conversion for analytics
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

// Initialize the PDF watermarker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFWatermarker();
});