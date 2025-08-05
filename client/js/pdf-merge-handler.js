/**
 * PDF Merge Advanced Options Handler
 * Handles the advanced options functionality specifically for PDF merge
 */

class PDFMergeHandler {
    constructor() {
        this.setupAdvancedOptions();
        this.setupMergeSettings();
    }

    setupAdvancedOptions() {
        // Wait for DOM to be fully loaded
        setTimeout(() => {
            const advancedToggle = document.getElementById('advanced-toggle');
            const advancedContent = document.getElementById('advanced-content');
            const chevron = document.querySelector('.advanced-chevron');
            
            console.log('Advanced toggle setup:', {
                toggle: !!advancedToggle,
                content: !!advancedContent,
                chevron: !!chevron
            });
            
            if (advancedToggle && advancedContent) {
                // Remove any existing listeners
                const newToggle = advancedToggle.cloneNode(true);
                advancedToggle.parentNode.replaceChild(newToggle, advancedToggle);
                
                newToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('Advanced options clicked');
                    
                    const isVisible = advancedContent.style.display === 'block';
                    
                    if (isVisible) {
                        // Collapse
                        advancedContent.style.display = 'none';
                        const newChevron = newToggle.querySelector('.toggle-chevron');
                        if (newChevron) {
                            newChevron.style.transform = 'rotate(0deg)';
                        }
                        console.log('Advanced options collapsed');
                    } else {
                        // Expand
                        advancedContent.style.display = 'block';
                        const newChevron = newToggle.querySelector('.toggle-chevron');
                        if (newChevron) {
                            newChevron.style.transform = 'rotate(180deg)';
                        }
                        console.log('Advanced options expanded');
                    }
                });
                
                // Set initial state
                advancedContent.style.display = 'none';
                console.log('Advanced options setup complete');
            } else {
                console.error('Advanced options elements not found:', {
                    toggle: advancedToggle,
                    content: advancedContent
                });
            }
        }, 100);
    }

    setupMergeSettings() {
        // Add functionality to merge mode selector
        const mergeMode = document.getElementById('merge-mode');
        if (mergeMode) {
            mergeMode.addEventListener('change', (e) => {
                const mode = e.target.value;
                console.log('Merge mode changed to:', mode);
                
                if (mode === 'interleave') {
                    this.showInterleaveOptions();
                } else if (mode === 'custom') {
                    this.showCustomArrangementOptions();
                } else if (mode === 'split-merge') {
                    this.showSplitMergeOptions();
                } else {
                    this.hideExtraOptions();
                }
            });
        }

        // Add new settings listeners
        this.setupNewSettingsListeners();

        // Add functionality to output quality selector
        const outputQuality = document.getElementById('output-quality');
        if (outputQuality) {
            outputQuality.addEventListener('change', (e) => {
                const quality = e.target.value;
                console.log('Output quality changed to:', quality);
            });
        }

        // Add functionality to bookmark handling
        const bookmarkHandling = document.getElementById('bookmark-handling');
        if (bookmarkHandling) {
            bookmarkHandling.addEventListener('change', (e) => {
                const handling = e.target.value;
                console.log('Bookmark handling changed to:', handling);
            });
        }

        // Add functionality to metadata handling
        const metadataHandling = document.getElementById('metadata-handling');
        if (metadataHandling) {
            metadataHandling.addEventListener('change', (e) => {
                const handling = e.target.value;
                console.log('Metadata handling changed to:', handling);
                
                if (handling === 'custom') {
                    this.showCustomMetadataOptions();
                } else {
                    this.hideCustomMetadataOptions();
                }
            });
        }
    }

    showInterleaveOptions() {
        // Show options for interleaving pages
        const advancedGrid = document.querySelector('.advanced-grid');
        if (advancedGrid && !document.getElementById('interleave-options')) {
            const interleaveDiv = document.createElement('div');
            interleaveDiv.id = 'interleave-options';
            interleaveDiv.className = 'advanced-option';
            interleaveDiv.innerHTML = `
                <label class="advanced-label" for="interleave-pattern">Interleave Pattern</label>
                <select id="interleave-pattern" class="advanced-select">
                    <option value="1-1">1:1 (alternating pages)</option>
                    <option value="2-1">2:1 (2 pages from first, 1 from second)</option>
                    <option value="1-2">1:2 (1 page from first, 2 from second)</option>
                </select>
                <p class="advanced-hint">Choose how to interleave pages between documents</p>
            `;
            advancedGrid.appendChild(interleaveDiv);
        }
    }

    showCustomArrangementOptions() {
        // Show options for custom page arrangement
        const advancedGrid = document.querySelector('.advanced-grid');
        if (advancedGrid && !document.getElementById('custom-arrangement-options')) {
            const customDiv = document.createElement('div');
            customDiv.id = 'custom-arrangement-options';
            customDiv.className = 'advanced-option';
            customDiv.innerHTML = `
                <label class="advanced-label" for="page-arrangement">Page Arrangement</label>
                <textarea id="page-arrangement" class="advanced-textarea" placeholder="e.g., 1:1-3, 2:all, 3:5-8"></textarea>
                <p class="advanced-hint">Format: FileNumber:PageRange (e.g., 1:1-3 means file 1 pages 1-3)</p>
            `;
            advancedGrid.appendChild(customDiv);
        }
    }

    showCustomMetadataOptions() {
        // Show custom metadata input fields
        const advancedGrid = document.querySelector('.advanced-grid');
        if (advancedGrid && !document.getElementById('custom-metadata-options')) {
            const metadataDiv = document.createElement('div');
            metadataDiv.id = 'custom-metadata-options';
            metadataDiv.className = 'advanced-option custom-metadata';
            metadataDiv.innerHTML = `
                <div class="metadata-fields">
                    <div class="metadata-field">
                        <label class="advanced-label" for="custom-title">Document Title</label>
                        <input type="text" id="custom-title" class="advanced-input" placeholder="Enter title">
                    </div>
                    <div class="metadata-field">
                        <label class="advanced-label" for="custom-author">Author</label>
                        <input type="text" id="custom-author" class="advanced-input" placeholder="Enter author">
                    </div>
                    <div class="metadata-field">
                        <label class="advanced-label" for="custom-subject">Subject</label>
                        <input type="text" id="custom-subject" class="advanced-input" placeholder="Enter subject">
                    </div>
                </div>
            `;
            advancedGrid.appendChild(metadataDiv);
        }
    }

    hideExtraOptions() {
        // Remove dynamic options
        const interleaveOptions = document.getElementById('interleave-options');
        const customOptions = document.getElementById('custom-arrangement-options');
        
        if (interleaveOptions) interleaveOptions.remove();
        if (customOptions) customOptions.remove();
    }

    hideCustomMetadataOptions() {
        const customMetadata = document.getElementById('custom-metadata-options');
        if (customMetadata) customMetadata.remove();
    }

    setupNewSettingsListeners() {
        // Page orientation listener
        const pageOrientation = document.getElementById('page-orientation');
        if (pageOrientation) {
            pageOrientation.addEventListener('change', (e) => {
                console.log('Page orientation changed to:', e.target.value);
            });
        }

        // Color mode listener
        const colorMode = document.getElementById('color-mode');
        if (colorMode) {
            colorMode.addEventListener('change', (e) => {
                console.log('Color mode changed to:', e.target.value);
            });
        }

        // Page numbering listener
        const pageNumbering = document.getElementById('page-numbering');
        if (pageNumbering) {
            pageNumbering.addEventListener('change', (e) => {
                console.log('Page numbering changed to:', e.target.value);
                if (e.target.value === 'add-footer') {
                    this.showPageNumberingOptions();
                } else {
                    this.hidePageNumberingOptions();
                }
            });
        }

        // Security mode listener
        const securityMode = document.getElementById('security-mode');
        if (securityMode) {
            securityMode.addEventListener('change', (e) => {
                console.log('Security mode changed to:', e.target.value);
                if (e.target.value === 'password-protect') {
                    this.showPasswordOptions();
                } else {
                    this.hidePasswordOptions();
                }
            });
        }
    }

    showSplitMergeOptions() {
        const settingsCategories = document.querySelector('.settings-categories');
        if (settingsCategories && !document.getElementById('split-merge-options')) {
            const splitMergeDiv = document.createElement('div');
            splitMergeDiv.id = 'split-merge-options';
            splitMergeDiv.className = 'settings-category';
            splitMergeDiv.innerHTML = `
                <h4 class="category-title">Split & Merge Configuration</h4>
                <div class="settings-row">
                    <div class="setting-item">
                        <label class="setting-label" for="section-breaks">Section Breaks</label>
                        <div class="custom-select-wrapper">
                            <select id="section-breaks" class="premium-select">
                                <option value="auto">Auto-detect sections</option>
                                <option value="page-count">Every N pages</option>
                                <option value="bookmark">At bookmark levels</option>
                                <option value="manual">Manual specification</option>
                            </select>
                            <div class="select-icon">
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label" for="merge-order">Merge Order</label>
                        <div class="custom-select-wrapper">
                            <select id="merge-order" class="premium-select">
                                <option value="sequential">Sequential by file</option>
                                <option value="interleaved">Interleaved sections</option>
                                <option value="priority">Priority-based</option>
                            </select>
                            <div class="select-icon">
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            settingsCategories.appendChild(splitMergeDiv);
        }
    }

    showPageNumberingOptions() {
        const metadataCategory = document.querySelector('.settings-category:last-child .settings-row');
        if (metadataCategory && !document.getElementById('page-numbering-options')) {
            const numberingDiv = document.createElement('div');
            numberingDiv.id = 'page-numbering-options';
            numberingDiv.className = 'setting-item';
            numberingDiv.innerHTML = `
                <label class="setting-label" for="numbering-format">Number Format</label>
                <div class="custom-select-wrapper">
                    <select id="numbering-format" class="premium-select">
                        <option value="arabic">1, 2, 3...</option>
                        <option value="roman">i, ii, iii...</option>
                        <option value="alpha">a, b, c...</option>
                        <option value="custom">Page X of Y</option>
                    </select>
                    <div class="select-icon">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            `;
            metadataCategory.appendChild(numberingDiv);
        }
    }

    showPasswordOptions() {
        const metadataCategory = document.querySelector('.settings-category:last-child .settings-row');
        if (metadataCategory && !document.getElementById('password-options')) {
            const passwordDiv = document.createElement('div');
            passwordDiv.id = 'password-options';
            passwordDiv.className = 'setting-item';
            passwordDiv.innerHTML = `
                <label class="setting-label" for="pdf-password">Password</label>
                <input type="password" id="pdf-password" class="premium-input" placeholder="Enter password for PDF">
                <p class="setting-hint">Password will be required to open the merged PDF</p>
            `;
            metadataCategory.appendChild(passwordDiv);
        }
    }

    hidePageNumberingOptions() {
        const numberingOptions = document.getElementById('page-numbering-options');
        if (numberingOptions) numberingOptions.remove();
    }

    hidePasswordOptions() {
        const passwordOptions = document.getElementById('password-options');
        if (passwordOptions) passwordOptions.remove();
    }

    getMergeSettings() {
        // Collect all advanced settings
        return {
            mergeMode: document.getElementById('merge-mode')?.value || 'append',
            pageOrientation: document.getElementById('page-orientation')?.value || 'preserve',
            outputQuality: document.getElementById('output-quality')?.value || 'high',
            colorMode: document.getElementById('color-mode')?.value || 'preserve',
            bookmarkHandling: document.getElementById('bookmark-handling')?.value || 'preserve',
            pageNumbering: document.getElementById('page-numbering')?.value || 'none',
            metadataHandling: document.getElementById('metadata-handling')?.value || 'first',
            securityMode: document.getElementById('security-mode')?.value || 'none',
            interleavePattern: document.getElementById('interleave-pattern')?.value || '1-1',
            pageArrangement: document.getElementById('page-arrangement')?.value || '',
            sectionBreaks: document.getElementById('section-breaks')?.value || 'auto',
            mergeOrder: document.getElementById('merge-order')?.value || 'sequential',
            numberingFormat: document.getElementById('numbering-format')?.value || 'arabic',
            pdfPassword: document.getElementById('pdf-password')?.value || '',
            customTitle: document.getElementById('custom-title')?.value || '',
            customAuthor: document.getElementById('custom-author')?.value || '',
            customSubject: document.getElementById('custom-subject')?.value || ''
        };
    }

    applyMergeSettings(pdfDoc, settings) {
        // Apply the selected settings to the merged PDF
        console.log('Applying merge settings:', settings);
        
        // Apply metadata settings
        if (settings.metadataHandling === 'custom') {
            if (settings.customTitle) pdfDoc.setTitle(settings.customTitle);
            if (settings.customAuthor) pdfDoc.setAuthor(settings.customAuthor);
            if (settings.customSubject) pdfDoc.setSubject(settings.customSubject);
            pdfDoc.setCreator('FileFlow PDF Merge Tool');
            pdfDoc.setProducer('FileFlow');
        } else if (settings.metadataHandling === 'none') {
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setCreator('');
            pdfDoc.setProducer('');
        }
        
        return pdfDoc;
    }
}

// Initialize when page loads - multiple initialization methods for reliability
document.addEventListener('DOMContentLoaded', () => {
    console.log('PDF Merge Handler initializing...');
    window.pdfMergeHandler = new PDFMergeHandler();
});

// Backup initialization in case DOMContentLoaded has already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.pdfMergeHandler) {
            console.log('PDF Merge Handler backup initialization...');
            window.pdfMergeHandler = new PDFMergeHandler();
        }
    });
} else {
    // DOM is already loaded
    console.log('PDF Merge Handler immediate initialization...');
    window.pdfMergeHandler = new PDFMergeHandler();
}