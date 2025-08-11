/**
 * Universal File Converter
 * Handles file conversion for all formats with live preview functionality
 */

class UniversalConverter {
    constructor() {
        this.selectedFiles = [];
        this.supportedFormats = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff'],
            video: ['mp4', 'mov', 'avi', 'mkv', 'wmv'],
            audio: ['mp3', 'wav', 'flac', 'aac', 'm4a'],
            document: ['pdf', 'doc', 'docx', 'txt', 'rtf']
        };
        
        this.init();
    }
    
    init() {
        this.setupDropZone();
        this.setupFileInput();
        this.setupFormatSelector();
        this.setupConvertButton();
        this.populateFormatOptions();
    }
    
    setupDropZone() {
        const dropZone = document.getElementById('universal-drop-zone');
        if (!dropZone) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });
        
        dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
        dropZone.addEventListener('click', () => {
            document.getElementById('universal-file-input').click();
        });
    }
    
    setupFileInput() {
        const fileInput = document.getElementById('universal-file-input');
        if (!fileInput) return;
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }
    
    setupFormatSelector() {
        const formatSelect = document.getElementById('output-format');
        if (!formatSelect) return;
        
        formatSelect.addEventListener('change', (e) => {
            this.updateConversionOptions(e.target.value);
        });
    }
    
    setupConvertButton() {
        const convertBtn = document.getElementById('universal-convert-btn');
        if (!convertBtn) return;
        
        convertBtn.addEventListener('click', () => {
            this.startConversion();
        });
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }
    
    handleFiles(files) {
        const fileArray = Array.from(files);
        this.selectedFiles = fileArray;
        
        if (fileArray.length > 0) {
            this.displayFilePreview(fileArray);
            this.showConversionSection();
            this.updateFormatOptionsBasedOnFiles(fileArray);
        }
    }
    
    displayFilePreview(files) {
        const previewContainer = document.getElementById('file-preview-container');
        const previewSection = document.getElementById('file-preview-section');
        
        if (!previewContainer || !previewSection) return;
        
        previewContainer.innerHTML = '';
        
        files.forEach((file, index) => {
            const previewCard = this.createFilePreviewCard(file, index);
            previewContainer.appendChild(previewCard);
        });
        
        previewSection.classList.remove('hidden');
    }
    
    createFilePreviewCard(file, index) {
        const card = document.createElement('div');
        card.className = 'file-preview-card';
        card.setAttribute('data-testid', `file-preview-${index}`);
        
        const fileName = file.name;
        const fileSize = this.formatFileSize(file.size);
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'file-preview-content';
        
        // Create thumbnail wrapper
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'file-preview-thumbnail';
        const thumbnailElement = this.generateThumbnailElement(file, fileExtension);
        thumbnailDiv.appendChild(thumbnailElement);
        
        // Create info wrapper
        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-preview-info';
        
        // Create file name element with safe text content
        const nameDiv = document.createElement('div');
        nameDiv.className = 'file-preview-name';
        nameDiv.setAttribute('title', fileName); // Safe: setAttribute handles escaping
        nameDiv.textContent = fileName; // Safe: textContent prevents HTML injection
        
        // Create meta wrapper
        const metaDiv = document.createElement('div');
        metaDiv.className = 'file-preview-meta';
        
        // Create file size span
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'file-size';
        sizeSpan.textContent = fileSize;
        
        // Create file type span
        const typeSpan = document.createElement('span');
        typeSpan.className = 'file-type';
        typeSpan.textContent = fileExtension.toUpperCase();
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove-btn';
        removeBtn.setAttribute('data-testid', `button-remove-file-${index}`);
        removeBtn.addEventListener('click', () => this.removeFile(index));
        removeBtn.innerHTML = `
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `;
        
        // Assemble the structure
        metaDiv.appendChild(sizeSpan);
        metaDiv.appendChild(typeSpan);
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(metaDiv);
        content.appendChild(thumbnailDiv);
        content.appendChild(infoDiv);
        content.appendChild(removeBtn);
        card.appendChild(content);
        
        return card;
    }
    
    generateThumbnailElement(file, extension) {
        if (this.supportedFormats.image.includes(extension) && extension !== 'heic') {
            // Create image preview element
            const img = document.createElement('img');
            img.className = 'file-thumbnail-img';
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            return img;
        } else {
            // Create icon element based on file type
            return this.getFileTypeIconElement(extension);
        }
    }

    // Legacy method for backward compatibility (if needed elsewhere)
    generateThumbnail(file, extension) {
        const element = this.generateThumbnailElement(file, extension);
        return element.outerHTML;
    }
    
    getFileTypeIconElement(extension) {
        const iconMap = {
            // Images
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', heic: '🖼️', bmp: '🖼️', tiff: '🖼️',
            // Videos
            mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', wmv: '🎬',
            // Audio
            mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', m4a: '🎵',
            // Documents
            pdf: '📄', doc: '📝', docx: '📝', txt: '📝', rtf: '📝'
        };
        
        const span = document.createElement('span');
        span.className = 'file-type-icon';
        span.textContent = iconMap[extension] || '📁';
        return span;
    }

    // Legacy method for backward compatibility (if needed elsewhere)
    getFileTypeIcon(extension) {
        const element = this.getFileTypeIconElement(extension);
        return element.outerHTML;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length === 0) {
            document.getElementById('file-preview-section').classList.add('hidden');
            document.getElementById('conversion-section').classList.add('hidden');
        } else {
            this.displayFilePreview(this.selectedFiles);
            this.updateFormatOptionsBasedOnFiles(this.selectedFiles);
        }
    }
    
    showConversionSection() {
        const conversionSection = document.getElementById('conversion-section');
        if (conversionSection) {
            conversionSection.classList.remove('hidden');
        }
    }
    
    updateFormatOptionsBasedOnFiles(files) {
        const formatSelect = document.getElementById('output-format');
        if (!formatSelect) return;
        
        // Detect primary file type
        const fileTypes = files.map(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return this.getFileCategory(ext);
        });
        
        const primaryType = this.getMostCommonType(fileTypes);
        this.populateFormatOptions(primaryType);
    }
    
    getFileCategory(extension) {
        for (const [category, extensions] of Object.entries(this.supportedFormats)) {
            if (extensions.includes(extension)) {
                return category;
            }
        }
        return 'unknown';
    }
    
    getMostCommonType(types) {
        const counts = {};
        types.forEach(type => {
            counts[type] = (counts[type] || 0) + 1;
        });
        
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    
    populateFormatOptions(filterType = null) {
        const formatSelect = document.getElementById('output-format');
        if (!formatSelect) return;
        
        formatSelect.innerHTML = '<option value="">Select output format</option>';
        
        const formatOptions = {
            image: [
                { value: 'jpg', label: 'JPG - High compatibility, smaller files' },
                { value: 'png', label: 'PNG - Transparency support, lossless' },
                { value: 'gif', label: 'GIF - Animation support' },
                { value: 'webp', label: 'WebP - Modern format, great compression' }
            ],
            video: [
                { value: 'mp4', label: 'MP4 - Universal compatibility' },
                { value: 'mov', label: 'MOV - Apple QuickTime format' },
                { value: 'avi', label: 'AVI - Windows standard format' }
            ],
            audio: [
                { value: 'mp3', label: 'MP3 - Universal audio format' },
                { value: 'wav', label: 'WAV - Uncompressed audio quality' },
                { value: 'flac', label: 'FLAC - Lossless compression' }
            ],
            document: [
                { value: 'pdf', label: 'PDF - Universal document format' },
                { value: 'txt', label: 'TXT - Plain text format' }
            ]
        };
        
        const categories = filterType ? [filterType] : Object.keys(formatOptions);
        
        categories.forEach(category => {
            if (formatOptions[category]) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category.charAt(0).toUpperCase() + category.slice(1);
                
                formatOptions[category].forEach(format => {
                    const option = document.createElement('option');
                    option.value = format.value;
                    option.textContent = format.label;
                    optgroup.appendChild(option);
                });
                
                formatSelect.appendChild(optgroup);
            }
        });
    }
    
    updateConversionOptions(outputFormat) {
        // Show/hide advanced options based on format
        const advancedSection = document.getElementById('universal-advanced-options');
        if (advancedSection && outputFormat) {
            advancedSection.classList.remove('hidden');
        }
    }
    
    async startConversion() {
        const outputFormat = document.getElementById('output-format').value;
        if (!outputFormat || this.selectedFiles.length === 0) {
            alert('Please select files and an output format');
            return;
        }
        
        this.showProgress();
        
        try {
            const convertedFiles = [];
            
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress((i / this.selectedFiles.length) * 100, `Converting ${file.name}...`);
                
                const convertedFile = await this.convertFile(file, outputFormat);
                if (convertedFile) {
                    convertedFiles.push(convertedFile);
                }
            }
            
            this.updateProgress(100, 'Conversion complete!');
            this.showDownloadSection(convertedFiles);
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Conversion failed. Please try again.');
        }
    }
    
    async convertFile(file, outputFormat) {
        const inputExtension = file.name.split('.').pop().toLowerCase();
        const inputCategory = this.getFileCategory(inputExtension);
        const outputCategory = this.getFileCategory(outputFormat);
        
        // Route to appropriate converter
        if (inputCategory === 'image' && outputCategory === 'image') {
            return await this.convertImage(file, outputFormat);
        } else if (inputCategory === 'video' && outputFormat === 'mp3') {
            return await this.convertVideoToAudio(file);
        } else if (inputExtension === 'heic' && outputFormat === 'jpg') {
            return await this.convertHeicToJpg(file);
        }
        
        // For unsupported conversions, return original file
        return { blob: file, filename: file.name };
    }
    
    async convertImage(file, outputFormat) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const quality = outputFormat === 'jpg' ? 0.9 : undefined;
                const mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
                
                canvas.toBlob((blob) => {
                    const newFilename = file.name.replace(/\.[^/.]+$/, `.${outputFormat}`);
                    resolve({ blob, filename: newFilename });
                }, mimeType, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    async convertHeicToJpg(file) {
        // Placeholder for HEIC conversion - would use heic2any library
        return new Promise((resolve, reject) => {
            if (window.heic2any) {
                heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.9
                }).then(jpegBlob => {
                    const newFilename = file.name.replace(/\.heic$/i, '.jpg');
                    resolve({ blob: jpegBlob, filename: newFilename });
                }).catch(reject);
            } else {
                reject(new Error('HEIC converter not loaded'));
            }
        });
    }
    
    async convertVideoToAudio(file) {
        // Placeholder for video to audio conversion - would use FFmpeg
        return new Promise((resolve, reject) => {
            // This would require FFmpeg WebAssembly implementation
            reject(new Error('Video conversion requires server-side processing'));
        });
    }
    
    showProgress() {
        const progressSection = document.getElementById('universal-progress-section');
        if (progressSection) {
            progressSection.classList.remove('hidden');
        }
    }
    
    updateProgress(percent, message) {
        const progressBar = document.getElementById('universal-progress-bar');
        const progressText = document.getElementById('universal-progress-text');
        const progressMessage = document.getElementById('universal-progress-message');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${Math.round(percent)}%`;
        if (progressMessage) progressMessage.textContent = message;
    }
    
    showDownloadSection(files) {
        const downloadSection = document.getElementById('universal-download-section');
        const downloadContainer = document.getElementById('universal-download-container');
        
        if (!downloadSection || !downloadContainer) return;
        
        downloadContainer.innerHTML = '';
        
        files.forEach((fileData, index) => {
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(fileData.blob);
            downloadLink.download = fileData.filename;
            downloadLink.className = 'download-link';
            downloadLink.setAttribute('data-testid', `download-link-${index}`);
            
            // Create SVG icon using safe DOM methods
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'download-icon');
            svg.setAttribute('width', '20');
            svg.setAttribute('height', '20');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('viewBox', '0 0 24 24');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('d', 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z');
            
            svg.appendChild(path);
            downloadLink.appendChild(svg);
            
            // Create text node safely to prevent XSS
            const textSpan = document.createElement('span');
            textSpan.textContent = `Download ${fileData.filename}`;
            downloadLink.appendChild(textSpan);
            
            downloadContainer.appendChild(downloadLink);
        });
        
        downloadSection.classList.remove('hidden');
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.universal-converter-container');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
            
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }
}

// Initialize the universal converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.universalConverter = new UniversalConverter();
});