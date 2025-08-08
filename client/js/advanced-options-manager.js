/**
 * Universal Advanced Options Manager
 * Provides consistent advanced options handling across all FileFlow tools
 * - Form value collection and validation
 * - State persistence with localStorage
 * - Parameter mapping for server requests
 * - Error handling and user feedback
 * - Accessibility support
 */

class AdvancedOptionsManager {
    /**
     * Initialize the Advanced Options Manager
     * @param {string} toolName - Name of the tool (e.g., 'pdf-to-word', 'audio-converter')
     */
    constructor(toolName) {
        this.toolName = toolName;
        this.config = null;
        this.storageKey = `${toolName}AdvancedOptions`;
        
        // Bind methods to maintain context
        this.collectOptions = this.collectOptions.bind(this);
        this.validateOptions = this.validateOptions.bind(this);
        this.savePreferences = this.savePreferences.bind(this);
        this.loadPreferences = this.loadPreferences.bind(this);
        
        this.init();
    }

    /**
     * Initialize the manager and load configuration
     */
    async init() {
        try {
            await this.loadConfiguration();
            await this.setupEventListeners();
            await this.loadPreferences();
            
            console.log(`✅ Advanced Options Manager initialized for ${this.toolName}`);
        } catch (error) {
            console.error(`❌ Failed to initialize Advanced Options Manager for ${this.toolName}:`, error);
            // Graceful degradation - continue without advanced options
            this.config = { defaultOptions: {}, validation: {}, parameterMapping: {} };
        }
    }

