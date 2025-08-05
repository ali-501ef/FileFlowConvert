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
            const mergedPdf = await PDFLib.PDFDocument.create();

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
            new Sortable(fileCards, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
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
        const fileCards = document.querySelectorAll('.file-card');
        const newOrder = [];
        
        fileCards.forEach(card => {
            const index = parseInt(card.dataset.index);
            if (this.selectedFiles[index]) {
                newOrder.push(this.selectedFiles[index]);
            }
        });
        
        this.selectedFiles = newOrder;
    }
}

// Initialize PDF converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('pdf-merge')) {
        window.fileHandler = new PDFConverter();
    }
});
