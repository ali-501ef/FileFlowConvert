/**
 * Advanced Options Handler
 * Manages the toggle functionality for advanced options across all tools
 */

class AdvancedOptionsHandler {
    constructor() {
        this.initializeToggle();
    }

    initializeToggle() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggle());
        } else {
            this.setupToggle();
        }
    }

    setupToggle() {
        // Find advanced options elements
        const advancedToggle = document.getElementById('advanced-toggle') || 
                              document.querySelector('.advanced-toggle') ||
                              document.querySelector('.options-header');
        
        const advancedContent = document.getElementById('advanced-content') || 
                               document.querySelector('.advanced-content') ||
                               document.querySelector('.options-content');
        
        const advancedSection = document.getElementById('advanced-options-section') ||
                               document.querySelector('.advanced-options-section') ||
                               document.querySelector('.advanced-options');

        if (advancedToggle && advancedContent) {
            this.attachToggleListener(advancedToggle, advancedContent, advancedSection);
        }

        // Also setup for any existing advanced options
        document.querySelectorAll('.advanced-options').forEach(section => {
            const header = section.querySelector('.options-header');
            const content = section.querySelector('.options-content');
            
            if (header && content) {
                this.attachToggleListener(header, content, section);
            }
        });
    }

    attachToggleListener(toggleElement, contentElement, sectionElement) {
        toggleElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isExpanded = contentElement.style.display === 'block' || 
                              contentElement.style.display === 'flex' ||
                              sectionElement?.classList.contains('expanded');

            if (isExpanded) {
                // Collapse
                contentElement.style.display = 'none';
                sectionElement?.classList.remove('expanded');
                
                // Update chevron
                const chevron = toggleElement.querySelector('.advanced-chevron') || 
                               toggleElement.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            } else {
                // Expand
                contentElement.style.display = contentElement.classList.contains('advanced-grid') ? 'block' : 'flex';
                sectionElement?.classList.add('expanded');
                
                // Update chevron
                const chevron = toggleElement.querySelector('.advanced-chevron') || 
                               toggleElement.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
            }
        });

        // Set initial state - make options available before file upload
        if (sectionElement && !sectionElement.classList.contains('hidden')) {
            sectionElement.style.display = 'block';
        }
    }
}

// Initialize advanced options handler
window.advancedOptionsHandler = new AdvancedOptionsHandler();