    /**
     * Load tool configuration from the central config
     */
    async loadConfiguration() {
        try {
            const response = await fetch('/config/advancedOptionsMap.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            
            const allConfigs = await response.json();
            this.config = allConfigs[this.toolName];
            
            if (!this.config) {
                throw new Error(`No configuration found for tool: ${this.toolName}`);
            }
            
            // Set default configuration structure if missing
            this.config.defaultOptions = this.config.defaultOptions || {};
            this.config.validation = this.config.validation || {};
            this.config.parameterMapping = this.config.parameterMapping || {};
            
        } catch (error) {
            console.warn(`Configuration loading failed for ${this.toolName}, using defaults:`, error);
            throw error;
        }
    }

    /**
     * Setup event listeners for advanced options form elements
     */
    async setupEventListeners() {
        if (!this.config.defaultOptions) return;

        // Setup change listeners for all form elements to save preferences
        Object.keys(this.config.defaultOptions).forEach(optionKey => {
            const element = document.getElementById(optionKey);
            if (element) {
                element.addEventListener('change', () => {
                    this.savePreferences();
                    this.validateField(optionKey, element.value || element.checked);
                });

                // Add input event for real-time validation on text/number inputs
                if (element.type === 'text' || element.type === 'number' || element.type === 'range') {
                    element.addEventListener('input', () => {
                        this.validateField(optionKey, element.value, true);
                    });
                }
            }
        });

        // Setup dynamic field dependencies (e.g., show custom bitrate when quality is "custom")
        this.setupFieldDependencies();
    }

    /**
     * Setup field dependencies (show/hide fields based on other field values)
     */
    setupFieldDependencies() {
        // Audio quality -> custom bitrate dependency
        if (this.toolName === 'audio-converter') {
            const qualitySelect = document.getElementById('audioQuality');
            const customBitrateGroup = document.getElementById('customBitrateGroup');
            
            if (qualitySelect && customBitrateGroup) {
                const updateCustomBitrateVisibility = () => {
                    const isCustom = qualitySelect.value === 'custom';
                    customBitrateGroup.style.display = isCustom ? 'block' : 'none';
                    
                    // Mark required/optional
                    const customBitrateInput = document.getElementById('customBitrate');
                    if (customBitrateInput) {
                        customBitrateInput.required = isCustom;
                    }
                };
                
                qualitySelect.addEventListener('change', updateCustomBitrateVisibility);
                updateCustomBitrateVisibility(); // Initial setup
            }
        }

        // Add more tool-specific dependencies here as needed
        this.setupToolSpecificDependencies();
    }

    /**
     * Setup tool-specific field dependencies
     */
    setupToolSpecificDependencies() {
        switch (this.toolName) {
            case 'pdf-watermark':
                this.setupWatermarkDependencies();
                break;
            case 'pdf-split':
                this.setupSplitModeDependencies();
                break;
            case 'video-trim':
                this.setupTimeDependencies();
                break;
            // Add more cases as needed
        }
    }

    /**
     * Setup watermark-specific dependencies
     */
    setupWatermarkDependencies() {
        const positionSelect = document.getElementById('watermarkPosition');
        const rotationInput = document.getElementById('watermarkRotation');
        
        if (positionSelect && rotationInput) {
            positionSelect.addEventListener('change', () => {
                // Auto-adjust rotation based on position
                if (positionSelect.value.includes('left')) {
                    rotationInput.value = '0';
                } else if (positionSelect.value.includes('right')) {
                    rotationInput.value = '0';
                }
            });
        }
    }

    /**
     * Setup PDF split mode dependencies
     */
    setupSplitModeDependencies() {
        const splitModeSelect = document.getElementById('splitMode');
        const pagesPerSplitGroup = document.getElementById('pagesPerSplitGroup');
        
        if (splitModeSelect && pagesPerSplitGroup) {
            const updatePagesVisibility = () => {
                const showPages = splitModeSelect.value === 'pages';
                pagesPerSplitGroup.style.display = showPages ? 'block' : 'none';
            };
            
            splitModeSelect.addEventListener('change', updatePagesVisibility);
            updatePagesVisibility();
        }
    }

    /**
     * Setup time field dependencies for video tools
     */
    setupTimeDependencies() {
        const startTimeInput = document.getElementById('startTime');
        const endTimeInput = document.getElementById('endTime');
        
        if (startTimeInput && endTimeInput) {
            const validateTimeRange = () => {
                const startTime = this.parseTime(startTimeInput.value);
                const endTime = this.parseTime(endTimeInput.value);
                
                if (startTime >= endTime) {
                    this.showFieldError(endTimeInput, 'End time must be after start time');
                    return false;
                } else {
                    this.clearFieldError(endTimeInput);
                    return true;
                }
            };
            
            startTimeInput.addEventListener('change', validateTimeRange);
            endTimeInput.addEventListener('change', validateTimeRange);
        }
    }

    /**
     * Parse time string (HH:MM:SS) to seconds
     * @param {string} timeString - Time in HH:MM:SS format
     * @returns {number} Time in seconds
     */
    parseTime(timeString) {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Collect all advanced options from the form
     * @returns {Object} Object containing all option values
     */
    collectOptions() {
        const options = {};
        
        if (!this.config.defaultOptions) {
            return options;
        }

        Object.keys(this.config.defaultOptions).forEach(optionKey => {
            const element = document.getElementById(optionKey);
            if (element) {
                if (element.type === 'checkbox') {
                    options[optionKey] = element.checked;
                } else if (element.type === 'number' || element.type === 'range') {
                    options[optionKey] = parseFloat(element.value) || this.config.defaultOptions[optionKey];
                } else {
                    options[optionKey] = element.value || this.config.defaultOptions[optionKey];
                }
            } else {
                // Use default if element not found
                options[optionKey] = this.config.defaultOptions[optionKey];
            }
        });

        return options;
    }

    /**
     * Validate collected options against the configuration
     * @param {Object} options - Options to validate
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validateOptions(options = null) {
        options = options || this.collectOptions();
        const errors = [];
        let isValid = true;

        if (!this.config.validation) {
            return { isValid: true, errors: [] };
        }

        Object.keys(this.config.validation).forEach(optionKey => {
            const validation = this.config.validation[optionKey];
            const value = options[optionKey];

            const fieldError = this.validateField(optionKey, value, false);
            if (fieldError) {
                errors.push(fieldError);
                isValid = false;
            }
        });

        return { isValid, errors };
    }

    /**
     * Validate a single field
     * @param {string} optionKey - The field key
     * @param {any} value - The field value
     * @param {boolean} realTime - Whether this is real-time validation
     * @returns {string|null} Error message or null if valid
     */
    validateField(optionKey, value, realTime = false) {
        const validation = this.config.validation[optionKey];
        const element = document.getElementById(optionKey);
        
        if (!validation) return null;

        let error = null;

        // Required field validation
        if (validation.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
            error = `${this.getFieldLabel(optionKey)} is required`;
        }

        // Type-specific validation
        if (!error && value !== null && value !== undefined && value !== '') {
            switch (validation.type) {
                case 'number':
                    if (isNaN(value)) {
                        error = `${this.getFieldLabel(optionKey)} must be a valid number`;
                    } else {
                        const numValue = parseFloat(value);
                        if (validation.min !== undefined && numValue < validation.min) {
                            error = `${this.getFieldLabel(optionKey)} must be at least ${validation.min}`;
                        } else if (validation.max !== undefined && numValue > validation.max) {
                            error = `${this.getFieldLabel(optionKey)} must be no more than ${validation.max}`;
                        }
                    }
                    break;

                case 'select':
                    if (validation.options && !validation.options.includes(value)) {
                        error = `${this.getFieldLabel(optionKey)} must be one of: ${validation.options.join(', ')}`;
                    }
                    break;

                case 'color':
                    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                        error = `${this.getFieldLabel(optionKey)} must be a valid color (e.g., #000000)`;
                    }
                    break;

                case 'time':
                    if (!/^\d{2}:\d{2}:\d{2}$/.test(value)) {
                        error = `${this.getFieldLabel(optionKey)} must be in HH:MM:SS format`;
                    }
                    break;
            }
        }

        // Update field UI based on validation result
        if (element) {
            if (error) {
                this.showFieldError(element, error, realTime);
            } else {
                this.clearFieldError(element);
            }
        }

        return error;
    }

    /**
     * Get user-friendly field label
     * @param {string} optionKey - The field key
     * @returns {string} Human-readable field label
     */
    getFieldLabel(optionKey) {
        const element = document.getElementById(optionKey);
        const label = element ? document.querySelector(`label[for="${optionKey}"]`) : null;
        
        if (label) {
            return label.textContent.trim();
        }
        
        // Generate label from camelCase key
        return optionKey.replace(/([A-Z])/g, ' $1')
                       .replace(/^./, str => str.toUpperCase())
                       .trim();
    }

    /**
     * Show field error in UI
     * @param {HTMLElement} element - The form element
     * @param {string} error - Error message
     * @param {boolean} realTime - Whether this is real-time validation
     */
    showFieldError(element, error, realTime = false) {
        // Clear existing error
        this.clearFieldError(element);
        
        // Add error class
        element.classList.add('error');
        element.setAttribute('aria-invalid', 'true');
        
        // Don't show error messages for real-time validation on incomplete input
        if (realTime && element.value.length === 0) {
            return;
        }
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error-message';
        errorElement.textContent = error;
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'polite');
        errorElement.id = `${element.id}-error`;
        
        // Link error to field for accessibility
        element.setAttribute('aria-describedby', errorElement.id);
        
        // Insert error message after the field
        element.parentNode.insertBefore(errorElement, element.nextSibling);
    }

