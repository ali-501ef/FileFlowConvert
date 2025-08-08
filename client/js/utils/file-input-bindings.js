/**
 * FileFlow File Input Binding System
 * Handles ff-* class based file picker interactions with Safari/iOS compliance
 * Provides diagnostic logging and prevents double-open bugs
 */

class FileInputBindings {
    constructor() {
        this.boundElements = new Set();
        this.diagnostics = {
            enabled: localStorage.getItem('ff-diagnostics') === 'true',
            log: (message, data = null) => {
                if (this.diagnostics.enabled) {
                    console.log(`[FF-FileInput] ${message}`, data || '');
                }
            }
        };
        
        this.init();
    }

    init() {
        this.diagnostics.log('Initializing FileFlow file input bindings');
        
        // Clean up any existing bindings to prevent duplicates
        this.cleanup();
        
        // Bind on DOMContentLoaded and immediate execution
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindAll());
        } else {
            this.bindAll();
        }
        
        // Handle SPA navigation - watch for dynamic content changes
        this.setupSPAWatching();
        
        // Add diagnostics toggle
        this.setupDiagnostics();
    }

    cleanup() {
        this.diagnostics.log('Cleaning up existing bindings', `${this.boundElements.size} elements`);
        
        // Remove all existing event listeners from bound elements
        this.boundElements.forEach(element => {
            if (element && element.parentNode) {
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
            }
        });
        
        this.boundElements.clear();
    }

    bindAll() {
        this.diagnostics.log('Scanning for ff-upload-area elements');
        
        const uploadAreas = document.querySelectorAll('.ff-upload-area');
        let boundCount = 0;
        
        uploadAreas.forEach(area => {
            if (this.bindUploadArea(area)) {
                boundCount++;
            }
        });
        
        this.diagnostics.log(`Binding complete`, `${boundCount}/${uploadAreas.length} areas bound`);
    }

    bindUploadArea(area) {
        // Check if already bound using data attribute guard
        if (area.dataset.ffBound === 'true') {
            this.diagnostics.log('Skipping already bound area', area.dataset.pageId);
            return false;
        }

        const button = area.querySelector('.ff-choose-btn');
        const input = area.querySelector('.ff-file-input');
        const pageId = area.dataset.pageId || 'unknown';

        if (!button || !input) {
            this.diagnostics.log('Missing required elements', {
                pageId,
                hasButton: !!button,
                hasInput: !!input
            });
            return false;
        }

        // Remove legacy onclick handlers to prevent double-open bugs
        area.removeAttribute('onclick');
        button.removeAttribute('onclick');
        input.removeAttribute('onclick');

        // Set up the binding with synchronous user gesture handling for Safari/iOS
        const clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            this.diagnostics.log('File picker triggered', {
                pageId,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            });

            // Synchronous file input trigger (required for Safari/iOS)
            input.click();
        };

        // Bind click event to button
        button.addEventListener('click', clickHandler);
        
        // Add file change handler for diagnostics
        input.addEventListener('change', (event) => {
            const files = event.target.files;
            this.diagnostics.log('Files selected', {
                pageId,
                fileCount: files.length,
                fileNames: Array.from(files).map(f => f.name)
            });
        });

        // Mark as bound and track
        area.dataset.ffBound = 'true';
        this.boundElements.add(area);

        this.diagnostics.log('Successfully bound upload area', {
            pageId,
            button: button.className,
            input: input.className
        });

        return true;
    }

    setupSPAWatching() {
        // Watch for DOM changes to handle dynamically added content
        const observer = new MutationObserver((mutations) => {
            let shouldRebind = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasUploadArea = node.classList?.contains('ff-upload-area') || 
                                                node.querySelector?.('.ff-upload-area');
                            if (hasUploadArea) {
                                shouldRebind = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRebind) {
                this.diagnostics.log('DOM changes detected, rebinding');
                setTimeout(() => this.bindAll(), 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.diagnostics.log('SPA watching enabled');
    }

    setupDiagnostics() {
        // Add diagnostic controls to page
        if (window.location.search.includes('ff-debug=1')) {
            this.enableDiagnostics();
        }

        // Global diagnostic functions
        window.ffDiagnostics = {
            enable: () => this.enableDiagnostics(),
            disable: () => this.disableDiagnostics(),
            status: () => this.getDiagnosticStatus(),
            test: (pageId) => this.testFileInput(pageId),
            rebind: () => this.bindAll()
        };
    }

    enableDiagnostics() {
        this.diagnostics.enabled = true;
        localStorage.setItem('ff-diagnostics', 'true');
        this.diagnostics.log('Diagnostics enabled');
        
        // Add visual indicator
        const indicator = document.createElement('div');
        indicator.id = 'ff-diagnostic-indicator';
        indicator.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 10000;
            background: #4CAF50; color: white; padding: 5px 10px;
            border-radius: 4px; font-size: 12px; font-family: monospace;
        `;
        indicator.textContent = 'FF-Debug ON';
        document.body.appendChild(indicator);
    }

    disableDiagnostics() {
        this.diagnostics.enabled = false;
        localStorage.removeItem('ff-diagnostics');
        
        const indicator = document.getElementById('ff-diagnostic-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    getDiagnosticStatus() {
        return {
            enabled: this.diagnostics.enabled,
            boundElements: this.boundElements.size,
            pages: Array.from(this.boundElements).map(el => el.dataset.pageId).filter(Boolean)
        };
    }

    testFileInput(pageId) {
        const area = document.querySelector(`[data-page-id="${pageId}"]`);
        if (!area) {
            console.warn(`No upload area found for page: ${pageId}`);
            return false;
        }

        const button = area.querySelector('.ff-choose-btn');
        if (button) {
            this.diagnostics.log('Testing file input', pageId);
            button.click();
            return true;
        }

        return false;
    }
}

// Initialize the binding system
new FileInputBindings();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileInputBindings;
}