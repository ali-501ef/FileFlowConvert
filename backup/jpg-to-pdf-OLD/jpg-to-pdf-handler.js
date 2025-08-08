/**
 * JPG to PDF Converter Handler
 * Handles JPG to PDF conversion with advanced options using pdf-lib
 * Generates valid PDFs with proper structure and cross-reference tables
 */

class JPGToPDFHandler {
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
        this.setupImageSorting();
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
                if (!this.isConverting && this.selectedFiles.length > 0) {
                    this.convertToPDF();
                }
            });
        }
    }

    setupAdvancedOptions() {
        const advancedToggle = document.getElementById('advancedToggle');
        const advancedOptions = document.getElementById('advancedOptions');
        
        if (advancedToggle && advancedOptions) {
            advancedToggle.addEventListener('click', () => {
                const isExpanded = advancedOptions.classList.contains('expanded');
                if (isExpanded) {
                    advancedOptions.classList.remove('expanded');
                } else {
                    advancedOptions.classList.add('expanded');
                }
            });
        }
    }

    setupImageSorting() {
        const fileList = document.getElementById('fileList');
        if (fileList && window.Sortable) {
            new Sortable(fileList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    // Update file order based on DOM order
                    const fileItems = fileList.querySelectorAll('.file-item');
                    const newOrder = [];
                    fileItems.forEach(item => {
                        const index = parseInt(item.dataset.index);
                        newOrder.push(this.selectedFiles[index]);
                    });
                    this.selectedFiles = newOrder;
                    this.updateFileList();
                }
            });
        }
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            const isImage = file.type.startsWith('image/');
            const isJPEG = file.type === 'image/jpeg' || file.type === 'image/jpg' || 
                          file.name.toLowerCase().match(/\.(jpg|jpeg)$/);
            return isImage && isJPEG;
        });

        if (validFiles.length === 0) {
            this.showError('Please select valid JPG/JPEG image files.');
            return;
        }

        // Add new files to existing selection
        this.selectedFiles = [...this.selectedFiles, ...validFiles];
        this.updateFileList();
        this.updateConvertButton();
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        const uploadArea = document.getElementById('uploadArea');
        
        if (!fileList) return;

        fileList.innerHTML = '';

        if (this.selectedFiles.length === 0) {
            if (uploadArea) {
                uploadArea.style.display = 'flex';
            }
            return;
        }

        if (uploadArea) {
            uploadArea.style.display = 'none';
        }

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.index = index;
            
            // Create thumbnail
            const thumbnail = document.createElement('div');
            thumbnail.className = 'file-thumbnail';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            img.onload = () => URL.revokeObjectURL(img.src);
            thumbnail.appendChild(img);

            // File info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(index);
            });

            // Drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '⋮⋮';

            fileItem.appendChild(thumbnail);
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeBtn);
            fileItem.appendChild(dragHandle);
            
            fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileList();
        this.updateConvertButton();
    }

    updateConvertButton() {
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            convertBtn.disabled = this.selectedFiles.length === 0;
            const btnText = convertBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = this.selectedFiles.length > 1 ? 
                    `Convert ${this.selectedFiles.length} images to PDF` : 'Convert to PDF';
            }
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getAdvancedOptions() {
        return {
            pageSize: document.getElementById('pageSize')?.value || 'A4',
            orientation: document.getElementById('orientation')?.value || 'portrait',
            imageLayout: document.getElementById('imageLayout')?.value || 'fit',
            margin: document.getElementById('margin')?.value || '20',
            quality: document.getElementById('quality')?.value || '92'
        };
    }

    generateOutputFilename() {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[-:]/g, '')
            .replace(/T/, '-')
            .replace(/\..+/, '')
            .slice(0, 13); // YYYYMMDD-HHMM format

        if (this.selectedFiles.length === 1) {
            const baseName = this.selectedFiles[0].name
                .replace(/\.(jpg|jpeg)$/i, '')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            return `${baseName || 'image'}_to_pdf_${timestamp}.pdf`;
        } else {
            return `images_to_pdf_${timestamp}.pdf`;
        }
    }

    async convertToPDF() {
        if (this.isConverting) return;

        this.isConverting = true;
        this.showProgress(0);

        try {
            const options = this.getAdvancedOptions();
            
            // Create PDF document
            const pdfDoc = await PDFLib.PDFDocument.create();
            
            // Set document metadata for better compatibility
            pdfDoc.setTitle('Converted Images');
            pdfDoc.setCreator('FileFlow');
            pdfDoc.setProducer('FileFlow PDF Converter');
            pdfDoc.setCreationDate(new Date());
            pdfDoc.setModificationDate(new Date());

            // Page size settings
            const pageSizes = {
                A4: [595.276, 841.89],  // A4 in points
                Letter: [612, 792],     // Letter in points
                Legal: [612, 1008],     // Legal in points
                A3: [841.89, 1190.55], // A3 in points
            };

            let [pageWidth, pageHeight] = pageSizes[options.pageSize] || pageSizes.A4;
            
            if (options.orientation === 'landscape') {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            }

            const margin = parseFloat(options.margin) || 20;
            const usableWidth = pageWidth - (margin * 2);
            const usableHeight = pageHeight - (margin * 2);

            // Process each image
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                
                try {
                    // Convert image to array buffer
                    const imageBytes = await this.fileToArrayBuffer(file);
                    
                    // Embed image in PDF
                    let image;
                    if (file.type === 'image/jpeg' || file.name.toLowerCase().match(/\.(jpg|jpeg)$/)) {
                        image = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        // Convert other formats to JPEG first
                        const jpegBytes = await this.convertToJpeg(file);
                        image = await pdfDoc.embedJpg(jpegBytes);
                    }

                    // Create a new page
                    const page = pdfDoc.addPage([pageWidth, pageHeight]);

                    // Calculate image dimensions based on layout option
                    const { width, height, x, y } = this.calculateImageLayout(
                        image.width, 
                        image.height, 
                        usableWidth, 
                        usableHeight, 
                        options.imageLayout,
                        margin
                    );

                    // Draw image on page
                    page.drawImage(image, {
                        x,
                        y,
                        width,
                        height,
                    });

                    // Update progress
                    const progress = ((i + 1) / this.selectedFiles.length) * 100;
                    this.showProgress(progress);

                } catch (error) {
                    console.error(`Error processing image ${file.name}:`, error);
                    throw new Error(`Failed to process image ${file.name}: ${error.message}`);
                }
            }

            // Generate PDF bytes
            const pdfBytes = await pdfDoc.save();
            
            // Verify PDF structure
            if (!this.validatePDFStructure(pdfBytes)) {
                throw new Error('Generated PDF failed structure validation');
            }

            // Create download
            const filename = this.generateOutputFilename();
            this.downloadPDF(pdfBytes, filename);
            
            this.showSuccess(`Successfully converted ${this.selectedFiles.length} image${this.selectedFiles.length > 1 ? 's' : ''} to PDF!`);

        } catch (error) {
            console.error('Conversion error:', error);
            this.showError(`Conversion failed: ${error.message}`);
        } finally {
            this.isConverting = false;
            this.hideProgress();
        }
    }

    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    async convertToJpeg(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                // Fill with white background for transparency support
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsArrayBuffer(blob);
                    } else {
                        reject(new Error('Failed to convert image to JPEG'));
                    }
                }, 'image/jpeg', 0.92);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    calculateImageLayout(imgWidth, imgHeight, usableWidth, usableHeight, layout, margin) {
        let width, height, x, y;

        switch (layout) {
            case 'fit':
                // Scale image to fit page while maintaining aspect ratio
                const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);
                width = imgWidth * scale;
                height = imgHeight * scale;
                x = margin + (usableWidth - width) / 2;
                y = margin + (usableHeight - height) / 2;
                break;
                
            case 'fill':
                // Scale image to fill page, may crop
                const fillScale = Math.max(usableWidth / imgWidth, usableHeight / imgHeight);
                width = imgWidth * fillScale;
                height = imgHeight * fillScale;
                x = margin + (usableWidth - width) / 2;
                y = margin + (usableHeight - height) / 2;
                break;
                
            case 'stretch':
                // Stretch image to fill page exactly
                width = usableWidth;
                height = usableHeight;
                x = margin;
                y = margin;
                break;
                
            case 'original':
                // Use original size, center on page
                width = imgWidth;
                height = imgHeight;
                x = margin + Math.max(0, (usableWidth - width) / 2);
                y = margin + Math.max(0, (usableHeight - height) / 2);
                break;
                
            default:
                // Default to fit
                const defaultScale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);
                width = imgWidth * defaultScale;
                height = imgHeight * defaultScale;
                x = margin + (usableWidth - width) / 2;
                y = margin + (usableHeight - height) / 2;
        }

        return { width, height, x, y };
    }

    validatePDFStructure(pdfBytes) {
        try {
            // Check PDF header
            const decoder = new TextDecoder('utf-8');
            const header = decoder.decode(pdfBytes.slice(0, 8));
            if (!header.startsWith('%PDF-')) {
                console.error('PDF missing %PDF- header');
                return false;
            }

            // Check for %%EOF marker
            const tail = decoder.decode(pdfBytes.slice(-20));
            if (!tail.includes('%%EOF')) {
                console.error('PDF missing %%EOF marker');
                return false;
            }

            // Basic structure validation passed
            console.log('✅ PDF structure validation passed');
            return true;

        } catch (error) {
            console.error('PDF structure validation failed:', error);
            return false;
        }
    }

    downloadPDF(pdfBytes, filename) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
        }
    }

    showProgress(progress) {
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        if (progressFill) {
            progressFill.style.width = progress + '%';
        }

        if (progressText) {
            progressText.textContent = Math.round(progress) + '%';
        }

        // Show convert button loader
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');

        if (btnText && btnLoader) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
        }

        if (convertBtn) {
            convertBtn.disabled = true;
        }
    }

    hideProgress() {
        const progressContainer = document.getElementById('progressContainer');
        const convertBtn = document.getElementById('convertBtn');
        const btnText = convertBtn?.querySelector('.btn-text');
        const btnLoader = convertBtn?.querySelector('.btn-loader');

        if (progressContainer) {
            progressContainer.style.display = 'none';
        }

        if (btnText && btnLoader) {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }

        if (convertBtn) {
            convertBtn.disabled = false;
        }
    }

    showSuccess(message) {
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'block';
            
            // Update success message if there's a message element
            const messageEl = results.querySelector('.success-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }

        // Hide upload area and file list, show results
        const uploadArea = document.getElementById('uploadArea');
        const fileList = document.getElementById('fileList');
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (fileList) fileList.style.display = 'none';
    }

    showError(message) {
        // Create or update error display
        let errorEl = document.getElementById('error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'error-message';
            errorEl.className = 'error-message';
            
            const converterContainer = document.querySelector('.converter-container');
            if (converterContainer) {
                converterContainer.appendChild(errorEl);
            }
        }
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorEl) {
                errorEl.style.display = 'none';
            }
        }, 5000);
    }
}

// Initialize the JPG to PDF handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if pdf-lib is loaded
    if (typeof PDFLib === 'undefined') {
        console.error('pdf-lib is not loaded. Cannot initialize JPG to PDF converter.');
        return;
    }
    
    window.jpgToPDFHandler = new JPGToPDFHandler();
});