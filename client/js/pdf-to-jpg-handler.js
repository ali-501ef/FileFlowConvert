/**
 * PDF to JPG Converter Handler
 * Handles PDF to JPG conversion with advanced options
 */

class PDFToJPGHandler {
    constructor() {
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
        
        // Filter PDF files only
        const validFiles = fileArray.filter(file => {
            return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        });

        if (validFiles.length === 0) {
            alert('Please select valid PDF files.');
            return;
        }

        this.selectedFiles = validFiles;
        this.displayFilePreview(validFiles);
        this.enableConvertButton();
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
            // Clear existing content safely
            fileList.replaceChildren();
            
            // Create DOM elements safely without innerHTML
            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info';
                
                const fileName = document.createElement('div');
                fileName.className = 'file-name';
                fileName.textContent = file.name; // Safe - uses textContent instead of innerHTML
                
                const fileSize = document.createElement('div');
                fileSize.className = 'file-size';
                fileSize.textContent = this.formatFileSize(file.size); // Safe - uses textContent
                
                fileInfo.appendChild(fileName);
                fileInfo.appendChild(fileSize);
                fileItem.appendChild(fileInfo);
                fileList.appendChild(fileItem);
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

    enableConvertButton() {
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            convertBtn.disabled = false;
        }
    }

    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('Please select PDF files to convert.');
            return;
        }

        if (this.isConverting) return;

        this.isConverting = true;
        this.showProgress();

        try {
            const options = this.getAdvancedOptions();
            
            for (const file of this.selectedFiles) {
                await this.convertSingleFile(file, options);
            }

            this.hideProgress();
            this.showResults();

        } catch (error) {
            console.error('Conversion failed:', error);
            console.error('Error details:', error.message, error.stack);
            alert(`Conversion failed: ${error.message || 'Unknown error'}. Please check console for details.`);
            this.hideProgress();
        } finally {
            this.isConverting = false;
        }
    }

    async convertSingleFile(file, options) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if PDF.js is available
                if (typeof pdfjsLib === 'undefined') {
                    throw new Error('PDF.js library not loaded. Please refresh the page.');
                }
                
                console.log('Starting conversion for:', file.name);
                // Use PDF.js to render PDF pages to canvas and convert to JPG
                const arrayBuffer = await file.arrayBuffer();
                console.log('File loaded, size:', arrayBuffer.byteLength);
                
                // Convert ArrayBuffer to Uint8Array for PDF.js
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Load PDF with proper options for PDF.js
                const pdf = await pdfjsLib.getDocument({
                    data: uint8Array,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                    cMapPacked: true,
                    standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
                }).promise;
                console.log('PDF loaded, pages:', pdf.numPages);
                
                const pageRange = this.getPageRange(pdf.numPages, options);
                const images = [];

                for (const pageNum of pageRange) {
                    const page = await pdf.getPage(pageNum);
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');

                    // Set resolution based on DPI setting
                    const scale = options.resolution / 72; // 72 is default PDF DPI
                    const viewport = page.getViewport({ scale });

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ 
                        canvasContext: context, 
                        viewport: viewport 
                    }).promise;

                    // Convert canvas to JPG blob
                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/jpeg', options.quality / 100);
                    });

                    const filename = this.generateOutputFilename(file.name, pageNum, pdf.numPages > 1);
                    images.push({ blob, filename });
                }

                // Download all images
                console.log('Conversion complete, downloading', images.length, 'images');
                this.downloadImages(images);
                resolve();

            } catch (error) {
                console.error('Single file conversion error:', error);
                reject(error);
            }
        });
    }

    getPageRange(totalPages, options) {
        const { pageRange, customPages } = options;
        
        if (pageRange === 'first') {
            return [1];
        } else if (pageRange === 'all') {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        } else if (pageRange === 'custom' && customPages) {
            return this.parsePageRange(customPages, totalPages);
        }
        
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    parsePageRange(rangeString, totalPages) {
        const pages = new Set();
        const parts = rangeString.split(',');
        
        for (let part of parts) {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                    pages.add(i);
                }
            } else {
                const pageNum = parseInt(part);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    pages.add(pageNum);
                }
            }
        }
        
        return Array.from(pages).sort((a, b) => a - b);
    }

    getAdvancedOptions() {
        const options = {
            quality: 85,
            resolution: 300,
            pageRange: 'all',
            customPages: ''
        };

        const qualitySelect = document.getElementById('jpgQuality');
        if (qualitySelect) {
            options.quality = parseInt(qualitySelect.value);
        }

        const resolutionSelect = document.getElementById('outputResolution');
        if (resolutionSelect) {
            options.resolution = parseInt(resolutionSelect.value);
        }

        const pageRangeSelect = document.getElementById('pageRange');
        if (pageRangeSelect) {
            options.pageRange = pageRangeSelect.value;
        }

        const customPagesInput = document.getElementById('customPages');
        if (customPagesInput) {
            options.customPages = customPagesInput.value;
        }

        return options;
    }

    generateOutputFilename(originalName, pageNum, multiPage) {
        const baseName = originalName.replace(/\.pdf$/i, '');
        if (multiPage) {
            return `${baseName}_page_${pageNum}.jpg`;
        } else {
            return `${baseName}.jpg`;
        }
    }

    downloadImages(images) {
        images.forEach((image, index) => {
            setTimeout(() => {
                this.downloadFile(image.blob, image.filename);
            }, index * 100); // Stagger downloads slightly
        });
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

    showProgress() {
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');
        const progressContainer = document.getElementById('progressContainer');

        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'block';
        if (convertBtn) convertBtn.disabled = true;
        if (progressContainer) progressContainer.style.display = 'block';
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

    showResults() {
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'block';
        }
    }
}

// Initialize the PDF to JPG handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pdfToJPGHandler = new PDFToJPGHandler();
});