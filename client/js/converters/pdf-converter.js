/**
 * PDF Merge Tool
 * Uses pdf-lib library for client-side PDF merging
 */

class PDFConverter extends FileHandler {
    constructor() {
        super();
    }

    /**
     * Merge PDF files into a single document
     */
    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('Please select PDF files to merge.');
            return;
        }

        if (this.selectedFiles.length < 2) {
            alert('Please select at least 2 PDF files to merge.');
            return;
        }

        // Filter for PDF files only
        const pdfFiles = this.selectedFiles.filter(file => 
            file.type === 'application/pdf' || 
            file.name.toLowerCase().endsWith('.pdf')
        );

        if (pdfFiles.length === 0) {
            alert('Please select valid PDF files.');
            return;
        }

        if (pdfFiles.length < 2) {
            alert('Please select at least 2 valid PDF files to merge.');
            return;
        }

        // Check if pdf-lib is loaded
        if (typeof PDFLib === 'undefined') {
            alert('PDF library not loaded. Please refresh the page and try again.');
            return;
        }

        this.showProgress(() => {
            this.processMerge(pdfFiles);
        }, 'Merging PDF files...');
    }

    /**
     * Process PDF merging using the order from the file cards
     */
    async processMerge() {
        try {
            // Get files in the order they appear in the UI
            const fileCards = document.querySelectorAll('.file-card');
            const orderedFiles = [];
            
            fileCards.forEach(card => {
                const index = parseInt(card.dataset.index);
                if (this.selectedFiles[index]) {
                    orderedFiles.push(this.selectedFiles[index]);
                }
            });

            // Use original order if no cards found
            const filesToMerge = orderedFiles.length > 0 ? orderedFiles : this.selectedFiles;
            
            // Create a new PDF document
            let mergedPdf = await PDFLib.PDFDocument.create();

            // Process each PDF file
            for (let i = 0; i < filesToMerge.length; i++) {
                const file = filesToMerge[i];
                
                try {
                    // Read the PDF file
                    const pdfBytes = await file.arrayBuffer();
                    const pdf = await PDFLib.PDFDocument.load(pdfBytes);
                    
                    // Get all page indices
                    const pageCount = pdf.getPageCount();
                    const pageIndices = Array.from({length: pageCount}, (_, i) => i);
                    
                    // Copy pages to merged PDF
                    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
                    
                    // Add copied pages to merged PDF
                    copiedPages.forEach((page) => {
                        mergedPdf.addPage(page);
                    });

                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    throw new Error(`Failed to process ${file.name}: ${error.message}`);
                }
            }

            // Apply advanced settings before saving
            this.applyAdvancedSettings(mergedPdf);
            
            // Generate the merged PDF
            const mergedPdfBytes = await mergedPdf.save();
            const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            
            // Generate output filename
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
            const outputFilename = `merged_document_${timestamp}.pdf`;
            
            // Show download results
            this.showDownloadResults([{
                filename: outputFilename,
                blob: mergedBlob
            }]);

        } catch (error) {
            console.error('PDF merge failed:', error);
            alert(`PDF merge failed: ${error.message}`);
            
            // Reset interface on error
            this.resetInterface();
            this.showActionButtons();
        }
    }

    /**
     * Override displayFileList to enable drag and drop reordering
     */
    displayFileList() {
        super.displayFileList();
        
        // Initialize sortable after file cards are created
        this.initializeSortable();
    }

    /**
     * Initialize drag and drop functionality for file reordering
     */
    initializeSortable() {
        const fileCards = document.getElementById('file-cards');
        if (fileCards && typeof Sortable !== 'undefined') {
            // Destroy existing sortable if it exists
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
            }
            
            this.sortableInstance = new Sortable(fileCards, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                forceFallback: false,
                fallbackTolerance: 3,
                onEnd: (evt) => {
                    // Update file order after drag
                    this.updateFileOrder();
                }
            });
        }
    }

    /**
     * Update file order based on current DOM order
     */
    updateFileOrder() {
        const fileCards = document.querySelectorAll('#file-cards .file-card');
        const newOrder = [];
        
        fileCards.forEach((card, newIndex) => {
            const originalIndex = parseInt(card.dataset.index);
            if (this.selectedFiles[originalIndex]) {
                newOrder.push(this.selectedFiles[originalIndex]);
                // Update the data-index to reflect new position
                card.dataset.index = newIndex;
            }
        });
        
        // Only update if we have valid files
        if (newOrder.length > 0) {
            this.selectedFiles = newOrder;
            console.log('File order updated:', this.selectedFiles.map(f => f.name));
        }
    }

    /**
     * Apply advanced merge settings
     */
    applyAdvancedSettings(mergedPdf) {
        // Get the merge handler if available
        if (window.pdfMergeHandler) {
            const settings = window.pdfMergeHandler.getMergeSettings();
            window.pdfMergeHandler.applyMergeSettings(mergedPdf, settings);
            return;
        }
        
        // Fallback to basic settings
        const mergeMode = document.getElementById('merge-mode')?.value || 'append';
        const outputQuality = document.getElementById('output-quality')?.value || 'high';
        const bookmarkHandling = document.getElementById('bookmark-handling')?.value || 'preserve';
        const metadataHandling = document.getElementById('metadata-handling')?.value || 'first';
        
        // Apply basic metadata handling
        if (metadataHandling === 'none') {
            mergedPdf.setTitle('');
            mergedPdf.setAuthor('');
            mergedPdf.setSubject('');
            mergedPdf.setCreator('');
            mergedPdf.setProducer('');
        } else if (metadataHandling === 'first') {
            mergedPdf.setCreator('FileFlow PDF Merge Tool');
            mergedPdf.setProducer('FileFlow');
        }
        
        console.log('Applied advanced settings:', {
            mergeMode,
            outputQuality,
            bookmarkHandling,
            metadataHandling
        });
    }
}

// Initialize PDF converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('pdf-merge')) {
        window.fileHandler = new PDFConverter();
    }
});
