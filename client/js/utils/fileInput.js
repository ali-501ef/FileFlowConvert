/**
 * Standardized File Input Handler
 * Prevents duplicate file dialog opening across all FileFlow tools
 * Implements dataset-bound guard pattern to ensure single binding
 */

/**
 * Bind file input handler with drag & drop support
 * @param {HTMLInputElement} fileInput - The file input element
 * @param {Function} callback - Callback function to handle selected file(s)
 * @param {Object} options - Configuration options
 * @param {string} options.accept - File type filter (e.g., 'application/pdf', 'image/*', 'video/*')
 * @param {boolean} options.multiple - Allow multiple file selection
 * @param {HTMLElement} options.dropZone - Custom drop zone element (defaults to uploadArea)
 * @returns {Function} Cleanup function to remove all event listeners
 */
function bindFileInputHandler(fileInput, callback, options = {}) {
    // Validate inputs
    if (!fileInput || typeof callback !== 'function') {
        console.error('bindFileInputHandler: fileInput and callback are required');
        return () => {};
    }

    // Check if already bound using dataset guard pattern
    if (fileInput.dataset.fileInputBound === 'true') {
        console.warn('bindFileInputHandler: File input already bound, skipping duplicate binding');
        return () => {};
    }

    // Mark as bound to prevent duplicates
    fileInput.dataset.fileInputBound = 'true';

    // Configuration with defaults
    const config = {
        accept: options.accept || '',
        multiple: options.multiple || false,
        dropZone: options.dropZone || document.getElementById('uploadArea')
    };

    // Set input attributes
    if (config.accept) {
        fileInput.setAttribute('accept', config.accept);
    }
    if (config.multiple) {
        fileInput.setAttribute('multiple', '');
    }

    // Event handlers
    const handlers = {
        // File input change handler
        handleFileSelect: (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                if (config.multiple) {
                    callback(Array.from(files));
                } else {
                    callback(files[0]);
                }
            }
        },

        // Upload area click handler
        handleUploadAreaClick: (e) => {
            e.preventDefault();
            // Ensure only one dialog opens
            if (fileInput.dataset.dialogOpen === 'true') {
                return;
            }
            fileInput.dataset.dialogOpen = 'true';
            
            // Reset flag after a short delay to handle cancel behavior
            setTimeout(() => {
                fileInput.dataset.dialogOpen = 'false';
            }, 100);
            
            fileInput.click();
        },

        // Drag over handler
        handleDragOver: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (config.dropZone) {
                config.dropZone.classList.add('drag-over');
            }
        },

        // Drag leave handler  
        handleDragLeave: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (config.dropZone && !config.dropZone.contains(e.relatedTarget)) {
                config.dropZone.classList.remove('drag-over');
            }
        },

        // Drop handler
        handleDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (config.dropZone) {
                config.dropZone.classList.remove('drag-over');
            }

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                // Filter files by accepted types if specified
                let validFiles = Array.from(files);
                if (config.accept) {
                    validFiles = validFiles.filter(file => {
                        if (config.accept.includes('application/pdf')) {
                            return file.type === 'application/pdf';
                        }
                        if (config.accept.includes('image/')) {
                            return file.type.startsWith('image/');
                        }
                        if (config.accept.includes('video/')) {
                            return file.type.startsWith('video/');
                        }
                        if (config.accept.includes('audio/')) {
                            return file.type.startsWith('audio/');
                        }
                        return true;
                    });
                }

                if (validFiles.length > 0) {
                    if (config.multiple) {
                        callback(validFiles);
                    } else {
                        callback(validFiles[0]);
                    }
                }
            }
        },

        // Focus handler to handle cancel behavior
        handleFocus: () => {
            // Reset dialog state when input gains focus
            setTimeout(() => {
                fileInput.dataset.dialogOpen = 'false';
            }, 50);
        },

        // Window focus handler to detect dialog cancel
        handleWindowFocus: () => {
            setTimeout(() => {
                fileInput.dataset.dialogOpen = 'false';
            }, 300);
        }
    };

    // Bind event listeners
    fileInput.addEventListener('change', handlers.handleFileSelect);
    fileInput.addEventListener('focus', handlers.handleFocus);
    
    if (config.dropZone) {
        config.dropZone.addEventListener('click', handlers.handleUploadAreaClick);
        config.dropZone.addEventListener('dragover', handlers.handleDragOver);
        config.dropZone.addEventListener('dragleave', handlers.handleDragLeave);
        config.dropZone.addEventListener('drop', handlers.handleDrop);
    }

    // Window focus to detect dialog cancellation
    window.addEventListener('focus', handlers.handleWindowFocus);

    // Store references for cleanup
    fileInput.dataset.fileInputHandlers = JSON.stringify({
        bound: true,
        hasDropZone: !!config.dropZone
    });

    // Return cleanup function
    return function cleanup() {
        // Remove dataset guards
        delete fileInput.dataset.fileInputBound;
        delete fileInput.dataset.dialogOpen;
        delete fileInput.dataset.fileInputHandlers;

        // Remove event listeners
        fileInput.removeEventListener('change', handlers.handleFileSelect);
        fileInput.removeEventListener('focus', handlers.handleFocus);
        
        if (config.dropZone) {
            config.dropZone.removeEventListener('click', handlers.handleUploadAreaClick);
            config.dropZone.removeEventListener('dragover', handlers.handleDragOver);
            config.dropZone.removeEventListener('dragleave', handlers.handleDragLeave);
            config.dropZone.removeEventListener('drop', handlers.handleDrop);
            config.dropZone.classList.remove('drag-over');
        }

        window.removeEventListener('focus', handlers.handleWindowFocus);

        console.log('File input handler cleaned up');
    };
}

/**
 * Utility function to check if file input is already bound
 * @param {HTMLInputElement} fileInput - The file input element to check
 * @returns {boolean} True if already bound
 */
function isFileInputBound(fileInput) {
    return fileInput && fileInput.dataset.fileInputBound === 'true';
}

/**
 * Utility function to force cleanup of existing bindings
 * @param {HTMLInputElement} fileInput - The file input element to clean
 */
function cleanupFileInput(fileInput) {
    if (!fileInput) return;

    // Remove all dataset guards
    delete fileInput.dataset.fileInputBound;
    delete fileInput.dataset.dialogOpen;
    
    // Get drop zone if it exists
    const uploadArea = document.getElementById('uploadArea');
    
    // Clone and replace elements to remove all listeners (nuclear option)
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    if (uploadArea) {
        const newUploadArea = uploadArea.cloneNode(true);
        uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
        // Restore child elements content if needed
        newUploadArea.innerHTML = uploadArea.innerHTML;
    }
    
    console.log('File input forcefully cleaned');
}

// Export functions for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        bindFileInputHandler,
        isFileInputBound,
        cleanupFileInput
    };
}

// Make available globally for existing code
window.FileInputUtils = {
    bindFileInputHandler,
    isFileInputBound,
    cleanupFileInput
};