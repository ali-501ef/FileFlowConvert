// Navigation functionality for dropdown menus
document.addEventListener('DOMContentLoaded', function() {
    // Handle dropdown menus
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.nav-dropdown-trigger');
        const content = dropdown.querySelector('.nav-dropdown-content');
        
        if (trigger && content) {
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Close other dropdowns
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.classList.remove('open');
                    }
                });
                
                // Toggle current dropdown
                dropdown.classList.toggle('open');
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        }
    });
    
    // Close dropdowns on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        }
    });
    
    // Handle mobile navigation
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav-overlay');
    const body = document.body;
    
    // Create mobile navigation overlay if it doesn't exist
    if (mobileToggle && !mobileNav) {
        createMobileNavigation();
    }
    
    function createMobileNavigation() {
        // Create mobile navigation overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        overlay.innerHTML = `
            <div class="mobile-nav-content">
                <div class="mobile-nav-header">
                    <span class="mobile-nav-title">Menu</span>
                    <button class="mobile-nav-close" data-testid="mobile-nav-close">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="mobile-nav-sections">
                    <div class="mobile-nav-section">
                        <h3 class="mobile-nav-section-title">Image Tools</h3>
                        <div class="mobile-nav-items">
                            <a href="/image-tools/heic-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-heic-jpg">HEIC to JPG</a>
                            <a href="/jpg-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-jpg-png">JPG to PNG</a>
                            <a href="/pdf-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-to-jpg">PDF to JPG</a>
                            <a href="/image-tools/png-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-png-jpg">PNG to JPG</a>
                            <a href="/image-tools/webp-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-webp-jpg">WEBP to JPG</a>
                            <a href="/image-tools/jpg-to-pdf.html" class="mobile-nav-item" data-testid="mobile-nav-jpg-pdf">JPG to PDF</a>
                            <a href="/image-tools/tiff-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-tiff-png">TIFF to PNG</a>
                            <a href="/image-tools/bmp-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-bmp-jpg">BMP to JPG</a>
                            <a href="/image-tools/svg-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-svg-png">SVG to PNG</a>
                            <a href="/image-tools/ico-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-ico-png">ICO to PNG</a>
                            <a href="/image-tools/gif-to-mp4.html" class="mobile-nav-item" data-testid="mobile-nav-gif-mp4">GIF to MP4</a>
                        </div>
                    </div>
                    
                    <div class="mobile-nav-section">
                        <h3 class="mobile-nav-section-title">PDF Tools</h3>
                        <div class="mobile-nav-items">
                            <a href="/pdf-merge.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-merge">PDF Merge</a>
                            <a href="/pdf-split.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-split">PDF Split</a>
                            <a href="/pdf-compress.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-compress">PDF Compress</a>
                            <a href="/pdf-rotate.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-rotate">PDF Rotate</a>
                            <a href="/pdf-watermark.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-watermark">PDF Watermark</a>
                            <a href="/pdf-to-word.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-to-word">PDF to Word</a>
                        </div>
                    </div>
                    
                    <div class="mobile-nav-section">
                        <h3 class="mobile-nav-section-title">Audio/Video Tools</h3>
                        <div class="mobile-nav-items">
                            <a href="/mp4-to-mp3.html" class="mobile-nav-item" data-testid="mobile-nav-mp4-mp3">MP4 to MP3</a>
                            <a href="/audio-converter.html" class="mobile-nav-item" data-testid="mobile-nav-audio-convert">Audio Converter</a>
                            <a href="/video-compress.html" class="mobile-nav-item" data-testid="mobile-nav-video-compress">Video Compress</a>
                            <a href="/gif-maker.html" class="mobile-nav-item" data-testid="mobile-nav-gif-maker">GIF Maker</a>
                            <a href="/video-trim.html" class="mobile-nav-item" data-testid="mobile-nav-video-trim">Video Trim</a>
                            <a href="/video-merger.html" class="mobile-nav-item" data-testid="mobile-nav-video-merge">Video Merger</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listeners for mobile navigation
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        const mobileClose = document.querySelector('.mobile-nav-close');
        const mobileOverlay = document.querySelector('.mobile-nav-overlay');
        
        if (mobileToggle) {
            mobileToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleMobileNav(true);
            });
        }
        
        if (mobileClose) {
            mobileClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleMobileNav(false);
            });
        }
        
        // Close mobile nav when clicking on overlay
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', function(e) {
                if (e.target === mobileOverlay) {
                    toggleMobileNav(false);
                }
            });
        }
        
        // Close mobile nav when clicking on links
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            item.addEventListener('click', function() {
                toggleMobileNav(false);
            });
        });
        
        // Handle keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                toggleMobileNav(false);
            }
        });
    }
    
    function toggleMobileNav(show) {
        const mobileOverlay = document.querySelector('.mobile-nav-overlay');
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        
        if (show) {
            mobileOverlay.classList.add('mobile-nav-open');
            body.classList.add('mobile-nav-active');
            mobileToggle.classList.add('mobile-nav-toggle-active');
            // Prevent background scrolling
            body.style.overflow = 'hidden';
        } else {
            mobileOverlay.classList.remove('mobile-nav-open');
            body.classList.remove('mobile-nav-active');
            mobileToggle.classList.remove('mobile-nav-toggle-active');
            // Restore background scrolling
            body.style.overflow = '';
        }
    }
});