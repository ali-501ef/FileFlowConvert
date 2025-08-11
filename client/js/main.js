/**
 * FileFlow - Main JavaScript Module
 * Handles common functionality across all pages
 */

// Common utility functions
const FileFlowUtils = {
    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Generate unique ID for elements
     * @returns {string} Unique ID
     */
    generateId() {
        return 'ff_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Show element with optional animation
     * @param {HTMLElement} element - Element to show
     * @param {boolean} animate - Whether to animate
     */
    showElement(element, animate = true) {
        element.classList.remove('hidden');
        if (animate) {
            element.classList.add('fade-in');
        }
    },

    /**
     * Hide element
     * @param {HTMLElement} element - Element to hide
     */
    hideElement(element) {
        element.classList.add('hidden');
        element.classList.remove('fade-in');
    },

    /**
     * Download file with given data and filename
     * @param {Blob} blob - File data
     * @param {string} filename - Download filename
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Create file card element
     * @param {File} file - File object
     * @param {number} index - File index
     * @param {Function} onRemove - Remove callback
     * @param {boolean} draggable - Whether card is draggable
     * @returns {HTMLElement} File card element
     */
    createFileCard(file, index, onRemove, draggable = false) {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.dataset.index = index;
        
        // Check for file size errors (50MB limit for video files)
        const isVideo = file.type.startsWith('video/');
        const hasError = isVideo && file.size > 50 * 1024 * 1024;
        
        // Create drag handle if needed
        if (draggable) {
            const dragHandle = document.createElement('button');
            dragHandle.className = 'drag-handle';
            dragHandle.setAttribute('data-testid', `handle-drag-${index}`);
            dragHandle.innerHTML = `
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4M8 15l4 4 4 4"></path>
                </svg>
            `;
            fileCard.appendChild(dragHandle);
        }
        
        // Create file info section
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        fileIcon.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
        `;
        
        const fileDetails = document.createElement('div');
        fileDetails.className = 'file-details';
        
        // Safely set file name using textContent
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        fileDetails.appendChild(fileName);
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = this.formatFileSize(file.size);
        fileDetails.appendChild(fileSize);
        
        if (hasError) {
            const fileError = document.createElement('div');
            fileError.className = 'file-error';
            fileError.textContent = 'File too large (max 50MB for videos)';
            fileDetails.appendChild(fileError);
        }
        
        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileDetails);
        fileCard.appendChild(fileInfo);
        
        // Create remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'file-remove';
        removeButton.setAttribute('data-testid', `button-remove-${index}`);
        removeButton.onclick = () => removeFile(index);
        removeButton.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `;
        fileCard.appendChild(removeButton);
        
        return fileCard;
    },

    /**
     * Create download link element
     * @param {string} filename - File name
     * @param {Blob} blob - File data
     * @returns {HTMLElement} Download link element
     */
    createDownloadLink(filename, blob) {
        const downloadLink = document.createElement('div');
        downloadLink.className = 'download-link';
        
        // Create download info section
        const downloadInfo = document.createElement('div');
        downloadInfo.className = 'download-info';
        
        const downloadIcon = document.createElement('svg');
        downloadIcon.className = 'download-icon';
        downloadIcon.setAttribute('fill', 'none');
        downloadIcon.setAttribute('stroke', 'currentColor');
        downloadIcon.setAttribute('viewBox', '0 0 24 24');
        downloadIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-6 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        `;
        
        // Safely set filename using textContent
        const filenameSpan = document.createElement('span');
        filenameSpan.className = 'download-filename';
        filenameSpan.textContent = filename;
        
        downloadInfo.appendChild(downloadIcon);
        downloadInfo.appendChild(filenameSpan);
        downloadLink.appendChild(downloadInfo);
        
        // Create download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'btn btn-success';
        downloadButton.setAttribute('data-testid', `button-download-${filename}`);
        downloadButton.textContent = 'Download';
        downloadButton.onclick = () => {
            FileFlowUtils.downloadFile(blob, filename);
        };
        
        downloadLink.appendChild(downloadButton);
        
        return downloadLink;
    }
};

// Common file handling functionality
class FileHandler {
    constructor() {
        this.selectedFiles = [];
        this.setupEventListeners();
    }

    /**
     * Setup common event listeners
     */
    setupEventListeners() {
        const fileInput = document.getElementById('file-input');
        const dropZone = document.querySelector('.file-drop-zone');
        const convertBtn = document.getElementById('convert-btn');
        const clearBtn = document.getElementById('clear-btn');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }

        if (dropZone) {
            // Drag and drop handlers
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                this.handleFileSelection(e.dataTransfer.files);
            });
        }

        if (convertBtn) {
            convertBtn.addEventListener('click', () => {
                this.convertFiles();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFiles();
            });
        }
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    handleFileSelection(files) {
        if (!files || files.length === 0) return;

        this.selectedFiles = Array.from(files);
        this.displayFileList();
        this.showActionButtons();
    }

    /**
     * Display selected files
     */
    displayFileList() {
        const fileList = document.getElementById('file-list');
        const fileCards = document.getElementById('file-cards');
        
        if (!fileList || !fileCards) return;

        fileCards.innerHTML = '';
        
        // Check if this is PDF merge (sortable)
        const isSortable = fileCards.classList.contains('sortable');
        
        this.selectedFiles.forEach((file, index) => {
            const fileCard = FileFlowUtils.createFileCard(file, index, this.removeFile.bind(this), isSortable);
            fileCards.appendChild(fileCard);
        });

        // Setup sortable functionality for PDF merge
        if (isSortable) {
            this.setupSortable(fileCards);
        }

        FileFlowUtils.showElement(fileList);
    }

    /**
     * Setup sortable functionality for file reordering
     * @param {HTMLElement} container - Container element
     */
    setupSortable(container) {
        let draggedElement = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('drag-handle')) {
                draggedElement = e.target.closest('.file-card');
                draggedElement.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        container.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedElement);
            } else {
                container.insertBefore(draggedElement, afterElement);
            }
        });

        // Make file cards draggable
        container.querySelectorAll('.file-card').forEach(card => {
            card.draggable = true;
        });
    }

    /**
     * Get element after which dragged element should be inserted
     * @param {HTMLElement} container - Container element
     * @param {number} y - Y coordinate
     * @returns {HTMLElement|null} Target element
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.file-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * Show action buttons and quality settings if available
     */
    showActionButtons() {
        const actionButtons = document.getElementById('action-buttons');
        const qualitySettings = document.getElementById('quality-settings');
        
        if (actionButtons) {
            FileFlowUtils.showElement(actionButtons);
        }
        
        if (qualitySettings) {
            FileFlowUtils.showElement(qualitySettings);
        }
    }

    /**
     * Remove file from selection
     * @param {number} index - File index
     */
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length === 0) {
            this.clearFiles();
        } else {
            this.displayFileList();
        }
    }

    /**
     * Clear all files and reset interface
     */
    clearFiles() {
        this.selectedFiles = [];
        this.resetInterface();
    }

    /**
     * Reset interface to initial state
     */
    resetInterface() {
        const sections = ['file-list', 'progress-section', 'action-buttons', 'download-section', 'quality-settings'];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                FileFlowUtils.hideElement(section);
            }
        });

        // Clear containers
        const containers = ['file-cards', 'download-links'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Reset progress
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
    }

    /**
     * Show progress section and animate progress
     * @param {Function} onComplete - Callback when progress completes
     * @param {string} statusText - Optional status text
     */
    showProgress(onComplete, statusText = 'Converting files...') {
        const actionButtons = document.getElementById('action-buttons');
        const progressSection = document.getElementById('progress-section');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const progressLabel = document.querySelector('.progress-label');
        
        if (actionButtons) FileFlowUtils.hideElement(actionButtons);
        if (progressSection) FileFlowUtils.showElement(progressSection);
        if (progressLabel) progressLabel.textContent = statusText;
        
        // Animate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10 + 5; // Random progress between 5-15%
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressInterval);
                setTimeout(() => {
                    onComplete();
                }, 500);
            }
            
            if (progressBar) progressBar.style.width = progress + '%';
            if (progressText) progressText.textContent = Math.round(progress) + '%';
        }, 300);
    }

    /**
     * Show download results
     * @param {Array} results - Array of {filename, blob} objects
     */
    showDownloadResults(results) {
        const progressSection = document.getElementById('progress-section');
        const downloadSection = document.getElementById('download-section');
        const downloadLinks = document.getElementById('download-links');
        
        if (progressSection) FileFlowUtils.hideElement(progressSection);
        if (downloadSection) FileFlowUtils.showElement(downloadSection);
        
        if (downloadLinks) {
            downloadLinks.innerHTML = '';
            
            results.forEach(result => {
                const downloadLink = FileFlowUtils.createDownloadLink(result.filename, result.blob);
                downloadLinks.appendChild(downloadLink);
            });
        }
    }

    /**
     * Convert files - to be overridden by specific converters
     */
    convertFiles() {
        console.log('convertFiles method should be overridden by specific converter');
    }
}

// Global functions for onclick handlers
window.removeFile = function(index) {
    if (window.fileHandler) {
        window.fileHandler.removeFile(index);
    }
};

// Initialize file handler when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on a tool page (not homepage) and no specific converter will be loaded
    const hasFileInput = document.getElementById('file-input');
    const isConverterPage = window.location.pathname.includes('pdf-to-jpg') || 
                           window.location.pathname.includes('heic-to-jpg') ||
                           window.location.pathname.includes('jpg-to-png') ||
                           window.location.pathname.includes('pdf-merge') ||
                           window.location.pathname.includes('mp4-to-mp3');
    
    if (hasFileInput && !isConverterPage) {
        window.fileHandler = new FileHandler();
    }
    
    // Setup smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FileFlowUtils, FileHandler };
}
