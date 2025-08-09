class PDFSplitter {
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
        this.resultsList = document.getElementById('resultsList');
        this.splitMode = document.getElementById('splitMode');
        this.pageRange = document.getElementById('pageRange');
        this.intervalSize = document.getElementById('intervalSize');
        this.rangeGroup = document.getElementById('rangeGroup');
        this.intervalGroup = document.getElementById('intervalGroup');
        
        this.currentFile = null;
        this.pdfDoc = null;
        this.totalPages = 0;
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.splitPDF.bind(this));
        
        // Split mode change
        this.splitMode.addEventListener('change', this.handleModeChange.bind(this));
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
            this.totalPages = this.pdfDoc.getPageCount();
            
            document.getElementById('pdfInfo').innerHTML = `
                <div class="pdf-details">
                    <span class="detail-item">📄 ${this.totalPages} pages</span>
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
        // Keep upload area visible but disable interactions during processing
        this.fileInput.disabled = false;
        this.uploadArea.classList.remove('busy');
    }

    handleModeChange() {
        const mode = this.splitMode.value;
        this.rangeGroup.style.display = mode === 'range' ? 'block' : 'none';
        this.intervalGroup.style.display = mode === 'interval' ? 'block' : 'none';
    }

    async splitPDF() {
        if (!this.pdfDoc) return;

        this.showLoading(true);
        // Disable upload area during processing
        this.fileInput.disabled = true;
        this.uploadArea.classList.add('busy');
        this.results.style.display = 'none';
        this.resultsList.innerHTML = '';

        try {
            const mode = this.splitMode.value;
            let splits = [];

            switch (mode) {
                case 'all':
                    splits = this.getAllPagesSplit();
                    break;
                case 'range':
                    splits = this.getRangeSplit();
                    break;
                case 'interval':
                    splits = this.getIntervalSplit();
                    break;
            }

            const results = await this.createSplitPDFs(splits);
            this.showResults(results);
            
            // Track conversion
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to split PDF: ' + error.message);
        }

        this.showLoading(false);
        // Re-enable upload area after processing
        this.fileInput.disabled = false;
        this.uploadArea.classList.remove('busy');
    }

    getAllPagesSplit() {
        const splits = [];
        for (let i = 0; i < this.totalPages; i++) {
            splits.push({
                name: `page_${i + 1}.pdf`,
                pages: [i]
            });
        }
        return splits;
    }

    getRangeSplit() {
        const rangeText = this.pageRange.value.trim();
        if (!rangeText) {
            throw new Error('Please enter a page range');
        }

        const splits = [];
        const ranges = rangeText.split(',').map(r => r.trim());
        
        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            let pages = [];
            let name = '';

            if (range.includes('-')) {
                const [start, end] = range.split('-').map(n => parseInt(n.trim()));
                if (start < 1 || end > this.totalPages || start > end) {
                    throw new Error(`Invalid range: ${range}`);
                }
                for (let p = start - 1; p < end; p++) {
                    pages.push(p);
                }
                name = `pages_${start}-${end}.pdf`;
            } else {
                const pageNum = parseInt(range);
                if (pageNum < 1 || pageNum > this.totalPages) {
                    throw new Error(`Invalid page number: ${pageNum}`);
                }
                pages.push(pageNum - 1);
                name = `page_${pageNum}.pdf`;
            }

            splits.push({ name, pages });
        }

        return splits;
    }

    getIntervalSplit() {
        const interval = parseInt(this.intervalSize.value);
        if (interval < 1) {
            throw new Error('Interval must be at least 1');
        }

        const splits = [];
        for (let i = 0; i < this.totalPages; i += interval) {
            const pages = [];
            const endPage = Math.min(i + interval, this.totalPages);
            
            for (let p = i; p < endPage; p++) {
                pages.push(p);
            }

            const name = interval === 1 
                ? `page_${i + 1}.pdf`
                : `pages_${i + 1}-${endPage}.pdf`;
            
            splits.push({ name, pages });
        }

        return splits;
    }

    async createSplitPDFs(splits) {
        const results = [];

        for (const split of splits) {
            const newDoc = await PDFLib.PDFDocument.create();
            
            for (const pageIndex of split.pages) {
                const [page] = await newDoc.copyPages(this.pdfDoc, [pageIndex]);
                newDoc.addPage(page);
            }

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            results.push({
                name: split.name,
                blob: blob,
                url: url,
                size: pdfBytes.length,
                pages: split.pages.length
            });
        }

        return results;
    }

    showResults(results) {
        this.resultsList.innerHTML = '';
        
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-info">
                    <div class="result-name">${result.name}</div>
                    <div class="result-details">
                        ${result.pages} page${result.pages > 1 ? 's' : ''} • ${this.formatFileSize(result.size)}
                    </div>
                </div>
                <button class="download-btn" data-url="${result.url}" data-name="${result.name}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
            `;
            
            // Add event listener for download button
            const downloadBtn = resultItem.querySelector('.download-btn');
            downloadBtn.addEventListener('click', () => {
                this.downloadFile(result.url, result.name);
            });
            
            this.resultsList.appendChild(resultItem);
        });

        // Add download all button if multiple files
        if (results.length > 1) {
            const downloadAllBtn = document.createElement('button');
            downloadAllBtn.className = 'download-all-btn';
            downloadAllBtn.innerHTML = '📦 Download All as ZIP';
            downloadAllBtn.onclick = () => this.downloadAllAsZip(results);
            this.resultsList.appendChild(downloadAllBtn);
        }

        this.results.style.display = 'block';
    }

    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    }

    async downloadAllAsZip(results) {
        // For now, just download files individually
        // In a real implementation, you'd use a library like JSZip
        results.forEach((result, index) => {
            setTimeout(() => {
                this.downloadFile(result.url, result.name);
            }, index * 500);
        });
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF Split',
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

// Initialize the PDF splitter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PDFSplitter();
});