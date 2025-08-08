/**
 * FileFlow Upload Dispatch System
 * Maps page IDs to their respective upload handlers
 */

// Global converter instance registry
window.ffConverterRegistry = {
    instances: new Map(),
    
    register(pageId, instance) {
        this.instances.set(pageId, instance);
        console.log('[ffDispatch] Registered converter for', pageId);
    },
    
    get(pageId) {
        return this.instances.get(pageId);
    }
};

// Main upload dispatch function
window.ffUpload = async function dispatch(pageId, files) {
    console.log('[ffDispatch] Upload triggered for', pageId, 'with', files.length, 'files');
    
    // Try to get converter instance from registry first
    let converter = window.ffConverterRegistry.get(pageId);
    
    // If not in registry, try to find by global variables or DOM
    if (!converter) {
        converter = findConverterByPageId(pageId);
        if (converter) {
            window.ffConverterRegistry.register(pageId, converter);
        }
    }
    
    if (!converter || !converter.handleFile) {
        console.error('[ffDispatch] No converter found for', pageId);
        return;
    }
    
    try {
        // Handle single file vs multiple files based on converter expectations
        if (files.length === 1) {
            await converter.handleFile(files[0]);
        } else {
            // Some converters might handle multiple files
            if (converter.handleFiles) {
                await converter.handleFiles(files);
            } else {
                // Default to handling first file only
                await converter.handleFile(files[0]);
            }
        }
    } catch (error) {
        console.error('[ffDispatch] Upload failed for', pageId, error);
        
        // Show user-friendly error
        const errorMessage = error.message || 'File upload failed. Please try again.';
        if (typeof window.showError === 'function') {
            window.showError(errorMessage);
        } else {
            alert(errorMessage);
        }
    }
};

// Helper function to find converter instances
function findConverterByPageId(pageId) {
    // Map of page IDs to potential global variable names or finder functions
    const converterFinders = {
        'pdf-split': () => findConverterByClass('PDFSplitter'),
        'pdf-compress': () => findConverterByClass('PDFCompressor'),  
        'pdf-rotate': () => findConverterByClass('PDFRotator'),
        'pdf-watermark': () => findConverterByClass('PDFWatermark'),
        'pdf-to-word': () => findConverterByClass('PDFToWordConverter'),
        'mp4-to-mp3': () => window.mp4ToMp3Converter || findConverterByClass('Mp4ToMp3Converter'),
        'audio-converter': () => findConverterByClass('AudioConverter'),
        'video-compress': () => findConverterByClass('VideoCompressor'),
        'gif-maker': () => findConverterByClass('GifMaker'),
        'video-trim': () => findConverterByClass('VideoTrimmer'),
        'video-merger': () => findConverterByClass('VideoMerger')
    };
    
    const finder = converterFinders[pageId];
    if (finder) {
        return finder();
    }
    
    return null;
}

// Helper to find converter instance by class name in global scope
function findConverterByClass(className) {
    // Check common global variable patterns
    const commonNames = [
        className.toLowerCase(),
        className.replace(/([A-Z])/g, (match, p1, offset) => offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase()),
        className + 'Instance',
        'current' + className
    ];
    
    for (const name of commonNames) {
        if (window[name] && typeof window[name].handleFile === 'function') {
            return window[name];
        }
    }
    
    // Look for instances attached to DOM elements (fallback)
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea && uploadArea._converterInstance) {
        return uploadArea._converterInstance;
    }
    
    return null;
}

// Auto-register converters that expose themselves globally
document.addEventListener('DOMContentLoaded', () => {
    // Give converters time to initialize
    setTimeout(() => {
        // Auto-detect and register any available converters
        const pageId = document.body.dataset.pageId || 
                      document.querySelector('.ff-upload')?.dataset.pageId;
        
        if (pageId) {
            const converter = findConverterByPageId(pageId);
            if (converter) {
                window.ffConverterRegistry.register(pageId, converter);
            }
        }
    }, 100);
});