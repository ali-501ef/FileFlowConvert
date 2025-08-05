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
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
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
        
        // Choose file button
        this.chooseFileBtn.addEventListener('click', () => {
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
        
        this.dropZone.innerHTML = `
            <div class="file-selected">
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <div class="file-name">${fileName}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="remove-file" onclick="serverConverter.clearFile()">×</button>
            </div>
        `;
    }
    
    clearFile() {
        this.selectedFile = null;
        this.uploadedFileData = null;
        
        // Reset UI
        this.dropZone.innerHTML = `
            <div class="upload-icon">⬆️</div>
            <p>Drag & drop files to convert</p>
        `;
        
        // Reset format selector
        this.outputFormatSelect.innerHTML = '<option value="">Select format...</option>';
        this.convertBtn.disabled = true;
    }
    
    async uploadFileToServer(file) {
        try {
            this.showStatus('Analyzing file...', 'uploading');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.serverUrl}/upload`, {
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
        if (!supportedFormats || supportedFormats.length === 0) {
            this.outputFormatSelect.innerHTML = '<option value="">No conversions available</option>';
            this.convertBtn.disabled = true;
            return;
        }
        
        // Clear existing options
        this.outputFormatSelect.innerHTML = '<option value="">Select format...</option>';
        
        // Add supported format options
        supportedFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = format.toUpperCase();
            this.outputFormatSelect.appendChild(option);
        });
        
        this.convertBtn.disabled = false;
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
        
        try {
            this.showStatus('Converting file...', 'converting');
            this.convertBtn.disabled = true;
            
            const formData = new FormData();
            formData.append('file_id', this.uploadedFileData.file_id);
            formData.append('output_format', outputFormat);
            formData.append('temp_path', this.uploadedFileData.temp_path);
            
            const response = await fetch(`${this.serverUrl}/convert`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Conversion failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Conversion completed:', data);
            
            // Show download link
            this.showDownloadReady(data);
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showStatus(`Conversion failed: ${error.message}`, 'error');
            this.convertBtn.disabled = false;
        }
    }
    
    showDownloadReady(conversionData) {
        this.showStatus('Conversion completed!', 'success');
        
        // Update convert button to download button
        this.convertBtn.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Download (${this.formatFileSize(conversionData.file_size)})
        `;
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
        this.convertBtn.innerHTML = 'Convert Now';
        this.convertBtn.onclick = () => this.handleConvert();
        this.showStatus('Ready for next conversion', 'ready');
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
        statusElement.innerHTML = `<span class="status-icon">${icon}</span> ${message}`;
        
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
}

// Initialize server converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.serverConverter = new ServerFileConverter();
        console.log('Server-side file converter initialized');
    }
});