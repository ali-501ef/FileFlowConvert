/**
 * Server-side PDF to JPG Converter Handler
 * Uses server API for conversion instead of client-side processing
 */

class PDFToJPGServerHandler {
    constructor() {
        this.selectedFiles = [];
        this.isConverting = false;
        this.currentFileId = null;
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
        // Handle custom page range visibility
        const pageRangeSelect = document.getElementById('pageRange');
        const customRangeGroup = document.getElementById('customRangeGroup');
        
        if (pageRangeSelect && customRangeGroup) {
            pageRangeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customRangeGroup.style.display = 'block';
                } else {
                    customRangeGroup.style.display = 'none';
                }
            });
        }
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFiles(files) {
        const fileArray = Array.from(files);
        
        // Only accept single PDF file for server processing
        if (fileArray.length > 1) {
            this.showError('Please select only one PDF file at a time.');
            return;
        }

        // Filter PDF files only
        const validFiles = fileArray.filter(file => {
            return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        });

        if (validFiles.length === 0) {
            this.showError('Please select a valid PDF file.');
            return;
        }

        this.selectedFiles = validFiles;
        this.displayFilePreview(validFiles);
        this.enableConvertButton();
        this.hideError();
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
            this.showError('Please select a PDF file to convert.');
            return;
        }

        if (this.isConverting) return;

        this.isConverting = true;
        this.hideError();
        this.showProgress('Uploading file...');

        try {
            // Step 1: Upload file
            const uploadResult = await this.uploadFile(this.selectedFiles[0]);
            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Upload failed');
            }

            this.currentFileId = uploadResult.fileId;

            // Step 2: Convert file
            this.updateProgress('Converting PDF to JPG...');
            const convertResult = await this.convertFile(uploadResult.fileId);
            
            if (!convertResult.success) {
                throw new Error(convertResult.error || 'Conversion failed');
            }

            // Step 3: Download result
            this.updateProgress('Preparing download...');
            await this.downloadFile(convertResult.downloadUrl, convertResult.filename);

            this.hideProgress();
            this.showResults(convertResult);

        } catch (error) {
            console.error('Conversion process failed:', error);
            this.showError(error.message);
            this.hideProgress();
        } finally {
            this.isConverting = false;
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/pdf-to-jpg/upload', {
            method: 'POST',
            body: formData
        });

        return await response.json();
    }

    async convertFile(fileId) {
        const options = this.getAdvancedOptions();
        
        const response = await fetch('/api/pdf-to-jpg/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileId,
                options
            })
        });

        return await response.json();
    }

    async downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getAdvancedOptions() {
        const options = {};
        
        // DPI/Resolution
        const resolutionSelect = document.getElementById('outputResolution');
        if (resolutionSelect && resolutionSelect.value) {
            options.dpi = resolutionSelect.value;
        }

        // Quality
        const qualitySelect = document.getElementById('jpgQuality');
        if (qualitySelect && qualitySelect.value) {
            const qualityValue = parseInt(qualitySelect.value);
            if (qualityValue >= 90) options.quality = 'high';
            else if (qualityValue >= 80) options.quality = 'medium';
            else options.quality = 'low';
        }

        // Page range
        const pageRangeSelect = document.getElementById('pageRange');
        if (pageRangeSelect && pageRangeSelect.value !== 'all') {
            if (pageRangeSelect.value === 'first') {
                options.pageRange = { first: 1, last: 1 };
            } else if (pageRangeSelect.value === 'custom') {
                const customPagesInput = document.getElementById('customPages');
                if (customPagesInput && customPagesInput.value.trim()) {
                    const range = this.parsePageRange(customPagesInput.value.trim());
                    if (range) {
                        options.pageRange = range;
                    }
                }
            }
        }

        return options;
    }

    parsePageRange(rangeString) {
        // Simple range parsing for "1-5" format
        const match = rangeString.match(/^(\d+)-(\d+)$/);
        if (match) {
            return {
                first: parseInt(match[1]),
                last: parseInt(match[2])
            };
        }
        
        // Single page
        const singleMatch = rangeString.match(/^(\d+)$/);
        if (singleMatch) {
            const page = parseInt(singleMatch[1]);
            return { first: page, last: page };
        }
        
        return null;
    }

    showProgress(message) {
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');
        const progressContainer = document.getElementById('progressContainer');

        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'block';
        if (convertBtn) convertBtn.disabled = true;
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
            const progressText = progressContainer.querySelector('#progressText');
            if (progressText) progressText.textContent = message;
        }
    }

    updateProgress(message) {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            const progressText = progressContainer.querySelector('#progressText');
            if (progressText) progressText.textContent = message;
        }
    }

    hideProgress() {
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');
        const progressContainer = document.getElementById('progressContainer');

        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        if (convertBtn) convertBtn.disabled = false;
        if (progressContainer) progressContainer.style.display = 'none';
    }

    showResults(result) {
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'block';
            
            // Update result message
            const resultMessage = results.querySelector('h3');
            if (resultMessage) {
                resultMessage.textContent = result.isMultiPage ? 
                    'Conversion Complete - Multiple Images Downloaded' : 
                    'Conversion Complete - Image Downloaded';
            }
        }
    }

    showError(message) {
        // Remove existing error message
        this.hideError();
        
        // Create error element
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'conversion-error';
            errorDiv.style.cssText = `
                color: #dc2626;
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 6px;
                padding: 12px;
                margin-top: 16px;
                font-size: 14px;
                line-height: 1.4;
            `;
            errorDiv.textContent = message;
            uploadArea.parentNode.insertBefore(errorDiv, uploadArea.nextSibling);
        }
    }

    hideError() {
        const existingError = document.querySelector('.conversion-error');
        if (existingError) {
            existingError.remove();
        }
    }
}

// Initialize the PDF to JPG server handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pdfToJPGServerHandler = new PDFToJPGServerHandler();
});