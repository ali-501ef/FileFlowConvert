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
                        <button class="mobile-nav-section-toggle" data-testid="mobile-nav-toggle-image" data-section="image">
                            <div class="section-toggle-content">
                                <div class="section-icon">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21,15 16,10 5,21"/>
                                    </svg>
                                </div>
                                <span class="mobile-nav-section-title">Image Tools</span>
                                <div class="section-chevron">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <polyline points="6,9 12,15 18,9"/>
                                    </svg>
                                </div>
                            </div>
                        </button>
                        <div class="mobile-nav-items" data-section-content="image">
                            <a href="/image-tools/heic-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-heic-jpg">
                                <span class="item-text">HEIC to JPG</span>
                                <span class="item-badge popular">Popular</span>
                            </a>
                            <a href="/jpg-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-jpg-png">
                                <span class="item-text">JPG to PNG</span>
                            </a>
                            <a href="/pdf-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-to-jpg">
                                <span class="item-text">PDF to JPG</span>
                            </a>
                            <a href="/image-tools/png-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-png-jpg">
                                <span class="item-text">PNG to JPG</span>
                            </a>
                            <a href="/image-tools/webp-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-webp-jpg">
                                <span class="item-text">WEBP to JPG</span>
                            </a>
                            <a href="/image-tools/jpg-to-pdf.html" class="mobile-nav-item" data-testid="mobile-nav-jpg-pdf">
                                <span class="item-text">JPG to PDF</span>
                            </a>
                            <a href="/image-tools/tiff-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-tiff-png">
                                <span class="item-text">TIFF to PNG</span>
                            </a>
                            <a href="/image-tools/bmp-to-jpg.html" class="mobile-nav-item" data-testid="mobile-nav-bmp-jpg">
                                <span class="item-text">BMP to JPG</span>
                            </a>
                            <a href="/image-tools/svg-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-svg-png">
                                <span class="item-text">SVG to PNG</span>
                            </a>
                            <a href="/image-tools/ico-to-png.html" class="mobile-nav-item" data-testid="mobile-nav-ico-png">
                                <span class="item-text">ICO to PNG</span>
                            </a>
                            <a href="/image-tools/gif-to-mp4.html" class="mobile-nav-item" data-testid="mobile-nav-gif-mp4">
                                <span class="item-text">GIF to MP4</span>
                            </a>
                        </div>
                    </div>
                    
                    <div class="mobile-nav-section">
                        <button class="mobile-nav-section-toggle" data-testid="mobile-nav-toggle-pdf" data-section="pdf">
                            <div class="section-toggle-content">
                                <div class="section-icon">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <polyline points="10 9 9 9 8 9"/>
                                    </svg>
                                </div>
                                <span class="mobile-nav-section-title">PDF Tools</span>
                                <div class="section-chevron">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <polyline points="6,9 12,15 18,9"/>
                                    </svg>
                                </div>
                            </div>
                        </button>
                        <div class="mobile-nav-items" data-section-content="pdf">
                            <a href="/pdf-merge.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-merge">
                                <span class="item-text">PDF Merge</span>
                            </a>
                            <a href="/pdf-split.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-split">
                                <span class="item-text">PDF Split</span>
                            </a>
                            <a href="/pdf-compress.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-compress">
                                <span class="item-text">PDF Compress</span>
                                <span class="item-badge popular">Popular</span>
                            </a>
                            <a href="/pdf-rotate.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-rotate">
                                <span class="item-text">PDF Rotate</span>
                            </a>
                            <a href="/pdf-watermark.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-watermark">
                                <span class="item-text">PDF Watermark</span>
                            </a>
                            <a href="/pdf-to-word.html" class="mobile-nav-item" data-testid="mobile-nav-pdf-to-word">
                                <span class="item-text">PDF to Word</span>
                            </a>
                        </div>
                    </div>
                    
                    <div class="mobile-nav-section">
                        <button class="mobile-nav-section-toggle" data-testid="mobile-nav-toggle-media" data-section="media">
                            <div class="section-toggle-content">
                                <div class="section-icon">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <polygon points="23 7 16 12 23 17 23 7"/>
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                    </svg>
                                </div>
                                <span class="mobile-nav-section-title">Audio/Video Tools</span>
                                <div class="section-chevron">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <polyline points="6,9 12,15 18,9"/>
                                    </svg>
                                </div>
                            </div>
                        </button>
                        <div class="mobile-nav-items" data-section-content="media">
                            <a href="/mp4-to-mp3.html" class="mobile-nav-item" data-testid="mobile-nav-mp4-mp3">
                                <span class="item-text">MP4 to MP3</span>
                                <span class="item-badge popular">Popular</span>
                            </a>
                            <a href="/audio-converter.html" class="mobile-nav-item" data-testid="mobile-nav-audio-convert">
                                <span class="item-text">Audio Converter</span>
                            </a>
                            <a href="/video-compress.html" class="mobile-nav-item" data-testid="mobile-nav-video-compress">
                                <span class="item-text">Video Compress</span>
                            </a>
                            <a href="/gif-maker.html" class="mobile-nav-item" data-testid="mobile-nav-gif-maker">
                                <span class="item-text">GIF Maker</span>
                            </a>
                            <a href="/video-trim.html" class="mobile-nav-item" data-testid="mobile-nav-video-trim">
                                <span class="item-text">Video Trim</span>
                            </a>
                            <a href="/video-merger.html" class="mobile-nav-item" data-testid="mobile-nav-video-merge">
                                <span class="item-text">Video Merger</span>
                            </a>
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
        
        // Add toggle functionality for sections
        const sectionToggles = document.querySelectorAll('.mobile-nav-section-toggle');
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const section = this.getAttribute('data-section');
                const sectionContent = document.querySelector(`[data-section-content="${section}"]`);
                const chevron = this.querySelector('.section-chevron svg');
                const parentSection = this.closest('.mobile-nav-section');
                
                if (sectionContent && chevron && parentSection) {
                    const isExpanded = parentSection.classList.contains('section-expanded');
                    
                    if (isExpanded) {
                        // Collapse section
                        parentSection.classList.remove('section-expanded');
                        sectionContent.style.maxHeight = '0';
                        chevron.style.transform = 'rotate(0deg)';
                    } else {
                        // Expand section
                        parentSection.classList.add('section-expanded');
                        sectionContent.style.maxHeight = sectionContent.scrollHeight + 'px';
                        chevron.style.transform = 'rotate(180deg)';
                    }
                }
            });
        });
        
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