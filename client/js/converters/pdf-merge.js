class PDFMerger {
    constructor() {
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filesList = document.getElementById('filesList');
        this.filesContainer = document.getElementById('filesContainer');
        this.addFilesBtn = document.getElementById('addFilesBtn');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.selectedFiles = [];
        this.outputBlob = null;
        this.isFilePickerOpen = false;
    }

    setupEventListeners() {
        // File upload handlers - with click guard to prevent double opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Add more files button
        this.addFilesBtn?.addEventListener('click', this.handleAddMoreFiles.bind(this));
        
        // Convert button
        this.convertBtn.addEventListener('click', this.mergePDFs.bind(this));
        
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
        const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
        if (files.length > 0) {
            this.handleFiles(files);
        }
        // Reset file input
        e.target.value = '';
    }

    handleAddMoreFiles() {
        this.fileInput.click();
    }

    async handleFiles(files) {
        for (const file of files) {
            try {
                // Validate PDF file
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const pageCount = pdfDoc.getPageCount();
                
                this.selectedFiles.push({
                    file: file,
                    pdfDoc: pdfDoc,
                    pageCount: pageCount,
                    id: Date.now() + Math.random()
                });
            } catch (error) {
                this.showError(`Failed to load PDF: ${file.name}`);
            }
        }
        
        this.updateUI();
    }

    updateUI() {
        if (this.selectedFiles.length > 0) {
            this.showFilesList();
            this.convertBtn.disabled = this.selectedFiles.length < 2;
        } else {
            this.hideFilesList();
            this.convertBtn.disabled = true;
        }
    }

    showFilesList() {
        this.uploadArea.style.display = 'none';
        this.filesList.style.display = 'block';
        this.renderFilesList();
    }

    hideFilesList() {
        this.uploadArea.style.display = 'block';
        this.filesList.style.display = 'none';
    }

    renderFilesList() {
        this.filesContainer.innerHTML = '';
        
        this.selectedFiles.forEach((fileData, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = true;
            fileItem.dataset.index = index;
            
            // Create file info section
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            // Create file icon
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-icon';
            fileIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
            `;
            
            // Create file details with safe text content
            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';
            
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = fileData.file.name; // Safe text assignment
            
            const fileMeta = document.createElement('span');
            fileMeta.className = 'file-meta';
            fileMeta.textContent = `${fileData.pageCount} pages • ${this.formatFileSize(fileData.file.size)}`; // Safe text assignment
            
            fileDetails.appendChild(fileName);
            fileDetails.appendChild(fileMeta);
            fileInfo.appendChild(fileIcon);
            fileInfo.appendChild(fileDetails);
            
            // Create file actions section
            const fileActions = document.createElement('div');
            fileActions.className = 'file-actions';
            
            // Move up button
            const moveUpBtn = document.createElement('button');
            moveUpBtn.className = 'move-up-btn';
            if (index === 0) moveUpBtn.disabled = true;
            moveUpBtn.onclick = () => this.moveFile(index, -1);
            moveUpBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 15l-6-6-6 6"/>
                </svg>
            `;
            
            // Move down button
            const moveDownBtn = document.createElement('button');
            moveDownBtn.className = 'move-down-btn';
            if (index === this.selectedFiles.length - 1) moveDownBtn.disabled = true;
            moveDownBtn.onclick = () => this.moveFile(index, 1);
            moveDownBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            `;
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => this.removeFile(index);
            removeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18"/>
                    <path d="M6 6l12 12"/>
                </svg>
            `;
            
            fileActions.appendChild(moveUpBtn);
            fileActions.appendChild(moveDownBtn);
            fileActions.appendChild(removeBtn);
            
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(fileActions);
            this.filesContainer.appendChild(fileItem);
        });
    }

    moveFile(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < this.selectedFiles.length) {
            const temp = this.selectedFiles[index];
            this.selectedFiles[index] = this.selectedFiles[newIndex];
            this.selectedFiles[newIndex] = temp;
            this.renderFilesList();
        }
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateUI();
    }

    async mergePDFs() {
        if (this.selectedFiles.length < 2) return;

        this.showLoading(true);
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            // Create new merged PDF document
            const mergedPdf = await PDFLib.PDFDocument.create();
            let totalPages = 0;
            
            this.showProgress(10);
            
            // Process each file
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const fileData = this.selectedFiles[i];
                const progress = 10 + (i / this.selectedFiles.length) * 70;
                this.showProgress(Math.round(progress));
                
                // Copy pages from source PDF
                const pageIndices = fileData.pdfDoc.getPageIndices();
                const copiedPages = await mergedPdf.copyPages(fileData.pdfDoc, pageIndices);
                
                copiedPages.forEach((page) => {
                    mergedPdf.addPage(page);
                    totalPages++;
                });
            }
            
            this.showProgress(85);
            
            // Generate final PDF
            const pdfBytes = await mergedPdf.save();
            this.outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            // Store merge stats
            this.mergeStats = {
                fileCount: this.selectedFiles.length,
                totalPages: totalPages,
                outputSize: this.outputBlob.size
            };
            
            this.showProgress(100);
            this.showMergeResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Failed to merge PDFs: ' + error.message);
        }

        this.hideProgress();
        this.showLoading(false);
    }

    showMergeResults() {
        const stats = this.mergeStats;
        
        document.getElementById('mergeStats').innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Files Merged:</span>
                    <span class="stat-value">${stats.fileCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Pages:</span>
                    <span class="stat-value">${stats.totalPages}</span>
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
            a.download = `merged_document_${Date.now()}.pdf`;
            a.click();
        }
    }

    trackConversion() {
        // Track the conversion for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': 'PDF Tools',
                'event_label': 'PDF Merge',
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

// Initialize the PDF merger when the page loads
let pdfMerger;
document.addEventListener('DOMContentLoaded', () => {
    pdfMerger = new PDFMerger();
});