    /**
     * Clear field error from UI
     * @param {HTMLElement} element - The form element
     */
    clearFieldError(element) {
        element.classList.remove('error');
        element.setAttribute('aria-invalid', 'false');
        
        // Remove error message
        const errorElement = document.getElementById(`${element.id}-error`);
        if (errorElement) {
            errorElement.remove();
        }
        
        // Remove aria-describedby if it only referenced the error
        if (element.getAttribute('aria-describedby') === `${element.id}-error`) {
            element.removeAttribute('aria-describedby');
        }
    }

    /**
     * Map frontend option names to backend parameter names
     * @param {Object} options - Frontend options
     * @returns {Object} Backend parameters
     */
    mapToBackendParameters(options) {
        const backendParams = {};
        
        Object.keys(options).forEach(optionKey => {
            const backendKey = this.config.parameterMapping[optionKey] || optionKey;
            backendParams[backendKey] = options[optionKey];
        });
        
        return backendParams;
    }

    /**
     * Save user preferences to localStorage
     */
    savePreferences() {
        try {
            const options = this.collectOptions();
            localStorage.setItem(this.storageKey, JSON.stringify(options));
        } catch (error) {
            console.warn(`Failed to save preferences for ${this.toolName}:`, error);
        }
    }

    /**
     * Load user preferences from localStorage
     */
    async loadPreferences() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const preferences = JSON.parse(saved);
                this.applyPreferences(preferences);
            } else {
                // Apply default options
                this.applyPreferences(this.config.defaultOptions);
            }
        } catch (error) {
            console.warn(`Failed to load preferences for ${this.toolName}:`, error);
            // Fallback to defaults
            this.applyPreferences(this.config.defaultOptions);
        }
    }

    /**
     * Apply preferences to form elements
     * @param {Object} preferences - Preferences to apply
     */
    applyPreferences(preferences) {
        if (!preferences) return;

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.applyPreferences(preferences));
            return;
        }

        Object.keys(preferences).forEach(optionKey => {
            const element = document.getElementById(optionKey);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = Boolean(preferences[optionKey]);
                } else {
                    element.value = preferences[optionKey];
                }
                
                // Trigger change event to update dependencies
                element.dispatchEvent(new Event('change'));
            }
        });
    }

    /**
     * Get the server endpoint for this tool
     * @returns {string} API endpoint URL
     */
    getEndpoint() {
        return this.config.endpoint || `/api/${this.toolName}/convert`;
    }

    /**
     * Create FormData with file and advanced options for server request
     * @param {File|FileList} files - File(s) to convert
     * @param {Object} additionalParams - Additional parameters to include
     * @returns {FormData} FormData object ready for server request
     */
    createFormData(files, additionalParams = {}) {
        const formData = new FormData();
        
        // Add files
        if (files instanceof File) {
            formData.append('file', files);
        } else if (files instanceof FileList || Array.isArray(files)) {
            Array.from(files).forEach((file, index) => {
                if (this.toolName === 'jpg-to-pdf') {
                    formData.append('images', file);
                } else if (this.toolName === 'pdf-merge' || this.toolName === 'video-merger') {
                    formData.append('files', file);
                } else {
                    formData.append('file', file);
                }
            });
        }
        
        // Collect and validate options
        const validation = this.validateOptions();
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Add advanced options
        const options = this.collectOptions();
        const backendParams = this.mapToBackendParameters(options);
        
        Object.keys(backendParams).forEach(key => {
            formData.append(key, backendParams[key]);
        });
        
        // Add any additional parameters
        Object.keys(additionalParams).forEach(key => {
            formData.append(key, additionalParams[key]);
        });
        
        return formData;
    }

    /**
     * Show advanced options validation errors to user
     * @param {Array} errors - Array of error messages
     */
    showValidationErrors(errors) {
        // Find or create error container
        let errorContainer = document.getElementById('advancedOptionsErrors');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'advancedOptionsErrors';
            errorContainer.className = 'advanced-options-errors';
            errorContainer.setAttribute('role', 'alert');
            errorContainer.setAttribute('aria-live', 'polite');
            
            // Insert into advanced options section
            const advancedOptions = document.getElementById('advancedOptions') || 
                                   document.querySelector('.advanced-options');
            if (advancedOptions) {
                advancedOptions.insertBefore(errorContainer, advancedOptions.firstChild);
            }
        }
        
        // Display errors - using safe DOM methods to prevent XSS
        errorContainer.innerHTML = ''; // Clear existing content
        
        const errorHeader = document.createElement('div');
        errorHeader.className = 'error-header';
        errorHeader.textContent = 'Please fix the following issues:';
        
        const errorList = document.createElement('ul');
        errorList.className = 'error-list';
        
        errors.forEach(error => {
            const listItem = document.createElement('li');
            listItem.textContent = error; // Safe text assignment
            errorList.appendChild(listItem);
        });
        
        errorContainer.appendChild(errorHeader);
        errorContainer.appendChild(errorList);
        errorContainer.style.display = 'block';
        
        // Scroll to errors
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Hide validation errors
     */
    hideValidationErrors() {
        const errorContainer = document.getElementById('advancedOptionsErrors');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    /**
     * Reset all options to defaults
     */
    resetToDefaults() {
        this.applyPreferences(this.config.defaultOptions);
        this.savePreferences();
        this.hideValidationErrors();
        console.log(`Reset ${this.toolName} options to defaults`);
    }

    /**
     * Export current options as JSON
     * @returns {string} JSON string of current options
     */
    exportOptions() {
        const options = this.collectOptions();
        return JSON.stringify(options, null, 2);
    }

    /**
     * Import options from JSON
     * @param {string} jsonString - JSON string of options
     */
    importOptions(jsonString) {
        try {
            const options = JSON.parse(jsonString);
            this.applyPreferences(options);
            this.savePreferences();
            console.log(`Imported options for ${this.toolName}`);
        } catch (error) {
            console.error(`Failed to import options for ${this.toolName}:`, error);
            throw new Error('Invalid options format');
        }
    }
}

// Export for use in tool-specific converters
window.AdvancedOptionsManager = AdvancedOptionsManager;

/**
 * Factory function to create Advanced Options Manager for a tool
 * @param {string} toolName - Name of the tool
 * @returns {AdvancedOptionsManager} Initialized manager instance
 */
window.createAdvancedOptionsManager = function(toolName) {
    return new AdvancedOptionsManager(toolName);
};