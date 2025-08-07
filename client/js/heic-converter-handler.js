/**
 * HEIC to JPG Converter Handler
 * Handles file upload, conversion, and download for HEIC files
 */

let uploadedFiles = [];
let downloadUrl = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeHeicConverter();
});

function initializeHeicConverter() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
    
    // Convert button handler
    convertBtn.addEventListener('click', handleConversion);
    
    // Download button handler
    downloadBtn.addEventListener('click', handleDownload);

    // Drag and drop handlers
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

function handleDrop(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('drag-over');
}

function processFiles(files) {
    // Filter for HEIC files only
    const heicFiles = files.filter(file => {
        const extension = file.name.toLowerCase().split('.').pop();
        return ['heic', 'heif'].includes(extension);
    });

    if (heicFiles.length === 0) {
        showError('Please select HEIC files only.');
        return;
    }

    uploadedFiles = heicFiles;
    displayFilePreview();
    enableConvertButton();
}

function displayFilePreview() {
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileList = document.getElementById('fileList');

    if (uploadedFiles.length === 1) {
        fileName.textContent = uploadedFiles[0].name;
        fileSize.textContent = formatFileSize(uploadedFiles[0].size);
    } else {
        fileName.textContent = `${uploadedFiles.length} HEIC files selected`;
        const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
        fileSize.textContent = formatFileSize(totalSize);
    }

    // Display file list
    fileList.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            </div>
            <button class="remove-file" onclick="removeFile(${index})" data-testid="remove-file-${index}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        fileList.appendChild(fileItem);
    });

    filePreview.style.display = 'block';
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    
    if (uploadedFiles.length === 0) {
        document.getElementById('filePreview').style.display = 'none';
        disableConvertButton();
        document.getElementById('fileInput').value = '';
    } else {
        displayFilePreview();
    }
}

function enableConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = false;
    convertBtn.classList.add('enabled');
}

function disableConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = true;
    convertBtn.classList.remove('enabled');
}

async function handleConversion() {
    if (uploadedFiles.length === 0) {
        showError('Please select HEIC files first.');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    const btnText = convertBtn.querySelector('.btn-text');
    const btnLoader = convertBtn.querySelector('.btn-loader');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // Show loading state
    convertBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    progressContainer.style.display = 'block';

    try {
        // Get output format from advanced options
        const outputFormat = document.getElementById('outputFormat').value || 'jpg';
        
        let completedFiles = 0;
        const downloadUrls = [];

        for (const file of uploadedFiles) {
            try {
                // Upload file
                const uploadResult = await uploadFile(file);
                
                if (!uploadResult.success) {
                    throw new Error(`Upload failed: ${uploadResult.error || 'Unknown error'}`);
                }

                // Convert file
                const convertResult = await convertFile(
                    uploadResult.file_id,
                    outputFormat,
                    uploadResult.temp_path
                );

                if (!convertResult.success) {
                    throw new Error(`Conversion failed: ${convertResult.error || 'Unknown error'}`);
                }

                downloadUrls.push({
                    originalName: file.name,
                    downloadUrl: convertResult.download_url,
                    fileName: convertResult.output_file
                });

                completedFiles++;
                const progress = (completedFiles / uploadedFiles.length) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;

            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                throw new Error(`Failed to convert ${file.name}: ${error.message}`);
            }
        }

        // All files converted successfully
        showResults(downloadUrls);

    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || 'Conversion failed. Please try again.');
    } finally {
        // Reset button state
        convertBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        progressContainer.style.display = 'none';
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}

async function convertFile(fileId, outputFormat, tempPath) {
    const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            file_id: fileId,
            output_format: outputFormat,
            temp_path: tempPath
        })
    });

    return await response.json();
}

function showResults(downloadUrls) {
    const results = document.getElementById('results');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Store download URLs for the download handler
    window.conversionResults = downloadUrls;
    
    // Update button text based on number of files
    if (downloadUrls.length === 1) {
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Converted Image
        `;
    } else {
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download All Images (${downloadUrls.length})
        `;
    }
    
    results.style.display = 'block';
    results.scrollIntoView({ behavior: 'smooth' });
}

async function handleDownload() {
    if (!window.conversionResults || window.conversionResults.length === 0) {
        showError('No files available for download.');
        return;
    }

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;

    try {
        if (window.conversionResults.length === 1) {
            // Single file download
            const result = window.conversionResults[0];
            await downloadSingleFile(result.downloadUrl, result.originalName);
        } else {
            // Multiple files - download each one
            for (const result of window.conversionResults) {
                await downloadSingleFile(result.downloadUrl, result.originalName);
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        console.error('Download error:', error);
        showError('Download failed. Please try again.');
    } finally {
        downloadBtn.disabled = false;
    }
}

async function downloadSingleFile(downloadUrl, originalName) {
    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Download failed with status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        
        // Generate output filename
        const baseName = originalName.replace(/\.(heic|heif)$/i, '');
        const outputFormat = document.getElementById('outputFormat').value || 'jpg';
        link.download = `${baseName}.${outputFormat}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Single file download error:', error);
        throw error;
    }
}

function showError(message) {
    // Create a temporary error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 400px;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}