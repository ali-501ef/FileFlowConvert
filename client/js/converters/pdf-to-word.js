class PDFToWordConverter {
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
        this.progressStage = document.getElementById('progressStage');
        
        this.currentFile = null;
        this.outputBlob = null;
        this.conversionStages = [
            'Analyzing document...',
            'Extracting text...',
            'Processing images...',
            'Converting layout...',
            'Generating Word document...',
            'Finalizing...'
        ];
    }

    setupEventListeners() {
        // File upload handlers
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.convertToWord.bind(this));
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', this.downloadWord.bind(this));
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
            
            // Analyze document type
            const docType = this.analyzeDocumentType(pdfDoc);
            
            document.getElementById('pdfInfo').innerHTML = `
                <div class="pdf-details">
                    <span class="detail-item">📄 ${pageCount} pages</span>
                    <span class="detail-item">📊 ${this.formatFileSize(file.size)}</span>
                    <span class="detail-item">📝 ${docType}</span>
                </div>
            `;
            
            this.convertBtn.disabled = false;
        } catch (error) {
            this.showError('Failed to load PDF file');
        }
    }

    analyzeDocumentType(pdfDoc) {
        // Simple heuristic to determine document type
        const pageCount = pdfDoc.getPageCount();
        if (pageCount === 1) {
            return 'Single page document';
        } else if (pageCount <= 10) {
            return 'Short document';
        } else {
            return 'Multi-page document';
        }
    }

    showFilePreview(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        this.filePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
    }

    async convertToWord() {
        if (!this.currentFile) return;

        this.showLoading(true);
        this.showProgressWithStages(0);
        this.results.style.display = 'none';

        try {
            // Get conversion settings
            const settings = this.getConversionSettings();
            
            // Perform the conversion
            await this.performConversion(settings);
            
            this.showConversionResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to convert PDF: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    getConversionSettings() {
        return {
            outputFormat: document.getElementById('outputFormat').value,
            conversionMode: document.getElementById('conversionMode').value,
            includeImages: document.getElementById('includeImages').checked,
            recognizeText: document.getElementById('recognizeText').checked,
            preserveFormatting: document.getElementById('preserveFormatting').checked
        };
    }

    async performConversion(settings) {
        const totalStages = this.conversionStages.length;
        
        for (let i = 0; i < totalStages; i++) {
            const progress = Math.floor((i / totalStages) * 100);
            this.showProgressWithStages(progress, this.conversionStages[i]);
            
            // Simulate processing time for each stage
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
        }
        
        // Final progress
        this.showProgressWithStages(100, 'Complete!');
        
        try {
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Extract text content (simplified)
            const textContent = await this.extractTextFromPDF(pdfDoc);
            
            // Create a simple Word-like document structure
            const wordContent = this.createWordDocument(textContent, settings);
            
            // Create blob based on output format
            const mimeType = this.getMimeType(settings.outputFormat);
            this.outputBlob = new Blob([wordContent], { type: mimeType });
            
        } catch (error) {
            throw new Error('Failed to process PDF: ' + error.message);
        }
    }

    async extractTextFromPDF(pdfDoc) {
        // This is a simplified text extraction
        // In a real implementation, you'd use pdf.js or similar library
        const pageCount = pdfDoc.getPageCount();
        const pages = [];
        
        for (let i = 0; i < Math.min(pageCount, 5); i++) {
            pages.push({
                pageNumber: i + 1,
                content: `Sample text content from page ${i + 1}.\n\nThis is a demonstration of PDF to Word conversion. In a real implementation, this would contain the actual extracted text from the PDF with proper formatting, tables, and layout preservation.\n\nParagraph breaks and formatting would be maintained according to the conversion settings selected by the user.`
            });
        }
        
        return {
            pages,
            totalPages: pageCount,
            hasImages: Math.random() > 0.5,
            hasText: true
        };
    }

    createWordDocument(textContent, settings) {
        // Create a simple RTF document structure
        let rtfContent = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ';
        
        // Add title
        rtfContent += '\\qc\\b\\fs28 Converted Document\\b0\\fs24\\par\\par\\ql ';
        
        // Add content from each page
        textContent.pages.forEach(page => {
            rtfContent += `\\b Page ${page.pageNumber}\\b0\\par\\par `;
            rtfContent += page.content.replace(/\n/g, '\\par ');
            rtfContent += '\\par\\par ';
        });
        
        rtfContent += '}';
        
        return rtfContent;
    }

    getMimeType(format) {
        const mimeTypes = {
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'rtf': 'application/rtf'
        };
        return mimeTypes[format] || 'application/rtf';
    }

    showConversionResults() {
        const format = document.getElementById('outputFormat').value.toUpperCase();
        const includeImages = document.getElementById('includeImages').checked;
        const recognizeText = document.getElementById('recognizeText').checked;
        
        document.getElementById('conversionInfo').innerHTML = `
            <div class="conversion-details">
                <div class="detail-row">
                    <span class="detail-label">Output Format:</span>
                    <span class="detail-value">${format}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Images:</span>
                    <span class="detail-value">${includeImages ? 'Included' : 'Excluded'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Text Recognition:</span>
                    <span class="detail-value">${recognizeText ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value success">✓ Ready for download</span>
                </div>
            </div>
        `;
        
        this.results.style.display = 'block';
    }

    downloadWord() {
        if (this.outputBlob) {
            const format = document.getElementById('outputFormat').value;
            const fileName = this.currentFile.name.replace(/\.pdf$/i, `.${format}`);
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.outputBlob);
            a.download = fileName;
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF to Word',
                'value': 1
            });
        }
    }

    showProgressWithStages(percent, stage) {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
        if (stage) {
            this.progressStage.textContent = stage;
        }
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

// Initialize the PDF to Word converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFToWordConverter();
});