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
        // Find all possible advanced options elements
        const toggleSelectors = [
            '#advanced-toggle',
            '.advanced-toggle', 
            '.options-header',
            '#optionsToggle'
        ];

        const contentSelectors = [
            '#advanced-content',
            '.advanced-content',
            '.options-content',
            '#optionsContent'
        ];

        // Try to find toggle and content elements
        let advancedToggle = null;
        let advancedContent = null;

        for (const selector of toggleSelectors) {
            advancedToggle = document.querySelector(selector);
            if (advancedToggle) break;
        }

        for (const selector of contentSelectors) {
            advancedContent = document.querySelector(selector);
            if (advancedContent) break;
        }

        if (advancedToggle && advancedContent) {
            this.attachToggleListener(advancedToggle, advancedContent);
        }

        // Also setup for any existing advanced options sections
        document.querySelectorAll('.advanced-options').forEach(section => {
            const header = section.querySelector('.options-header') || section.querySelector('#optionsToggle');
            const content = section.querySelector('.options-content') || section.querySelector('#optionsContent');
            
            if (header && content) {
                this.attachToggleListener(header, content);
            }
        });
    }

    attachToggleListener(toggleElement, contentElement) {
        // Remove any existing listeners
        const newToggle = toggleElement.cloneNode(true);
        toggleElement.parentNode.replaceChild(newToggle, toggleElement);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isVisible = contentElement.style.display === 'block' || 
                             contentElement.style.display === 'flex' ||
                             !contentElement.style.display ||
                             contentElement.style.display === '';

            if (isVisible && contentElement.style.display !== 'none') {
                // Collapse
                contentElement.style.display = 'none';
                
                // Update chevron
                const chevron = newToggle.querySelector('.advanced-chevron') || 
                               newToggle.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            } else {
                // Expand
                contentElement.style.display = 'block';
                
                // Update chevron  
                const chevron = newToggle.querySelector('.advanced-chevron') || 
                               newToggle.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
            }
        });

        // Initially hide content
        contentElement.style.display = 'none';
    }
}

// Initialize advanced options handler
window.advancedOptionsHandler = new AdvancedOptionsHandler();