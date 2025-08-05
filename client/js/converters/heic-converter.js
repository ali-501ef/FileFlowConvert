/**
 * HEIC to JPG Converter
 * Uses heic2any library for client-side HEIC conversion
 */

class HEICConverter extends FileHandler {
    constructor() {
        super();
    }

    /**
     * Convert HEIC files to JPG format
     */
    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('Please select HEIC files to convert.');
            return;
        }

        // Filter for HEIC files only
        const heicFiles = this.selectedFiles.filter(file => 
            file.name.toLowerCase().endsWith('.heic') || 
            file.type === 'image/heic'
        );

        if (heicFiles.length === 0) {
            alert('Please select valid HEIC files.');
            return;
        }

        // Check if heic2any library is loaded
        if (typeof heic2any === 'undefined') {
            alert('HEIC conversion library not loaded. Please refresh the page and try again.');
            return;
        }

        this.showProgress(() => {
            this.processConversion(heicFiles);
        }, 'Converting HEIC to JPG...');
    }

    /**
     * Process HEIC conversion
     * @param {Array} heicFiles - Array of HEIC files
     */
    async processConversion(heicFiles) {
        const results = [];

        try {
            for (let i = 0; i < heicFiles.length; i++) {
                const file = heicFiles[i];
                
                try {
                    // Convert HEIC to JPG using heic2any
                    const convertedBlob = await heic2any({
                        blob: file,
                        toType: "image/jpeg",
                        quality: 0.92 // High quality conversion
                    });

                    // Handle array result (heic2any sometimes returns array)
                    const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                    // Generate output filename
                    const outputFilename = file.name.replace(/\.(heic|HEIF|heif)$/i, '.jpg');
                    
                    results.push({
                        filename: outputFilename,
                        blob: finalBlob
                    });

                } catch (error) {
                    console.error(`Error converting ${file.name}:`, error);
                    
                    // Create error blob for failed conversion
                    const errorText = `Failed to convert ${file.name}: ${error.message}`;
                    const errorBlob = new Blob([errorText], { type: 'text/plain' });
                    
                    results.push({
                        filename: `ERROR_${file.name}.txt`,
                        blob: errorBlob
                    });
                }
            }

            // Show download results
            this.showDownloadResults(results);

        } catch (error) {
            console.error('Conversion process failed:', error);
            alert('Conversion failed. Please try again or check that your files are valid HEIC images.');
            
            // Reset interface on error
            this.resetInterface();
            this.showActionButtons();
        }
    }
}

// Initialize HEIC converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('heic-to-jpg')) {
        window.fileHandler = new HEICConverter();
    }
});
