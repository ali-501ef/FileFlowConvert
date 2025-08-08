/**
 * Advanced Options Handler
 * Manages the toggle functionality for advanced options across all tools
 * Now integrates with the Universal Advanced Options Manager
 */

class AdvancedOptionsHandler {
    constructor() {
        this.initializeToggle();
        this.optionsManager = null; // Will be set by individual tools
    }

    /**
     * Set the Advanced Options Manager instance for this tool
     * @param {AdvancedOptionsManager} manager - The manager instance
     */
    setOptionsManager(manager) {
        this.optionsManager = manager;
    }

    initializeToggle() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggle());
        } else {
            this.setupToggle();
        }
    }

    setupToggle() {
        // Find all possible advanced options elements
        const toggleSelectors = [
            '#advanced-toggle',
            '.advanced-toggle', 
            '.options-header',
            '#optionsToggle'
        ];

        const contentSelectors = [
            '#advanced-content',
            '.advanced-content',
            '.options-content',
            '#optionsContent'
        ];

        // Try to find toggle and content elements
        let advancedToggle = null;
        let advancedContent = null;

        for (const selector of toggleSelectors) {
            advancedToggle = document.querySelector(selector);
            if (advancedToggle) break;
        }

        for (const selector of contentSelectors) {
            advancedContent = document.querySelector(selector);
            if (advancedContent) break;
        }

        if (advancedToggle && advancedContent) {
            this.attachToggleListener(advancedToggle, advancedContent);
        }

        // Also setup for any existing advanced options sections
        document.querySelectorAll('.advanced-options').forEach(section => {
            const header = section.querySelector('.options-header') || section.querySelector('#optionsToggle');
            const content = section.querySelector('.options-content') || section.querySelector('#optionsContent');
            
            if (header && content) {
                this.attachToggleListener(header, content);
            }
        });

        // Setup reset and export buttons if present
        this.setupUtilityButtons();
    }

    /**
     * Setup utility buttons for advanced options
     */
    setupUtilityButtons() {
        // Reset to defaults button
        const resetBtn = document.getElementById('resetOptionsBtn') || 
                        document.querySelector('.reset-options-btn');
        if (resetBtn && this.optionsManager) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all advanced options to default values?')) {
                    this.optionsManager.resetToDefaults();
                }
            });
        }

        // Export options button
        const exportBtn = document.getElementById('exportOptionsBtn') || 
                         document.querySelector('.export-options-btn');
        if (exportBtn && this.optionsManager) {
            exportBtn.addEventListener('click', () => {
                const options = this.optionsManager.exportOptions();
                this.downloadTextFile(`${this.optionsManager.toolName}-options.json`, options);
            });
        }

        // Import options button
        const importBtn = document.getElementById('importOptionsBtn') || 
                         document.querySelector('.import-options-btn');
        const importFile = document.getElementById('importOptionsFile');
        
        if (importBtn && importFile && this.optionsManager) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            this.optionsManager.importOptions(e.target.result);
                            alert('Options imported successfully!');
                        } catch (error) {
                            alert('Failed to import options: ' + error.message);
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }
    }

    /**
     * Download text content as file
     * @param {string} filename - Name of the file
     * @param {string} content - Text content
     */
    downloadTextFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    attachToggleListener(toggleElement, contentElement) {
        // Remove any existing listeners
        const newToggle = toggleElement.cloneNode(true);
        toggleElement.parentNode.replaceChild(newToggle, toggleElement);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Handle both old and new advanced options structures
            const isActive = contentElement.classList.contains('active') ||
                             contentElement.style.display === 'block' || 
                             contentElement.style.display === 'flex' ||
                             (!contentElement.style.display || contentElement.style.display === '');

            if (isActive && contentElement.style.display !== 'none') {
                // Collapse - use new structure classes
                contentElement.classList.remove('active');
                contentElement.style.display = 'none';
                newToggle.classList.remove('active');
                
                // Update chevron
                const chevron = newToggle.querySelector('.advanced-chevron') || 
                               newToggle.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            } else {
                // Expand - use new structure classes
                contentElement.classList.add('active');
                contentElement.style.display = 'block';
                newToggle.classList.add('active');
                
                // Update chevron  
                const chevron = newToggle.querySelector('.advanced-chevron') || 
                               newToggle.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
            }
        });

        // Initially hide content
        contentElement.style.display = 'none';
    }
}

// Initialize advanced options handler
window.advancedOptionsHandler = new AdvancedOptionsHandler();