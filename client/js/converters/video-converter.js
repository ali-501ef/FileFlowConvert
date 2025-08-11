/**
 * MP4 to MP3 Converter
 * Uses FFmpeg WebAssembly for client-side video to audio conversion
 */

class VideoConverter {
    constructor(config = {}) {
        this.inputFormat = config.inputFormat || 'mp4';
        this.outputFormat = config.outputFormat || 'mp3';
        this.acceptedTypes = config.acceptedTypes || '.mp4,.mov,.avi';
        this.toolName = config.toolName || 'Video Converter';
        
        this.selectedFiles = [];
        this.ffmpeg = null;
        this.isFFmpegReady = false;
        
        this.init();
    }
    
    init() {
        this.setupFileInput();
        this.setupDropZone();
        this.setupConvertButton();
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
            // Clear existing content
            fileList.innerHTML = '';
            
            // Create safe DOM elements for each file
            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info';
                
                const fileName = document.createElement('div');
                fileName.className = 'file-name';
                fileName.textContent = file.name; // Safe: textContent prevents XSS
                
                const fileSize = document.createElement('div');
                fileSize.className = 'file-size';
                fileSize.textContent = this.formatFileSize(file.size); // Safe: textContent prevents XSS
                
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

    /**
     * Initialize FFmpeg WebAssembly
     */
    async initializeFFmpeg() {
        if (this.isFFmpegReady) return true;

        try {
            // Check if FFmpeg libraries are loaded
            if (typeof FFmpegWASM === 'undefined') {
                throw new Error('FFmpeg library not loaded');
            }

            // Create FFmpeg instance
            this.ffmpeg = new FFmpegWASM.FFmpeg();
            
            // Load FFmpeg
            await this.ffmpeg.load();
            this.isFFmpegReady = true;
            
            return true;
            
        } catch (error) {
            console.error('Failed to initialize FFmpeg:', error);
            return false;
        }
    }

    /**
     * Convert video files to MP3 format
     */
    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('Please select video files to convert.');
            return;
        }

        // Filter for supported video files and check file size
        const videoFiles = this.selectedFiles.filter(file => {
            const isVideo = file.type.startsWith('video/') || 
                           file.name.toLowerCase().match(/\.(mp4|mov|avi)$/i);
            const sizeOk = file.size <= 50 * 1024 * 1024; // 50MB limit
            
            if (isVideo && !sizeOk) {
                console.warn(`File ${file.name} is too large (${FileFlowUtils.formatFileSize(file.size)})`);
            }
            
            return isVideo && sizeOk;
        });

        if (videoFiles.length === 0) {
            alert('Please select valid video files under 50MB.');
            return;
        }

        // Show progress with FFmpeg initialization
        this.showProgressWithFFmpeg();
        
        // Initialize FFmpeg
        const ffmpegReady = await this.initializeFFmpeg();
        
        if (!ffmpegReady) {
            alert('Failed to initialize video conversion engine. This feature requires a modern browser with WebAssembly support.');
            this.resetInterface();
            this.showActionButtons();
            return;
        }

        await this.processConversion(videoFiles);
    }

    /**
     * Show progress with FFmpeg status updates
     */
    showProgressWithFFmpeg() {
        const actionButtons = document.getElementById('action-buttons');
        const progressSection = document.getElementById('progress-section');
        const ffmpegStatus = document.getElementById('ffmpeg-status');
        
        if (actionButtons) FileFlowUtils.hideElement(actionButtons);
        if (progressSection) FileFlowUtils.showElement(progressSection);
        if (ffmpegStatus) ffmpegStatus.textContent = 'Initializing conversion engine...';
    }

    /**
     * Update FFmpeg status
     * @param {string} status - Status message
     */
    updateFFmpegStatus(status) {
        const ffmpegStatus = document.getElementById('ffmpeg-status');
        if (ffmpegStatus) {
            ffmpegStatus.textContent = status;
        }
    }

    /**
     * Process video to audio conversion
     * @param {Array} videoFiles - Array of video files
     */
    async processConversion(videoFiles) {
        const results = [];
        const quality = this.getSelectedQuality();

        try {
            for (let i = 0; i < videoFiles.length; i++) {
                const file = videoFiles[i];
                
                this.updateFFmpegStatus(`Converting ${file.name}... (${i + 1}/${videoFiles.length})`);
                
                try {
                    const convertedBlob = await this.convertVideoToAudio(file, quality);
                    
                    // Generate output filename
                    const outputFilename = file.name.replace(/\.(mp4|mov|avi)$/i, '.mp3');
                    
                    results.push({
                        filename: outputFilename,
                        blob: convertedBlob
                    });

                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    
                    // Create error blob for failed conversion
                    const errorText = `Failed to convert ${file.name}: ${error.message}`;
                    const errorBlob = new Blob([errorText], { type: 'text/plain' });
                    
                    results.push({
                        filename: `ERROR_${file.name}.txt`,
                        blob: errorBlob
                    });
                }
            }

            // Show download results
            this.showDownloadResults(results);

        } catch (error) {
            console.error('Video conversion failed:', error);
            alert('Video conversion failed. Please try again with different files.');
            
            // Reset interface on error
            this.resetInterface();
            this.showActionButtons();
        }
    }

    /**
     * Get selected audio quality from radio buttons
     * @returns {string} Quality setting
     */
    getSelectedQuality() {
        const qualityRadio = document.querySelector('input[name="quality"]:checked');
        return qualityRadio ? qualityRadio.value : '192';
    }

    /**
     * Convert a single video file to MP3 using FFmpeg
     * @param {File} file - Video file to convert
     * @param {string} quality - Audio quality (128, 192, 320)
     * @returns {Promise<Blob>} MP3 blob
     */
    async convertVideoToAudio(file, quality) {
        try {
            // Read file data
            const fileData = new Uint8Array(await file.arrayBuffer());
            
            // Write input file to FFmpeg virtual filesystem
            const inputFileName = 'input' + this.getFileExtension(file.name);
            const outputFileName = 'output.mp3';
            
            await this.ffmpeg.writeFile(inputFileName, fileData);
            
            // Run FFmpeg conversion
            await this.ffmpeg.exec([
                '-i', inputFileName,
                '-vn', // No video
                '-acodec', 'libmp3lame',
                '-ab', `${quality}k`,
                '-ar', '44100',
                '-y', // Overwrite output file
                outputFileName
            ]);
            
            // Read output file
            const outputData = await this.ffmpeg.readFile(outputFileName);
            
            // Clean up files
            await this.ffmpeg.deleteFile(inputFileName);
            await this.ffmpeg.deleteFile(outputFileName);
            
            // Create blob from output data
            return new Blob([outputData], { type: 'audio/mpeg' });
            
        } catch (error) {
            throw new Error(`FFmpeg conversion failed: ${error.message}`);
        }
    }

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} File extension with dot
     */
    getFileExtension(filename) {
        const ext = filename.toLowerCase().match(/\.[^.]+$/);
        return ext ? ext[0] : '.mp4';
    }

    /**
     * Override showProgress to include FFmpeg status
     * @param {Function} onComplete - Callback when progress completes
     * @param {string} statusText - Status text
     */
    showProgress(onComplete, statusText = 'Converting video to audio...') {
        super.showProgress(onComplete, statusText);
        this.updateFFmpegStatus('Processing...');
    }
}

// Initialize video converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('mp4-to-mp3')) {
        window.fileHandler = new VideoConverter();
    }
});
