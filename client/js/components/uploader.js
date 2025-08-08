/**
 * Shared File Uploader Component
 * Used across all Audio/Video tools for consistent upload behavior
 */
class FileUploader {
    constructor(config) {
        console.log('FileUploader: Initializing with config:', config);
        this.config = {
            uploadAreaId: 'uploadArea',
            fileInputId: 'fileInput',
            acceptedTypes: ['*/*'],
            multiple: false,
            ...config
        };
        
        this.isFilePickerOpen = false;
        this.currentFile = null;
        this.currentFiles = [];
        
        // Only call init, setupEventListeners will be called from init
        this.init();
    }
    
    init() {
        // Retry initialization if DOM elements not found
        const maxRetries = 10;
        let retries = 0;
        
        const tryInit = () => {
            this.uploadArea = document.getElementById(this.config.uploadAreaId);
            this.fileInput = document.getElementById(this.config.fileInputId);
            
            if (!this.uploadArea || !this.fileInput) {
                console.log(`FileUploader: Retry ${retries + 1}/${maxRetries} - Elements not found yet`);
                retries++;
                if (retries < maxRetries) {
                    setTimeout(tryInit, 100);
                    return;
                } else {
                    console.error('FileUploader: Upload elements not found after retries', {
                        uploadAreaId: this.config.uploadAreaId,
                        fileInputId: this.config.fileInputId,
                        uploadArea: this.uploadArea,
                        fileInput: this.fileInput
                    });
                    throw new Error(`Upload area (${this.config.uploadAreaId}) or file input (${this.config.fileInputId}) not found`);
                }
            } else {
                console.log('FileUploader: Elements found successfully');
                this.setupEventListeners();
            }
        };
        
        tryInit();
    }
    
    setupEventListeners() {
        // Click guard to prevent double file picker opening
        this.uploadArea.addEventListener('click', this.handleUploadAreaClick.bind(this));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
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
        const files = Array.from(e.dataTransfer.files);
        
        if (this.config.multiple) {
            const validFiles = files.filter(file => this.isValidFile(file));
            if (validFiles.length > 0) {
                this.handleFiles(validFiles);
            }
        } else {
            const file = files[0];
            if (file && this.isValidFile(file)) {
                this.handleFile(file);
            }
        }
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        
        if (this.config.multiple) {
            const validFiles = files.filter(file => this.isValidFile(file));
            if (validFiles.length > 0) {
                this.handleFiles(validFiles);
            }
        } else {
            const file = files[0];
            if (file && this.isValidFile(file)) {
                this.handleFile(file);
            }
        }
        
        // Reset input for potential reuse
        e.target.value = '';
    }
    
    isValidFile(file) {
        if (this.config.acceptedTypes.includes('*/*')) {
            return true;
        }
        
        return this.config.acceptedTypes.some(type => {
            if (type.startsWith('.')) {
                return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            return file.type.startsWith(type);
        });
    }
    
    handleFile(file) {
        this.currentFile = file;
        this.currentFiles = [file];
        
        if (this.config.onFileSelect) {
            this.config.onFileSelect(file);
        }
        
        this.hideUploadArea();
    }
    
    handleFiles(files) {
        this.currentFiles = files;
        this.currentFile = files[0]; // For compatibility
        
        if (this.config.onFilesSelect) {
            this.config.onFilesSelect(files);
        }
        
        this.hideUploadArea();
    }
    
    hideUploadArea() {
        if (this.uploadArea) {
            this.uploadArea.style.display = 'none';
        }
    }
    
    showUploadArea() {
        if (this.uploadArea) {
            this.uploadArea.style.display = 'block';
        }
    }
    
    reset() {
        this.currentFile = null;
        this.currentFiles = [];
        this.showUploadArea();
        
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }
    
    getCurrentFile() {
        return this.currentFile;
    }
    
    getCurrentFiles() {
        return this.currentFiles;
    }
}

// Export for use in other modules
window.FileUploader = FileUploader;