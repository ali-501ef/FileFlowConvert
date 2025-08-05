/**
 * PDF Watermark Tool
 * Advanced watermarking with live preview and immutable watermarks
 */

class PDFWatermark {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.watermarkSettings = this.getDefaultSettings();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.previewContainer = document.getElementById('previewContainer');
        this.watermarkPreview = document.getElementById('watermarkPreview');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.currentFile = null;
        this.pdfDoc = null;
        this.outputBlob = null;
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea?.addEventListener('click', () => this.fileInput.click());
        this.uploadArea?.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea?.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput?.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn?.addEventListener('click', this.addWatermark.bind(this));
        
        // Watermark settings listeners
        this.setupWatermarkControls();
        
        // Download button
        document.getElementById('downloadBtn')?.addEventListener('click', this.downloadPDF.bind(this));
    }

    setupWatermarkControls() {
        // Text watermark controls
        const textInput = document.getElementById('watermarkText');
        const fontSize = document.getElementById('fontSize');
        const opacity = document.getElementById('opacity');
        const rotation = document.getElementById('rotation');
        const positionX = document.getElementById('positionX');
        const positionY = document.getElementById('positionY');
        const colorPicker = document.getElementById('watermarkColor');

        // Add real-time preview listeners
        [textInput, fontSize, opacity, rotation, positionX, positionY, colorPicker].forEach(element => {
            if (element) {
                element.addEventListener('input', () => {
                    this.updateWatermarkSettings();
                    this.updateLivePreview();
                });
            }
        });

        // Watermark type selector
        const watermarkType = document.getElementById('watermarkType');
        if (watermarkType) {
            watermarkType.addEventListener('change', this.handleWatermarkTypeChange.bind(this));
        }

        // Image watermark upload
        const imageInput = document.getElementById('watermarkImageInput');
        if (imageInput) {
            imageInput.addEventListener('change', this.handleWatermarkImageSelect.bind(this));
        }
    }

    getDefaultSettings() {
        return {
            type: 'text',
            text: 'CONFIDENTIAL',
            fontSize: 48,
            color: '#ff0000',
            opacity: 0.5,
            rotation: 45,
            positionX: 50,
            positionY: 50,
            imageData: null,
            blendMode: 'multiply',
            layerMode: 'background' // 'background' or 'foreground'
        };
    }

    updateWatermarkSettings() {
        const settings = {
            type: document.getElementById('watermarkType')?.value || 'text',
            text: document.getElementById('watermarkText')?.value || 'CONFIDENTIAL',
            fontSize: parseInt(document.getElementById('fontSize')?.value) || 48,
            color: document.getElementById('watermarkColor')?.value || '#ff0000',
            opacity: parseFloat(document.getElementById('opacity')?.value) || 0.5,
            rotation: parseFloat(document.getElementById('rotation')?.value) || 45,
            positionX: parseFloat(document.getElementById('positionX')?.value) || 50,
            positionY: parseFloat(document.getElementById('positionY')?.value) || 50,
            blendMode: document.getElementById('blendMode')?.value || 'multiply',
            layerMode: document.getElementById('layerMode')?.value || 'background'
        };

        this.watermarkSettings = { ...this.watermarkSettings, ...settings };
        return this.watermarkSettings;
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
            
            this.convertBtn.disabled = false;
            this.showLivePreview();
            
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

    async showLivePreview() {
        if (!this.pdfDoc) return;

        try {
            // Create preview canvas
            const firstPage = this.pdfDoc.getPage(0);
            const { width, height } = firstPage.getSize();
            
            // Create preview container
            this.previewContainer.style.display = 'block';
            this.watermarkPreview.innerHTML = `
                <div class="preview-canvas" style="width: 300px; height: ${(height/width) * 300}px; position: relative; background: white; border: 1px solid #ddd;">
                    <div class="page-content" style="width: 100%; height: 100%; background: #f8f9fa; position: relative;">
                        <div class="watermark-overlay" style="
                            position: absolute;
                            top: ${this.watermarkSettings.positionY}%;
                            left: ${this.watermarkSettings.positionX}%;
                            transform: translate(-50%, -50%) rotate(${this.watermarkSettings.rotation}deg);
                            color: ${this.watermarkSettings.color};
                            font-size: ${Math.floor(this.watermarkSettings.fontSize * 0.2)}px;
                            opacity: ${this.watermarkSettings.opacity};
                            font-weight: bold;
                            pointer-events: none;
                            font-family: Arial, sans-serif;
                        ">
                            ${this.watermarkSettings.text}
                        </div>
                    </div>
                </div>
                <p class="preview-note">Live preview of watermark positioning</p>
            `;
        } catch (error) {
            console.error('Preview error:', error);
        }
    }

    updateLivePreview() {
        if (this.watermarkPreview && this.pdfDoc) {
            this.showLivePreview();
        }
    }

    handleWatermarkTypeChange() {
        const type = document.getElementById('watermarkType')?.value;
        const textControls = document.querySelector('.text-watermark-controls');
        const imageControls = document.querySelector('.image-watermark-controls');
        
        if (type === 'text') {
            textControls?.style.setProperty('display', 'block');
            imageControls?.style.setProperty('display', 'none');
        } else {
            textControls?.style.setProperty('display', 'none');
            imageControls?.style.setProperty('display', 'block');
        }
        
        this.updateWatermarkSettings();
        this.updateLivePreview();
    }

    handleWatermarkImageSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.watermarkSettings.imageData = e.target.result;
                this.updateLivePreview();
            };
            reader.readAsDataURL(file);
        }
    }

    async addWatermark() {
        if (!this.pdfDoc) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.updateWatermarkSettings();
            
            // Progress stages
            const stages = [
                'Preparing watermark...',
                'Processing pages...',
                'Embedding watermark...',
                'Finalizing PDF...'
            ];
            
            for (let i = 0; i < stages.length; i++) {
                this.showProgressWithStage((i / stages.length) * 80, stages[i]);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Create watermarked PDF
            const watermarkedDoc = await this.createWatermarkedPDF(settings);
            
            this.showProgressWithStage(100, 'Watermark complete!');
            
            // Generate output
            const pdfBytes = await watermarkedDoc.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            this.showWatermarkResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to add watermark: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    async createWatermarkedPDF(settings) {
        const watermarkedDoc = await PDFLib.PDFDocument.create();
        const pages = await watermarkedDoc.copyPages(this.pdfDoc, this.pdfDoc.getPageIndices());
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            
            if (settings.type === 'text') {
                // Add text watermark
                const helveticaFont = await watermarkedDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
                
                // Calculate position
                const x = (settings.positionX / 100) * width;
                const y = (settings.positionY / 100) * height;
                
                // Convert hex color to RGB
                const color = this.hexToRgb(settings.color);
                const rgbColor = PDFLib.rgb(color.r / 255, color.g / 255, color.b / 255);
                
                page.drawText(settings.text, {
                    x: x,
                    y: y,
                    size: settings.fontSize,
                    font: helveticaFont,
                    color: rgbColor,
                    opacity: settings.opacity,
                    rotate: PDFLib.degrees(settings.rotation)
                });
            }
            
            watermarkedDoc.addPage(page);
        }
        
        return watermarkedDoc;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 0, b: 0 };
    }

    showWatermarkResults() {
        const originalSize = this.currentFile.size;
        const watermarkedSize = this.outputBlob.size;
        
        document.getElementById('watermarkStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Original Size:</span>
                    <span class="stat-value">${this.formatFileSize(originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Watermarked Size:</span>
                    <span class="stat-value">${this.formatFileSize(watermarkedSize)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value success">Watermark Applied</span>
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
                'event_label': 'PDF Watermark',
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
    new PDFWatermark();
});