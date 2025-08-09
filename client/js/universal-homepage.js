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
            const filePreview = this.dropZone.querySelector('.file-preview');
            const previewContent = this.dropZone.querySelector('#preview-content');
            const fileName = this.dropZone.querySelector('#file-name');
            const fileSize = this.dropZone.querySelector('#file-size');
            
            // Hide initial drop zone content and show preview
            dropZoneContent.style.display = 'none';
            filePreview.style.display = 'block';
            
            // Clear and populate preview content
            previewContent.innerHTML = '';
            this.addFilePreview(previewContent, this.selectedFile);
            
            // Update file info
            fileName.textContent = this.selectedFile.name;
            fileSize.textContent = this.formatFileSize(this.selectedFile.size);
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
        
        // Perform conversion directly on the homepage
        this.performInlineConversion(this.selectedFile, outputFormat);
    }
    
    async performInlineConversion(file, outputFormat) {
        // Show loading state
        this.showConversionProgress();
        
        try {
            const fileType = file.type.toLowerCase();
            const fileName = file.name.toLowerCase();
            
            console.log('Starting conversion:', {
                name: fileName,
                type: fileType,
                size: file.size,
                outputFormat: outputFormat
            });
            
            // Handle HEIC files with native browser support
            if (fileName.endsWith('.heic') || fileName.endsWith('.heif') || fileType.includes('heic') || fileType.includes('heif')) {
                await this.convertHeicImage(file, outputFormat);
                return;
            }
            
            // Handle regular images using Canvas API
            if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|tiff|svg)$/i)) {
                await this.convertImage(file, outputFormat);
                return;
            }
            
            // Handle other file types with appropriate messages
            if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                this.showConversionError('PDF to image conversion requires specialized tools. Please use our dedicated PDF converter.');
                return;
            }
            
            if (fileType.startsWith('video/') || fileName.match(/\.(mp4|avi|mov|mkv|webm|wmv|flv)$/i)) {
                this.showConversionError('Video conversion requires specialized tools. Please use our dedicated video converter.');
                return;
            }
            
            if (fileType.startsWith('audio/') || fileName.match(/\.(mp3|wav|flac|aac|ogg|m4a)$/i)) {
                this.showConversionError('Audio conversion requires specialized tools. Please use our dedicated audio converter.');
                return;
            }
            
            // Unknown file type
            this.showConversionError(`File type not supported: ${fileName}. Please try uploading a common image file (JPG, PNG, GIF, etc.).`);
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showConversionError(error.message || 'An unexpected error occurred during conversion');
        }
    }
    
    async convertImage(file, outputFormat) {
        return new Promise((resolve, reject) => {
            console.log('Starting image conversion:', {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                targetFormat: outputFormat
            });
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                try {
                    console.log('Image loaded successfully:', {
                        width: img.width,
                        height: img.height,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight
                    });
                    
                    // Use natural dimensions for best quality
                    const width = img.naturalWidth || img.width;
                    const height = img.naturalHeight || img.height;
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Clear canvas
                    ctx.clearRect(0, 0, width, height);
                    
                    // For JPEG output, fill with white background
                    if (outputFormat.toLowerCase() === 'jpeg' || outputFormat.toLowerCase() === 'jpg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                    }
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Get target format details
                    const mimeType = this.getMimeType(outputFormat);
                    const quality = this.getCompressionQuality(outputFormat);
                    
                    console.log('Converting image to:', { mimeType, quality });
                    
                    // Convert to blob
                    canvas.toBlob((blob) => {
                        // Clean up
                        URL.revokeObjectURL(img.src);
                        
                        if (blob && blob.size > 0) {
                            console.log('Image conversion completed successfully:', {
                                originalSize: file.size,
                                convertedSize: blob.size,
                                compressionRatio: Math.round((1 - blob.size / file.size) * 100) + '%'
                            });
                            
                            this.downloadConvertedFile(blob, file.name, outputFormat);
                            this.showConversionSuccess();
                            resolve();
                        } else {
                            console.error('Canvas toBlob failed - empty result');
                            reject(new Error('Image conversion produced empty result'));
                        }
                    }, mimeType, quality);
                    
                } catch (error) {
                    console.error('Canvas processing error:', error);
                    URL.revokeObjectURL(img.src);
                    reject(new Error(`Image processing failed: ${error.message}`));
                }
            };
            
            img.onerror = (error) => {
                console.error('Image load failed:', error);
                URL.revokeObjectURL(img.src);
                reject(new Error('Could not load image file. The file may be corrupted or in an unsupported format.'));
            };
            
            // Load the image
            img.crossOrigin = 'anonymous';
            img.src = URL.createObjectURL(file);
            
            // Add timeout to prevent hanging
            setTimeout(() => {
                if (img.complete === false) {
                    console.error('Image loading timeout');
                    URL.revokeObjectURL(img.src);
                    reject(new Error('Image loading timed out - file may be too large or corrupted'));
                }
            }, 30000); // 30 second timeout
        });
    }
    
    getMimeType(format) {
        const mimeTypes = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'pdf': 'application/pdf'
        };
        return mimeTypes[format.toLowerCase()] || 'image/jpeg';
    }
    
    getCompressionQuality(format) {
        // Return quality for lossy formats
        const lossyFormats = ['jpeg', 'jpg', 'webp'];
        if (lossyFormats.includes(format.toLowerCase())) {
            return 0.9; // 90% quality
        }
        return 1.0; // No compression for lossless formats
    }
    
    downloadConvertedFile(blob, originalName, format) {
        const link = document.createElement('a');
        const fileName = this.getConvertedFileName(originalName, format);
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }
    
    getConvertedFileName(originalName, format) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        return `${nameWithoutExt}.${format.toLowerCase()}`;
    }
    
    showConversionProgress() {
        this.convertBtn.innerHTML = `
            <svg class="animate-spin" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2" stroke-opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2" stroke-linecap="round"></path>
            </svg>
            Converting...
        `;
        this.convertBtn.disabled = true;
    }
    
    showConversionSuccess() {
        this.convertBtn.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Converted!
        `;
        
        // Reset button after 2 seconds
        setTimeout(() => {
            this.convertBtn.innerHTML = 'Convert Now';
            this.convertBtn.disabled = false;
        }, 2000);
    }
    
    showConversionError(message) {
        this.convertBtn.innerHTML = 'Conversion Failed';
        this.convertBtn.disabled = false;
        
        // Show error message to user
        alert(`Conversion failed: ${message}`);
        
        // Reset button after 2 seconds
        setTimeout(() => {
            this.convertBtn.innerHTML = 'Convert Now';
        }, 2000);
    }
    
    async showUnsupportedMessage(fileType, format) {
        try {
            if (fileType === 'PDF' && format !== 'pdf') {
                await this.convertPdfToImage(this.selectedFile, format);
            } else if (fileType.startsWith('video/') || fileType.startsWith('audio/')) {
                await this.convertMediaFile(this.selectedFile, format);
            } else {
                this.showConversionError(`${fileType} to ${format.toUpperCase()} conversion is not yet supported. Please try a different format.`);
            }
        } catch (error) {
            this.showConversionError(`Failed to convert ${fileType} to ${format}: ${error.message}`);
        }
    }
    
    async convertHeicImage(file, outputFormat) {
        try {
            // Use native browser Image API to handle HEIC files
            // Modern browsers like Safari and Chrome can handle HEIC natively
            console.log('Attempting native HEIC conversion...', {
                fileName: file.name,
                fileSize: file.size,
                outputFormat: outputFormat
            });
            
            // Try native browser conversion first
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        console.log('HEIC image loaded natively, converting...', {
                            width: img.width,
                            height: img.height
                        });
                        
                        // Set canvas dimensions
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        // Fill with white background for JPEG
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Draw the image
                        ctx.drawImage(img, 0, 0);
                        
                        // Convert to JPEG
                        canvas.toBlob((blob) => {
                            URL.revokeObjectURL(img.src);
                            
                            if (blob && blob.size > 0) {
                                console.log('Native HEIC conversion successful');
                                this.downloadConvertedFile(blob, file.name, 'jpg');
                                this.showConversionSuccess();
                                resolve();
                            } else {
                                reject(new Error('Native conversion produced empty result'));
                            }
                        }, 'image/jpeg', 0.92);
                        
                    } catch (error) {
                        URL.revokeObjectURL(img.src);
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(img.src);
                    console.log('Native HEIC loading failed, showing appropriate message');
                    
                    // If native loading fails, show informative message
                    this.showConversionError('HEIC files require a browser with HEIC support or please try our specialized HEIC converter tool. You can also convert your HEIC file to JPEG using your device\'s built-in tools first.');
                    reject(new Error('Browser does not support HEIC files natively'));
                };
                
                // Set the image source
                img.src = URL.createObjectURL(file);
            });
            
        } catch (error) {
            console.error('HEIC conversion error:', error);
            this.showConversionError('HEIC conversion is not supported in this browser. Please use our specialized HEIC converter or convert the file using your device first.');
        }
    }
    
    async loadHeicLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.heic2any && typeof window.heic2any === 'function') {
                resolve();
                return;
            }
            
            // Clean up any existing script attempts
            const existingScript = document.querySelector('script[src*="heic2any"]');
            if (existingScript) {
                existingScript.remove();
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                // Give the library time to initialize
                setTimeout(() => {
                    if (window.heic2any && typeof window.heic2any === 'function') {
                        console.log('HEIC library loaded successfully');
                        resolve();
                    } else {
                        console.error('HEIC library loaded but function not available');
                        reject(new Error('HEIC library failed to initialize properly'));
                    }
                }, 200);
            };
            
            script.onerror = (error) => {
                console.error('Failed to load HEIC library:', error);
                reject(new Error('Failed to load HEIC conversion library from CDN'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    async convertPdfToImage(file, outputFormat) {
        try {
            // Load PDF.js library dynamically
            if (!window.pdfjsLib) {
                await this.loadPdfJsLibrary();
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // Convert first page to image
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, this.getMimeType(outputFormat), this.getCompressionQuality(outputFormat));
            });
            
            this.downloadConvertedFile(blob, file.name, outputFormat);
            this.showConversionSuccess();
            
        } catch (error) {
            console.error('PDF conversion error:', error);
            this.showConversionError(`PDF conversion failed: ${error.message}`);
        }
    }
    
    async convertMediaFile(file, outputFormat) {
        try {
            // For now, provide a simple media conversion fallback using Web APIs
            if (file.type.startsWith('video/') && (outputFormat === 'jpeg' || outputFormat === 'png')) {
                // Extract video thumbnail using video element
                return await this.extractVideoThumbnail(file, outputFormat);
            } else if (file.type.startsWith('audio/') && outputFormat === 'wav') {
                // For audio conversion, we'll use Web Audio API
                return await this.convertAudioFormat(file, outputFormat);
            } else {
                // For complex media conversions, show informative message
                this.showConversionError(`${file.type} to ${outputFormat.toUpperCase()} conversion requires specialized software. Please use a dedicated media converter for this task.`);
            }
        } catch (error) {
            console.error('Media conversion error:', error);
            this.showConversionError(`Media conversion failed: ${error.message}`);
        }
    }
    
    async extractVideoThumbnail(file, outputFormat) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                // Set canvas dimensions to video dimensions
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Seek to 1 second or 10% of video duration
                video.currentTime = Math.min(1, video.duration * 0.1);
            };
            
            video.onseeked = () => {
                try {
                    // Draw video frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to blob
                    canvas.toBlob((blob) => {
                        if (blob && blob.size > 0) {
                            this.downloadConvertedFile(blob, file.name, outputFormat);
                            this.showConversionSuccess();
                            resolve();
                        } else {
                            reject(new Error('Failed to extract video thumbnail'));
                        }
                    }, this.getMimeType(outputFormat), this.getCompressionQuality(outputFormat));
                } catch (error) {
                    reject(new Error(`Video thumbnail extraction failed: ${error.message}`));
                }
            };
            
            video.onerror = () => {
                reject(new Error('Failed to load video - unsupported format or corrupted file'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }
    
    async convertAudioFormat(file, outputFormat) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Create simple WAV file
            if (outputFormat === 'wav') {
                const wav = this.audioBufferToWav(audioBuffer);
                const blob = new Blob([wav], { type: 'audio/wav' });
                
                this.downloadConvertedFile(blob, file.name, outputFormat);
                this.showConversionSuccess();
            } else {
                throw new Error(`Audio conversion to ${outputFormat} not supported by browser`);
            }
        } catch (error) {
            console.error('Audio conversion error:', error);
            this.showConversionError(`Audio conversion failed: ${error.message}`);
        }
    }
    
    audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);
        
        // Audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        return arrayBuffer;
    }
    
    async handleUnknownFileType(file, outputFormat) {
        const fileName = file.name.toLowerCase();
        
        // Try to detect file type by extension
        if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
            await this.convertHeicImage(file, outputFormat);
        } else if (fileName.endsWith('.pdf')) {
            await this.convertPdfToImage(file, outputFormat);
        } else if (fileName.match(/\.(mp4|avi|mov|mkv|webm)$/)) {
            await this.convertMediaFile(file, outputFormat);
        } else if (fileName.match(/\.(mp3|wav|flac|aac|ogg)$/)) {
            await this.convertMediaFile(file, outputFormat);
        } else {
            this.showConversionError(`File type not supported: ${fileName}. Please try uploading a common image, PDF, or media file.`);
        }
    }
    
    async loadPdfJsLibrary() {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                // Set worker source
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve();
                } else {
                    reject(new Error('PDF.js failed to load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js library'));
            document.head.appendChild(script);
        });
    }
    
    async loadFFmpegLibrary() {
        return new Promise((resolve, reject) => {
            if (window.FFmpeg) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/umd/ffmpeg.js';
            script.onload = () => {
                if (window.FFmpeg) {
                    resolve();
                } else {
                    reject(new Error('FFmpeg failed to load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load FFmpeg library'));
            document.head.appendChild(script);
        });
    }
}

// Initialize the universal homepage converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.homepageConverter = new UniversalHomepageConverter();
    }
});