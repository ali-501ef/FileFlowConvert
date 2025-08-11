/**
 * HEIC to JPG Converter
 * Uses heic2any library for client-side HEIC conversion
 */

import { autoDownloadFromBlob } from '../utils/autoDownload.js';

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
                    // Try multiple conversion approaches for better compatibility
                    let convertedBlob;
                    
                    try {
                        // First attempt with high quality
                        convertedBlob = await heic2any({
                            blob: file,
                            toType: "image/jpeg",
                            quality: 0.92
                        });
                    } catch (highQualityError) {
                        console.log(`High quality conversion failed for ${file.name}, trying medium quality:`, highQualityError);
                        
                        try {
                            // Second attempt with medium quality
                            convertedBlob = await heic2any({
                                blob: file,
                                toType: "image/jpeg",
                                quality: 0.8
                            });
                        } catch (mediumQualityError) {
                            console.log(`Medium quality conversion failed for ${file.name}, trying basic conversion:`, mediumQualityError);
                            
                            // Third attempt with basic settings
                            convertedBlob = await heic2any({
                                blob: file,
                                toType: "image/jpeg"
                            });
                        }
                    }

                    // Handle array result (heic2any sometimes returns array)
                    const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                    // Validate the result
                    if (!finalBlob || finalBlob.size === 0) {
                        throw new Error('Conversion resulted in empty file');
                    }

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

            // Auto-download results instead of showing download links
            this.autoDownloadResults(results);

        } catch (error) {
            console.error('Conversion process failed:', error);
            alert('Conversion failed. Please try again or check that your files are valid HEIC images.');
            
            // Reset interface on error
            this.resetInterface();
            this.showActionButtons();
        }
    }

    /**
     * Auto-download converted files instead of showing download links
     * @param {Array} results - Array of converted file results
     */
    async autoDownloadResults(results) {
        // Hide progress
        this.hideProgress();
        
        // Show completion message
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        try {
            // Auto-download each converted file
            for (const result of results) {
                if (result.blob && result.filename) {
                    // Generate filename with timestamp for uniqueness
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                    const baseFilename = result.filename.replace(/\.(jpg|jpeg)$/i, '');
                    const finalFilename = `${baseFilename}_${timestamp}.jpg`;
                    
                    await autoDownloadFromBlob(result.blob, finalFilename);
                    
                    // Small delay between downloads to prevent browser issues
                    if (results.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }
            
            console.log(`✅ Auto-downloaded ${results.length} converted file(s)`);
            
        } catch (error) {
            console.error('Auto-download failed:', error);
            // Fallback to showing download links if auto-download fails
            this.showDownloadResults(results);
        }
    }
}

// Initialize HEIC converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('heic-to-jpg')) {
        window.fileHandler = new HEICConverter();
    }
});
