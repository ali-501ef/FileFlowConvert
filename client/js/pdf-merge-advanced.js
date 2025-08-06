/**
 * PDF Merge Advanced Options Handler
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('PDF Merge advanced options initializing...');
    
    const optionsToggle = document.getElementById('optionsToggle');
    const optionsContent = document.getElementById('optionsContent');
    const chevron = optionsToggle?.querySelector('.chevron');
    
    console.log('Elements found:', {
        toggle: !!optionsToggle,
        content: !!optionsContent,
        chevron: !!chevron
    });
    
    if (optionsToggle && optionsContent) {
        // Ensure content starts hidden
        optionsContent.style.display = 'none';
        optionsContent.classList.remove('active');
        
        optionsToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isHidden = optionsContent.style.display === 'none';
            
            if (isHidden) {
                // Show content
                optionsContent.style.display = 'block';
                optionsContent.classList.add('active');
                optionsToggle.classList.add('active');
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
                console.log('Advanced options expanded');
            } else {
                // Hide content
                optionsContent.style.display = 'none';
                optionsContent.classList.remove('active');
                optionsToggle.classList.remove('active');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
                console.log('Advanced options collapsed');
            }
        });
        
        console.log('Advanced options toggle initialized successfully');
    } else {
        console.error('Could not initialize advanced options - elements not found');
    }
});