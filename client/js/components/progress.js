/**
 * Shared Progress Component
 * Used across all Audio/Video tools for consistent progress tracking
 */
class ProgressTracker {
    constructor(config) {
        this.config = {
            progressContainerId: 'progressContainer',
            progressFillId: 'progressFill',
            progressTextId: 'progressText',
            progressStageId: 'progressStage',
            showStages: false,
            ...config
        };
        
        this.init();
    }
    
    init() {
        this.progressContainer = document.getElementById(this.config.progressContainerId);
        this.progressFill = document.getElementById(this.config.progressFillId);
        this.progressText = document.getElementById(this.config.progressTextId);
        this.progressStage = this.config.showStages ? document.getElementById(this.config.progressStageId) : null;
        
        if (!this.progressContainer || !this.progressFill || !this.progressText) {
            console.error('ProgressTracker: Required elements not found', {
                progressContainer: this.progressContainer,
                progressFill: this.progressFill,
                progressText: this.progressText
            });
            throw new Error('Progress elements not found');
        }
        console.log('ProgressTracker: Initialized successfully');
    }
    
    show(percent = 0, stage = null) {
        this.progressContainer.style.display = 'block';
        this.updateProgress(percent, stage);
    }
    
    hide() {
        this.progressContainer.style.display = 'none';
    }
    
    updateProgress(percent, stage = null) {
        // Ensure percent is within bounds
        percent = Math.max(0, Math.min(100, percent));
        
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = percent + '%';
        
        if (this.progressStage && stage) {
            this.progressStage.textContent = stage;
        }
    }
    
    setStage(stage) {
        if (this.progressStage) {
            this.progressStage.textContent = stage;
        }
    }
    
    reset() {
        this.updateProgress(0);
        if (this.progressStage) {
            this.progressStage.textContent = '';
        }
    }
    
    complete() {
        this.updateProgress(100, 'Complete!');
    }
}

/**
 * Button Loading State Manager
 * Manages convert button loading states
 */
class ButtonLoader {
    constructor(buttonId) {
        this.button = document.getElementById(buttonId);
        this.btnText = this.button?.querySelector('.btn-text');
        this.btnLoader = this.button?.querySelector('.btn-loader');
        
        if (!this.button || !this.btnText || !this.btnLoader) {
            console.error('ButtonLoader: Required elements not found', {
                buttonId: buttonId,
                button: this.button,
                btnText: this.btnText,
                btnLoader: this.btnLoader
            });
            throw new Error('Button or loading elements not found');
        }
        console.log('ButtonLoader: Initialized successfully for button:', buttonId);
    }
    
    showLoading() {
        this.btnText.style.display = 'none';
        this.btnLoader.style.display = 'block';
        this.button.disabled = true;
    }
    
    hideLoading() {
        this.btnText.style.display = 'block';
        this.btnLoader.style.display = 'none';
        this.button.disabled = false;
    }
    
    setDisabled(disabled) {
        this.button.disabled = disabled;
    }
}

/**
 * Error Display Manager
 * Consistent error display across tools
 */
class ErrorDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error('ErrorDisplay: Container not found:', containerId);
            throw new Error('Error container not found');
        }
        console.log('ErrorDisplay: Initialized successfully for container:', containerId);
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        this.container.innerHTML = '';
        this.container.appendChild(errorDiv);
        this.container.style.display = 'block';
    }
    
    hideError() {
        this.container.style.display = 'none';
        this.container.innerHTML = '';
    }
    
    clear() {
        this.hideError();
    }
}

/**
 * File Size Formatter Utility
 */
class FileUtils {
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * Analytics Tracker
 */
class AnalyticsTracker {
    static trackConversion(category, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'event_category': category,
                'event_label': label,
                'value': 1
            });
        }
    }
}

// Export components for use in other modules
window.ProgressTracker = ProgressTracker;
window.ButtonLoader = ButtonLoader;
window.ErrorDisplay = ErrorDisplay;
window.FileUtils = FileUtils;
window.AnalyticsTracker = AnalyticsTracker;