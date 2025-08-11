/**
 * Server-Side File Converter Integration
 * Connects frontend to Python FastAPI backend for robust file conversion
 */

class ServerFileConverter {
    constructor() {
        this.dropZone = document.getElementById('universal-drop-zone');
        this.fileInput = document.getElementById('universal-file-input');
        this.chooseFileBtn = document.getElementById('choose-file-btn');
        this.outputFormatSelect = document.getElementById('output-format');
        this.convertBtn = document.getElementById('convert-now-btn');
        
        this.selectedFile = null;
        this.uploadedFileData = null;
        this.serverUrl = window.location.origin; // Use same origin for API calls
        this.isConverting = false; // Flag to prevent duplicate conversions
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Re-query elements in case they were recreated
        this.chooseFileBtn = document.getElementById('choose-file-btn');
        
        if (!this.dropZone || !this.fileInput || !this.chooseFileBtn || !this.convertBtn) {
            console.error('Required elements not found for server converter');
            return;
        }
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });
        
        // Choose file button - only trigger from the actual button
        this.chooseFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });
        
        // Drop zone click - only for areas that are NOT the button
        this.dropZone.addEventListener('click', (e) => {
            // Don't trigger if the click is on the button or its children
            if (e.target === this.chooseFileBtn || this.chooseFileBtn.contains(e.target)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });
        
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });
        
        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
        });
        
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelection(e.dataTransfer.files[0]);
            }
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', () => {
            this.handleConvert();
        });
    }
    
    async handleFileSelection(file) {
        console.log('File selected:', file.name, file.type, file.size);
        
        // Prevent duplicate processing of the same file
        if (this.selectedFile && 
            this.selectedFile.name === file.name && 
            this.selectedFile.size === file.size && 
            this.selectedFile.lastModified === file.lastModified) {
            console.log('Same file already selected, skipping duplicate upload');
            return;
        }
        
        this.selectedFile = file;
        this.uploadedFileData = null;
        
        // Update UI to show selected file
        this.updateFileDisplay(file);
        
        // Upload file to server for analysis
        await this.uploadFileToServer(file);
    }
    
    updateFileDisplay(file) {
        // Update drop zone to show selected file
        const fileName = file.name;
        const fileSize = this.formatFileSize(file.size);
        
        // Create elements safely to prevent XSS
        const fileSelectedDiv = document.createElement('div');
        fileSelectedDiv.className = 'file-selected';
        
        const fileIconDiv = document.createElement('div');
        fileIconDiv.className = 'file-icon';
        fileIconDiv.textContent = '📄';
        
        const fileInfoDiv = document.createElement('div');
        fileInfoDiv.className = 'file-info';
        
        const fileNameDiv = document.createElement('div');
        fileNameDiv.className = 'file-name';
        fileNameDiv.textContent = fileName; // Safe: uses textContent instead of innerHTML
        
        const fileSizeDiv = document.createElement('div');
        fileSizeDiv.className = 'file-size';
        fileSizeDiv.textContent = fileSize;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-file';
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => this.clearFile());
        
        // Assemble the structure
        fileInfoDiv.appendChild(fileNameDiv);
        fileInfoDiv.appendChild(fileSizeDiv);
        fileSelectedDiv.appendChild(fileIconDiv);
        fileSelectedDiv.appendChild(fileInfoDiv);
        fileSelectedDiv.appendChild(removeButton);
        
        // Clear and append safely
        this.dropZone.textContent = '';
        this.dropZone.appendChild(fileSelectedDiv);
    }
    
    clearFile() {
        this.selectedFile = null;
        this.uploadedFileData = null;
        
        // Reset UI to original state using safe DOM methods
        this.dropZone.textContent = '';
        
        const dropZoneContent = document.createElement('div');
        dropZoneContent.className = 'drop-zone-content';
        
        const uploadIcon = document.createElement('div');
        uploadIcon.className = 'upload-icon';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '48');
        svg.setAttribute('height', '48');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('d', 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12');
        
        svg.appendChild(path);
        uploadIcon.appendChild(svg);
        
        const dropZoneText = document.createElement('p');
        dropZoneText.className = 'drop-zone-text';
        dropZoneText.textContent = 'Drag and drop your file here';
        
        const dropZoneSubtext = document.createElement('p');
        dropZoneSubtext.className = 'drop-zone-subtext';
        dropZoneSubtext.textContent = 'or click to browse';
        
        dropZoneContent.appendChild(uploadIcon);
        dropZoneContent.appendChild(dropZoneText);
        dropZoneContent.appendChild(dropZoneSubtext);
        this.dropZone.appendChild(dropZoneContent);
        
        // Reset format selector using safe DOM methods
        this.outputFormatSelect.textContent = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select format...';
        this.outputFormatSelect.appendChild(defaultOption);
        this.convertBtn.disabled = true;
    }
    
    async uploadFileToServer(file) {
        try {
            this.showStatus('Analyzing file...', 'uploading');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.serverUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }
            
            const data = await response.json();
            this.uploadedFileData = data;
            
            console.log('File uploaded and analyzed:', data);
            
            // Update format selector with supported formats
            this.updateFormatOptions(data.supported_formats);
            
            this.showStatus('File ready for conversion', 'ready');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus(`Upload failed: ${error.message}`, 'error');
        }
    }
    
    updateFormatOptions(supportedFormats) {
        console.log('Updating format options with:', supportedFormats);
        
        if (!supportedFormats || supportedFormats.length === 0) {
            this.outputFormatSelect.textContent = '';
            const noOptionElement = document.createElement('option');
            noOptionElement.value = '';
            noOptionElement.textContent = 'No conversions available';
            this.outputFormatSelect.appendChild(noOptionElement);
            this.convertBtn.disabled = true;
            return;
        }
        
        // Clear existing options using safe DOM methods
        this.outputFormatSelect.textContent = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select format...';
        this.outputFormatSelect.appendChild(defaultOption);
        
        // Add supported format options
        supportedFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = format.toUpperCase();
            this.outputFormatSelect.appendChild(option);
        });
        
        // Enable convert button once format is selected
        this.outputFormatSelect.addEventListener('change', () => {
            this.convertBtn.disabled = !this.outputFormatSelect.value;
        });
        
        this.convertBtn.disabled = true; // Keep disabled until format is selected
    }
    
    async handleConvert() {
        if (!this.uploadedFileData || !this.selectedFile) {
            this.showStatus('Please select a file first', 'error');
            return;
        }
        
        const outputFormat = this.outputFormatSelect.value;
        if (!outputFormat) {
            this.showStatus('Please select an output format', 'error');
            return;
        }
        
        // Prevent duplicate conversion attempts
        if (this.convertBtn.disabled || this.isConverting) {
            return;
        }
        
        try {
            this.isConverting = true;
            this.showStatus('Converting file...', 'converting');
            this.convertBtn.disabled = true;
            
            const requestData = {
                file_id: this.uploadedFileData.file_id,
                output_format: outputFormat,
                temp_path: this.uploadedFileData.temp_path
            };
            
            const response = await fetch(`${this.serverUrl}/api/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                let errorMessage = `Conversion failed: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.detail || errorMessage;
                } catch (e) {
                    // Response might not be JSON
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Conversion completed:', data);
            
            // Show download link
            this.showDownloadReady(data);
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showStatus(`Conversion failed: ${error.message}`, 'error');
            this.convertBtn.disabled = false;
            this.isConverting = false;
        }
    }
    
    showDownloadReady(conversionData) {
        this.showStatus('Conversion completed!', 'success');
        
        // Update convert button to download button using safe DOM methods
        this.convertBtn.textContent = ''; // Clear existing content
        
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z');
        
        svg.appendChild(path);
        
        // Create text content
        const textNode = document.createTextNode(`Download (${this.formatFileSize(conversionData.file_size)})`);
        
        // Append elements to button
        this.convertBtn.appendChild(svg);
        this.convertBtn.appendChild(textNode);
        this.convertBtn.disabled = false;
        
        // Replace click handler with download
        this.convertBtn.onclick = () => {
            this.downloadFile(conversionData.download_url, conversionData.output_file);
        };
    }
    
    downloadFile(downloadUrl, filename) {
        const link = document.createElement('a');
        link.href = `${this.serverUrl}${downloadUrl}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reset UI after download
        setTimeout(() => {
            this.resetAfterDownload();
        }, 1000);
    }
    
    resetAfterDownload() {
        // Clear file data to prevent retries with deleted files
        this.uploadedFileData = null;
        this.selectedFile = null;
        this.isConverting = false;
        
        this.convertBtn.textContent = 'Convert Now';
        this.convertBtn.onclick = () => this.handleConvert();
        this.convertBtn.disabled = true; // Disable until new file is selected
        this.showStatus('Ready for next conversion', 'ready');
        
        // Reset drop zone UI to original state using safe DOM methods
        this.dropZone.textContent = ''; // Clear existing content
        
        const dropZoneContent = document.createElement('div');
        dropZoneContent.className = 'drop-zone-content';
        
        // Create upload icon container
        const uploadIcon = document.createElement('div');
        uploadIcon.className = 'upload-icon';
        
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '48');
        svg.setAttribute('height', '48');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8');
        
        svg.appendChild(path);
        uploadIcon.appendChild(svg);
        
        // Create text elements
        const uploadText = document.createElement('p');
        uploadText.className = 'upload-text';
        uploadText.appendChild(document.createTextNode('Drop your file here or '));
        const strongText = document.createElement('strong');
        strongText.textContent = 'choose file';
        uploadText.appendChild(strongText);
        
        const uploadSubtext = document.createElement('p');
        uploadSubtext.className = 'upload-subtext';
        uploadSubtext.textContent = 'Supports images, PDFs, and many other formats';
        
        // Create button
        const chooseFileBtn = document.createElement('button');
        chooseFileBtn.type = 'button';
        chooseFileBtn.id = 'choose-file-btn';
        chooseFileBtn.className = 'choose-file-btn';
        chooseFileBtn.textContent = 'Choose File';
        
        // Assemble elements
        dropZoneContent.appendChild(uploadIcon);
        dropZoneContent.appendChild(uploadText);
        dropZoneContent.appendChild(uploadSubtext);
        dropZoneContent.appendChild(chooseFileBtn);
        this.dropZone.appendChild(dropZoneContent);
        
        // Reset format selector using safe DOM methods
        this.outputFormatSelect.textContent = ''; // Clear existing content
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select format...';
        this.outputFormatSelect.appendChild(defaultOption);
        this.outputFormatSelect.disabled = true;
        
        // Reinitialize event listeners for the new elements
        this.initializeEventListeners();
    }
    
    showStatus(message, type) {
        // Update status display
        let statusClass = '';
        let icon = '';
        
        switch (type) {
            case 'uploading':
                statusClass = 'status-uploading';
                icon = '⬆️';
                break;
            case 'converting':
                statusClass = 'status-converting';
                icon = '🔄';
                break;
            case 'success':
                statusClass = 'status-success';
                icon = '✅';
                break;
            case 'error':
                statusClass = 'status-error';
                icon = '❌';
                break;
            case 'ready':
                statusClass = 'status-ready';
                icon = '📁';
                break;
        }
        
        // Find or create status element
        let statusElement = document.querySelector('.conversion-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'conversion-status';
            this.dropZone.parentNode.insertBefore(statusElement, this.dropZone.nextSibling);
        }
        
        statusElement.className = `conversion-status ${statusClass}`;
        
        // Use safe DOM methods instead of innerHTML
        statusElement.textContent = '';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'status-icon';
        iconSpan.textContent = icon;
        const messageText = document.createTextNode(` ${message}`);
        statusElement.appendChild(iconSpan);
        statusElement.appendChild(messageText);
        
        // Auto-hide non-persistent statuses
        if (type === 'ready' || type === 'success') {
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.style.opacity = '0.6';
                }
            }, 3000);
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showStatus(message, type = 'info') {
        console.log(`Status [${type}]: ${message}`);
        this.showNotification(message, type);
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.getElementById('conversion-status');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.id = 'conversion-status';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        // Set colors based on type
        if (type === 'error') {
            notification.style.backgroundColor = '#fef2f2';
            notification.style.color = '#dc2626';
            notification.style.border = '1px solid #fecaca';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#f0fdf4';
            notification.style.color = '#16a34a';
            notification.style.border = '1px solid #bbf7d0';
        } else if (type === 'uploading' || type === 'converting') {
            notification.style.backgroundColor = '#eff6ff';
            notification.style.color = '#2563eb';
            notification.style.border = '1px solid #dbeafe';
        } else {
            notification.style.backgroundColor = '#f8fafc';
            notification.style.color = '#475569';
            notification.style.border = '1px solid #e2e8f0';
        }
        
        document.body.appendChild(notification);
        
        // Show the notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Auto-hide after 3 seconds (unless it's a process status)
        if (type !== 'uploading' && type !== 'converting') {
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }
}

// Initialize server converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.serverConverter = new ServerFileConverter();
        console.log('Server-side file converter initialized');
    }
});