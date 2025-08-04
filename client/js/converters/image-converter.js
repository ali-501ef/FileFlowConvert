/**
 * JPG to PNG Converter
 * Uses HTML5 Canvas API for client-side image conversion
 */

class ImageConverter extends FileHandler {
    constructor() {
        super();
    }

    /**
     * Convert JPG files to PNG format
     */
    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('Please select JPG files to convert.');
            return;
        }

        // Filter for JPG files only
        const jpgFiles = this.selectedFiles.filter(file => 
            file.type === 'image/jpeg' || 
            file.name.toLowerCase().match(/\.(jpg|jpeg)$/i)
        );

        if (jpgFiles.length === 0) {
            alert('Please select valid JPG files.');
            return;
        }

        this.showProgress(() => {
            this.processConversion(jpgFiles);
        }, 'Converting JPG to PNG...');
    }

    /**
     * Process JPG to PNG conversion
     * @param {Array} jpgFiles - Array of JPG files
     */
    async processConversion(jpgFiles) {
        const results = [];

        try {
            for (let i = 0; i < jpgFiles.length; i++) {
                const file = jpgFiles[i];
                
                try {
                    const convertedBlob = await this.convertJpgToPng(file);
                    
                    // Generate output filename
                    const outputFilename = file.name.replace(/\.(jpg|jpeg)$/i, '.png');
                    
                    results.push({
                        filename: outputFilename,
                        blob: convertedBlob
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
            alert('Conversion failed. Please try again or check that your files are valid JPG images.');
            
            // Reset interface on error
            this.resetInterface();
            this.showActionButtons();
        }
    }

    /**
     * Convert a single JPG file to PNG using Canvas API
     * @param {File} file - JPG file to convert
     * @returns {Promise<Blob>} PNG blob
     */
    convertJpgToPng(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Create canvas element
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions to match image
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert canvas to PNG blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create PNG blob'));
                        }
                    }, 'image/png', 1.0); // Maximum quality
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            // Load the image
            img.src = URL.createObjectURL(file);
        });
    }
}

// Initialize image converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('file-input') && window.location.pathname.includes('jpg-to-png')) {
        window.fileHandler = new ImageConverter();
    }
});
