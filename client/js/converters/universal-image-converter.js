/**
 * Universal Image Converter
 * Handles image conversion between all supported formats with advanced options
 */

class ImageConverter {
    constructor(config = {}) {
        this.inputFormat = config.inputFormat || 'jpg';
        this.outputFormat = config.outputFormat || 'png';
        this.acceptedTypes = config.acceptedTypes || '.jpg,.jpeg';
        this.toolName = config.toolName || 'Image Converter';
        
        this.selectedFiles = [];
        this.isConverting = false;
        
        this.init();
    }
    
    init() {
        this.setupFileInput();
        this.setupDropZone();
        this.setupConvertButton();
        this.setupAdvancedOptions();
    }
    
    setupFileInput() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }
    
    setupDropZone() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, this.preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
            });
            
            uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                this.handleFiles(files);
            }, false);
        }
    }
    
    setupConvertButton() {
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            convertBtn.addEventListener('click', () => {
                this.convertFiles();
            });
        }
    }
    
    setupAdvancedOptions() {
        // Advanced options are handled by the separate advanced-options.js file
        // This method can be extended for tool-specific options
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleFiles(files) {
        const fileArray = Array.from(files);
        
        // Filter files based on accepted types
        const validFiles = fileArray.filter(file => {
            return this.isValidFileType(file);
        });
        
        if (validFiles.length === 0) {
            alert(`Please select valid ${this.inputFormat.toUpperCase()} files.`);
            return;
        }
        
        this.selectedFiles = validFiles;
        this.displayFilePreview(validFiles);
        this.enableConvertButton();
    }
    
    isValidFileType(file) {
        const fileName = file.name.toLowerCase();
        const acceptedExtensions = this.acceptedTypes.split(',').map(ext => ext.trim());
        
        return acceptedExtensions.some(ext => {
            const cleanExt = ext.replace('.', '');
            return fileName.endsWith('.' + cleanExt) || file.type.includes(cleanExt);
        });
    }
    
    displayFilePreview(files) {
        const filePreview = document.getElementById('filePreview');
        const fileList = document.getElementById('fileList');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        
        if (filePreview) {
            filePreview.style.display = 'block';
        }
        
        if (files.length === 1) {
            if (fileName) fileName.textContent = files[0].name;
            if (fileSize) fileSize.textContent = this.formatFileSize(files[0].size);
        } else {
            if (fileName) fileName.textContent = `${files.length} files selected`;
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            if (fileSize) fileSize.textContent = this.formatFileSize(totalSize);
        }
        
        if (fileList) {
            fileList.innerHTML = files.map(file => `
                <div class="file-item">
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    enableConvertButton() {
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            convertBtn.disabled = false;
        }
    }
    
    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert(`Please select ${this.inputFormat.toUpperCase()} files to convert.`);
            return;
        }
        
        if (this.isConverting) return;
        
        this.isConverting = true;
        this.showProgress();
        
        try {
            const results = [];
            
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress(
                    (i / this.selectedFiles.length) * 100, 
                    `Converting ${file.name}...`
                );
                
                try {
                    const convertedBlob = await this.convertSingleFile(file);
                    const outputFilename = this.generateOutputFilename(file.name);
                    
                    results.push({
                        filename: outputFilename,
                        blob: convertedBlob
                    });
                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    // Continue with other files
                }
            }
            
            this.updateProgress(100, 'Conversion complete!');
            this.showDownloadResults(results);
            
        } catch (error) {
            console.error('Conversion failed:', error);
            alert('Conversion failed. Please try again.');
        } finally {
            this.isConverting = false;
            this.hideProgress();
        }
    }
    
    async convertSingleFile(file) {
        const advancedOptions = this.getAdvancedOptions();
        
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                try {
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    
                    // Handle background for formats that don't support transparency
                    if (this.outputFormat === 'jpg' && advancedOptions.backgroundColor) {
                        ctx.fillStyle = advancedOptions.backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    ctx.drawImage(img, 0, 0);
                    
                    // Apply any transformations based on advanced options
                    this.applyAdvancedOptions(canvas, ctx, advancedOptions);
                    
                    const quality = this.getOutputQuality(advancedOptions);
                    const mimeType = this.getOutputMimeType();
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create output blob'));
                        }
                    }, mimeType, quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    getAdvancedOptions() {
        const options = {};
        
        // Quality settings
        const qualitySelect = document.getElementById('jpgQuality') || 
                            document.getElementById('pngQuality') || 
                            document.getElementById('compressionLevel');
        if (qualitySelect) {
            options.quality = parseFloat(qualitySelect.value);
        }
        
        // Background settings
        const backgroundSelect = document.getElementById('backgroundColor') || 
                               document.getElementById('preserveTransparency');
        if (backgroundSelect) {
            const value = backgroundSelect.value;
            if (value === 'white') options.backgroundColor = '#ffffff';
            else if (value === 'black') options.backgroundColor = '#000000';
            else if (value === 'preserve') options.preserveTransparency = true;
        }
        
        // Progressive JPEG
        const progressiveSelect = document.getElementById('progressive');
        if (progressiveSelect) {
            options.progressive = progressiveSelect.value === 'true';
        }
        
        // SVG scale factor
        const scaleSelect = document.getElementById('scale');
        if (scaleSelect) {
            options.scale = parseFloat(scaleSelect.value);
        }
        
        // Output width for SVG
        const widthSelect = document.getElementById('outputWidth');
        if (widthSelect && widthSelect.value !== 'auto') {
            options.outputWidth = parseInt(widthSelect.value);
        }
        
        return options;
    }
    
    applyAdvancedOptions(canvas, ctx, options) {
        // Apply scaling if specified
        if (options.scale && options.scale !== 1) {
            const originalWidth = canvas.width;
            const originalHeight = canvas.height;
            
            canvas.width = originalWidth * options.scale;
            canvas.height = originalHeight * options.scale;
            
            ctx.scale(options.scale, options.scale);
        }
        
        // Apply output width if specified
        if (options.outputWidth) {
            const originalWidth = canvas.width;
            const originalHeight = canvas.height;
            const aspectRatio = originalHeight / originalWidth;
            
            canvas.width = options.outputWidth;
            canvas.height = options.outputWidth * aspectRatio;
        }
    }
    
    getOutputQuality(options) {
        if (this.outputFormat === 'jpg' || this.outputFormat === 'jpeg') {
            return (options.quality || 85) / 100;
        }
        return 1.0; // PNG and other formats
    }
    
    getOutputMimeType() {
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'bmp': 'image/bmp'
        };
        
        return mimeTypes[this.outputFormat] || 'image/png';
    }
    
    generateOutputFilename(inputFilename) {
        return inputFilename.replace(/\.[^/.]+$/, `.${this.outputFormat}`);
    }
    
    showProgress() {
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'block';
        if (convertBtn) convertBtn.disabled = true;
    }
    
    updateProgress(percent, message) {
        // Progress updates can be displayed in the UI if needed
        console.log(`Progress: ${percent}% - ${message}`);
    }
    
    hideProgress() {
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');
        
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        if (convertBtn) convertBtn.disabled = false;
    }
    
    showDownloadResults(results) {
        if (results.length === 0) {
            alert('No files were converted successfully.');
            return;
        }
        
        if (results.length === 1) {
            // Single file - auto download
            this.downloadFile(results[0].blob, results[0].filename);
        } else {
            // Multiple files - show download links or create zip
            this.downloadMultipleFiles(results);
        }
    }
    
    downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
    
    downloadMultipleFiles(results) {
        // For now, download files one by one
        // In the future, this could create a ZIP file
        results.forEach((result, index) => {
            setTimeout(() => {
                this.downloadFile(result.blob, result.filename);
            }, index * 1000); // Stagger downloads
        });
    }
}

// Global initialization function
window.initImageConverter = function(config) {
    return new ImageConverter(config);
};