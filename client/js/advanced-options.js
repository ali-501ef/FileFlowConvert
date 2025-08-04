/**
 * Advanced Options Handler
 * Manages the advanced options toggle functionality and settings
 */

class AdvancedOptionsHandler {
    constructor() {
        this.initializeToggle();
        this.initializeRangeSliders();
    }
    
    initializeToggle() {
        const advancedToggle = document.getElementById('advanced-toggle');
        const advancedContent = document.getElementById('advanced-content');
        const advancedSection = document.getElementById('advanced-options-section');
        
        if (!advancedToggle || !advancedContent) {
            return; // Advanced options not available on this page
        }
        
        // Show advanced options section when files are selected
        this.showAdvancedOptionsWhenFilesSelected();
        
        // Toggle functionality
        advancedToggle.addEventListener('click', () => {
            const isExpanded = advancedToggle.classList.contains('expanded');
            
            if (isExpanded) {
                this.collapseOptions(advancedToggle, advancedContent);
            } else {
                this.expandOptions(advancedToggle, advancedContent);
            }
        });
    }
    
    showAdvancedOptionsWhenFilesSelected() {
        // Check for file selection changes
        const fileInput = document.getElementById('file-input');
        const advancedSection = document.getElementById('advanced-options-section');
        
        if (fileInput && advancedSection) {
            const checkFiles = () => {
                const hasFiles = fileInput.files && fileInput.files.length > 0;
                if (hasFiles) {
                    advancedSection.classList.remove('hidden');
                }
            };
            
            fileInput.addEventListener('change', checkFiles);
            
            // Also check when files are dropped (if FileHandler is available)
            if (window.fileHandler) {
                const originalDisplayFiles = window.fileHandler.displaySelectedFiles;
                window.fileHandler.displaySelectedFiles = function() {
                    originalDisplayFiles.call(this);
                    if (this.selectedFiles.length > 0) {
                        advancedSection.classList.remove('hidden');
                    }
                };
            }
        }
    }
    
    expandOptions(toggle, content) {
        toggle.classList.add('expanded');
        content.classList.add('expanded');
        
        // Update toggle text
        const toggleText = toggle.querySelector('.advanced-toggle-text');
        if (toggleText) {
            toggleText.textContent = 'Hide Advanced Options';
        }
    }
    
    collapseOptions(toggle, content) {
        toggle.classList.remove('expanded');
        content.classList.remove('expanded');
        
        // Update toggle text
        const toggleText = toggle.querySelector('.advanced-toggle-text');
        if (toggleText) {
            toggleText.textContent = 'Advanced Options';
        }
    }
    
    initializeRangeSliders() {
        const rangeSliders = document.querySelectorAll('.range-slider');
        
        rangeSliders.forEach(slider => {
            const updateValue = () => {
                const value = slider.value;
                const valueDisplay = slider.parentElement.querySelector('.range-value');
                if (valueDisplay) {
                    valueDisplay.textContent = this.formatRangeValue(slider, value);
                }
            };
            
            slider.addEventListener('input', updateValue);
            updateValue(); // Initialize display
        });
    }
    
    formatRangeValue(slider, value) {
        const id = slider.id;
        
        if (id.includes('quality') || id.includes('compression')) {
            return `${value}%`;
        } else if (id.includes('bitrate')) {
            return `${value} kbps`;
        } else if (id.includes('fps')) {
            return `${value} fps`;
        }
        
        return value;
    }
    
    // Get all advanced settings as an object
    getAdvancedSettings() {
        const settings = {};
        
        // Get resize dimensions
        const width = document.getElementById('width');
        const height = document.getElementById('height');
        if (width && height) {
            settings.resize = {
                width: width.value ? parseInt(width.value) : null,
                height: height.value ? parseInt(height.value) : null
            };
        }
        
        // Get compression/quality settings
        const compression = document.getElementById('compression');
        const quality = document.getElementById('quality');
        if (compression) {
            settings.compression = compression.value;
        }
        if (quality) {
            settings.quality = parseFloat(quality.value);
        }
        
        // Get metadata preservation
        const preserveMetadata = document.getElementById('preserve-metadata');
        if (preserveMetadata) {
            settings.preserveMetadata = preserveMetadata.checked;
        }
        
        // Get PDF settings
        const pageRange = document.getElementById('page-range');
        const orientation = document.getElementById('orientation');
        const paperSize = document.getElementById('paper-size');
        if (pageRange) settings.pageRange = pageRange.value;
        if (orientation) settings.orientation = orientation.value;
        if (paperSize) settings.paperSize = paperSize.value;
        
        // Get audio settings
        const bitrate = document.getElementById('bitrate');
        const trimStart = document.getElementById('trim-start');
        const trimEnd = document.getElementById('trim-end');
        if (bitrate) settings.bitrate = parseInt(bitrate.value);
        if (trimStart) settings.trimStart = parseFloat(trimStart.value);
        if (trimEnd) settings.trimEnd = parseFloat(trimEnd.value);
        
        // Get video settings
        const resolution = document.getElementById('resolution');
        const fps = document.getElementById('fps');
        if (resolution) settings.resolution = resolution.value;
        if (fps) settings.fps = parseInt(fps.value);
        
        return settings;
    }
    
    // Apply settings to conversion process
    applySettingsToCanvas(canvas, ctx, settings) {
        if (!settings.resize || (!settings.resize.width && !settings.resize.height)) {
            return canvas;
        }
        
        const { width, height } = settings.resize;
        if (width && height) {
            // Resize canvas
            const resizedCanvas = document.createElement('canvas');
            const resizedCtx = resizedCanvas.getContext('2d');
            
            resizedCanvas.width = width;
            resizedCanvas.height = height;
            
            resizedCtx.drawImage(canvas, 0, 0, width, height);
            return resizedCanvas;
        }
        
        return canvas;
    }
}

// Initialize advanced options when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.advancedOptionsHandler = new AdvancedOptionsHandler();
});