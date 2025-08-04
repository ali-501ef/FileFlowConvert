class UniversalHomepageConverter {
    constructor() {
        this.dropZone = document.getElementById('universal-drop-zone');
        this.fileInput = document.getElementById('universal-file-input');
        this.chooseFileBtn = document.getElementById('choose-file-btn');
        this.outputFormatSelect = document.getElementById('output-format');
        this.convertBtn = document.getElementById('convert-now-btn');
        
        this.selectedFile = null;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        if (!this.dropZone || !this.fileInput || !this.chooseFileBtn || !this.convertBtn) {
            return; // Elements not found, homepage converter not available
        }
        
        // Drop zone events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        
        // File input events
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Button events
        this.chooseFileBtn.addEventListener('click', () => this.fileInput.click());
        this.convertBtn.addEventListener('click', this.handleConvert.bind(this));
        
        // Format change events
        this.outputFormatSelect.addEventListener('change', this.updateConvertButton.bind(this));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.selectFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.selectFile(files[0]);
        }
    }
    
    selectFile(file) {
        this.selectedFile = file;
        this.updateDropZoneText();
        this.updateConvertButton();
    }
    
    updateDropZoneText() {
        if (this.selectedFile) {
            const dropZoneContent = this.dropZone.querySelector('.drop-zone-content');
            
            // Clear existing content
            dropZoneContent.innerHTML = '';
            
            // Add preview based on file type
            this.addFilePreview(dropZoneContent, this.selectedFile);
            
            // Add file info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-preview-info';
            fileInfo.innerHTML = `
                <p class="file-preview-name">${this.selectedFile.name}</p>
                <p class="file-preview-size">${this.formatFileSize(this.selectedFile.size)} • Click to change file</p>
            `;
            dropZoneContent.appendChild(fileInfo);
        }
    }
    
    addFilePreview(container, file) {
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'file-preview-wrapper';
        
        if (file.type.startsWith('image/')) {
            // Image preview
            const img = document.createElement('img');
            img.className = 'file-preview-image';
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            previewWrapper.appendChild(img);
        } else if (file.type === 'application/pdf') {
            // PDF icon preview
            const pdfIcon = document.createElement('div');
            pdfIcon.className = 'file-preview-icon pdf-icon';
            pdfIcon.innerHTML = `
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            `;
            previewWrapper.appendChild(pdfIcon);
        } else if (file.type.startsWith('video/')) {
            // Video thumbnail/icon
            const videoIcon = document.createElement('div');
            videoIcon.className = 'file-preview-icon video-icon';
            videoIcon.innerHTML = `
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
            `;
            previewWrapper.appendChild(videoIcon);
        } else {
            // Generic file icon
            const fileIcon = document.createElement('div');
            fileIcon.className = 'file-preview-icon generic-icon';
            fileIcon.innerHTML = `
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            `;
            previewWrapper.appendChild(fileIcon);
        }
        
        container.appendChild(previewWrapper);
    }
    
    updateConvertButton() {
        const hasFile = this.selectedFile !== null;
        const hasFormat = this.outputFormatSelect && this.outputFormatSelect.value;
        
        if (this.convertBtn) {
            this.convertBtn.disabled = !hasFile || !hasFormat;
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    handleConvert() {
        if (!this.selectedFile) {
            alert('Please select a file first.');
            return;
        }
        
        const outputFormat = this.outputFormatSelect.value;
        if (!outputFormat) {
            alert('Please select an output format.');
            return;
        }
        
        // Redirect to appropriate converter based on file type and output format
        this.redirectToSpecificConverter(this.selectedFile, outputFormat);
    }
    
    redirectToSpecificConverter(file, outputFormat) {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        
        // Store file in sessionStorage to pass to the converter page
        const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        };
        
        // For small images only (under 5MB), store in sessionStorage
        if (file.size <= 5 * 1024 * 1024 && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    fileData.data = e.target.result;
                    sessionStorage.setItem('pendingFile', JSON.stringify(fileData));
                    sessionStorage.setItem('targetFormat', outputFormat);
                } catch (error) {
                    console.warn('SessionStorage quota exceeded, proceeding without file data');
                }
                
                // Redirect based on conversion type
                this.performRedirect(file, outputFormat);
            };
            reader.readAsDataURL(file);
        } else {
            // For larger files or non-images, redirect without storing data
            this.performRedirect(file, outputFormat);
        }
    }
    
    performRedirect(file, outputFormat) {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        
        if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            // For JPEG output, use universal converter or HEIC converter
            if (fileType.includes('heic') || fileName.includes('.heic')) {
                window.location.href = '/heic-to-jpg.html';
            } else {
                window.location.href = '/convert-to-jpeg.html';
            }
        } else if (outputFormat === 'png') {
            // For PNG output
            if (fileType.includes('jpeg') || fileType.includes('jpg')) {
                window.location.href = '/jpg-to-png.html';
            } else {
                window.location.href = '/convert-to-jpeg.html'; // Use universal converter
            }
        } else if (outputFormat === 'pdf') {
            window.location.href = '/pdf-merge.html';
        } else if (outputFormat === 'mp3') {
            window.location.href = '/mp4-to-mp3.html';
        } else {
            // Default to universal converter
            window.location.href = '/convert-to-jpeg.html';
        }
    }
}

// Initialize the universal homepage converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        new UniversalHomepageConverter();
    }
});