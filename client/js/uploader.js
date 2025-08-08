/**
 * FileFlow Unified Upload Component Binder
 * Single canonical system for .ff-upload components
 */

window.ffBindUploaders = function bind(root = document) {
    root.querySelectorAll('.ff-upload').forEach((wrap) => {
        const dz = wrap.querySelector('.ff-dropzone');
        const btn = wrap.querySelector('.ff-choose-btn');
        const input = wrap.querySelector('.ff-file-input');
        const pageId = wrap.dataset.pageId;

        if (!dz || !btn || !input || !pageId) {
            console.warn('[ffUploader] Missing required elements for', pageId, {
                dropzone: !!dz,
                button: !!btn, 
                input: !!input,
                pageId: !!pageId
            });
            return;
        }

        // Reset previous listeners to avoid double-open
        const newDz = dz.cloneNode(true);
        const newBtn = btn.cloneNode(true);
        const newInput = input.cloneNode(true);
        
        dz.replaceWith(newDz);
        btn.replaceWith(newBtn);
        input.replaceWith(newInput);

        // Get fresh references after replacement
        const dz2 = wrap.querySelector('.ff-dropzone');
        const btn2 = wrap.querySelector('.ff-choose-btn');
        const input2 = wrap.querySelector('.ff-file-input');

        const openPicker = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Must be synchronous user gesture for Safari/iOS
            input2.click();
        };

        // Click anywhere on the big box
        dz2.addEventListener('click', openPicker);
        dz2.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                openPicker(e);
            }
        });

        // Small button (redundant but explicit)
        btn2.addEventListener('click', openPicker);

        // Drag & drop (keep existing visuals)
        dz2.addEventListener('dragover', (e) => {
            e.preventDefault();
            dz2.classList.add('is-drag');
        });
        
        dz2.addEventListener('dragleave', (e) => {
            // Only remove if we're leaving the dropzone entirely
            if (!dz2.contains(e.relatedTarget)) {
                dz2.classList.remove('is-drag');
            }
        });
        
        dz2.addEventListener('drop', (e) => {
            e.preventDefault();
            dz2.classList.remove('is-drag');
            
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length && window.ffUpload) {
                window.ffUpload(pageId, files);
            }
        });

        // File selection
        input2.addEventListener('change', () => {
            const files = Array.from(input2.files || []);
            if (files.length && window.ffUpload) {
                window.ffUpload(pageId, files);
                
                // Reset input for potential re-selection of same file
                input2.value = '';
            }
        });

        console.log('[ffUploader] Bound upload component for', pageId);
    });
};

// Auto-bind on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.ffBindUploaders(document);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ffBindUploaders: window.ffBindUploaders };
}