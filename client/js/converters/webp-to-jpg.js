class WebpToJpgConverter {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.imagePreview = document.getElementById('imagePreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.results = document.getElementById('results');
        this.resultsList = document.getElementById('resultsList');
        this.jpgQuality = document.getElementById('jpgQuality');
        this.outputSize = document.getElementById('outputSize');
        
        this.selectedFiles = [];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Convert button click
        this.convertBtn.addEventListener('click', () => this.convertFiles());
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type === 'image/webp'
        );
        
        if (files.length > 0) {
            this.processFiles(files);
        }
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }
    
    processFiles(files) {
        this.selectedFiles = files;
        this.displayFilePreview();
        this.convertBtn.disabled = false;
    }
    
    displayFilePreview() {
        if (this.selectedFiles.length === 0) return;
        
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        
        if (this.selectedFiles.length === 1) {
            this.fileName.textContent = this.selectedFiles[0].name;
        } else {
            this.fileName.textContent = `${this.selectedFiles.length} files selected`;
        }
        
        this.fileSize.textContent = this.formatFileSize(totalSize);
        
        // Show preview of first image
        if (this.selectedFiles.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                `;
            };
            reader.readAsDataURL(this.selectedFiles[0]);
        }
        
        this.filePreview.style.display = 'block';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async convertFiles() {
        this.convertBtn.disabled = true;
        this.convertBtn.querySelector('.btn-text').textContent = 'Converting...';
        this.convertBtn.querySelector('.btn-loader').style.display = 'inline-block';
        
        const convertedFiles = [];
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            try {
                const convertedBlob = await this.convertWebpToJpg(this.selectedFiles[i]);
                const fileName = this.selectedFiles[i].name.replace(/\.webp$/i, '.jpg');
                convertedFiles.push({
                    blob: convertedBlob,
                    name: fileName,
                    originalSize: this.selectedFiles[i].size,
                    convertedSize: convertedBlob.size
                });
            } catch (error) {
                console.error('Conversion failed for file:', this.selectedFiles[i].name, error);
            }
        }
        
        this.displayResults(convertedFiles);
        
        this.convertBtn.disabled = false;
        this.convertBtn.querySelector('.btn-text').textContent = 'Convert to JPG';
        this.convertBtn.querySelector('.btn-loader').style.display = 'none';
    }
    
    async convertWebpToJpg(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Handle output size
                let width = img.width;
                let height = img.height;
                
                if (this.outputSize.value !== 'original') {
                    const [targetWidth, targetHeight] = this.outputSize.value.split('x').map(Number);
                    const aspectRatio = width / height;
                    
                    if (width > height) {
                        width = targetWidth;
                        height = targetWidth / aspectRatio;
                    } else {
                        height = targetHeight;
                        width = targetHeight * aspectRatio;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', this.jpgQuality.value / 100);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }
    
    displayResults(convertedFiles) {
        this.resultsList.innerHTML = '';
        
        convertedFiles.forEach((file, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-info">
                    <h4>${file.name}</h4>
                    <p>Original: ${this.formatFileSize(file.originalSize)} → Converted: ${this.formatFileSize(file.convertedSize)}</p>
                </div>
                <button class="download-btn" onclick="downloadFile(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
            `;
            this.resultsList.appendChild(resultItem);
        });
        
        // Store converted files globally for download
        window.convertedFiles = convertedFiles;
        
        this.results.style.display = 'block';
    }
}

function downloadFile(index) {
    const file = window.convertedFiles[index];
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize converter when page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebpToJpgConverter();
});