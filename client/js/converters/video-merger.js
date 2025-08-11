/**
 * Video Merger
 * Merges multiple video files into one continuous video
 */
class VideoMerger {
    constructor() {
        this.uploadedFiles = [];
        this.uploadResults = [];
        this.isFilePickerOpen = false;
        this.isProcessing = false;
        this.init();
        this.setupEventListeners();
    }

    init() {
        // DOM element references
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.videoList = document.getElementById('videoList');
        this.videoItems = document.getElementById('videoItems');
        this.addMoreBtn = document.getElementById('addMoreBtn');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Advanced options
        this.outputFormat = document.getElementById('outputFormat');
        this.quality = document.getElementById('quality');
        this.resolution = document.getElementById('resolution');
        this.addTransitions = document.getElementById('addTransitions');
        this.normalizeAudio = document.getElementById('normalizeAudio');
        
        // Initialize with default values
        if (this.outputFormat) this.outputFormat.value = 'mp4';
        if (this.quality) this.quality.value = 'medium';
        if (this.resolution) this.resolution.value = 'auto';
        if (this.addTransitions) this.addTransitions.checked = false;
        if (this.normalizeAudio) this.normalizeAudio.checked = true;
    }

    setupEventListeners() {
        // File input handlers
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (this.addMoreBtn) {
            this.addMoreBtn.addEventListener('click', () => this.fileInput.click());
        }

        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => this.mergeVideos());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }
    }

    handleUploadAreaClick(e) {
        if (this.isFilePickerOpen || this.isProcessing) return;
        
        this.isFilePickerOpen = true;
        this.fileInput.click();
        
        setTimeout(() => {
            this.isFilePickerOpen = false;
        }, 100);
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.isProcessing) {
            this.uploadArea.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleFileDrop(e) {
        e.preventDefault();
        if (this.isProcessing) return;
        
        this.uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.processMultipleFiles(files);
        }
    }

    async handleFileSelect(e) {
        if (this.isProcessing) return;
        
        const files = Array.from(e.target.files);
        if (!files.length) return;

        this.processMultipleFiles(files);
    }

    async processMultipleFiles(files) {
        // Filter for video files only
        const videoFiles = files.filter(file => file.type.startsWith('video/'));
        
        if (videoFiles.length === 0) {
            this.showError('Please select video files.');
            return;
        }

        if (videoFiles.length !== files.length) {
            this.showError(`Selected ${videoFiles.length} video files, ignored ${files.length - videoFiles.length} non-video files.`);
        }

        this.setProcessingState(true, 'Uploading files...');

        try {
            for (let i = 0; i < videoFiles.length; i++) {
                const file = videoFiles[i];
                const uploadResult = await this.uploadFile(file);
                
                this.uploadedFiles.push(file);
                this.uploadResults.push(uploadResult);
                
                this.updateUploadProgress(i + 1, videoFiles.length);
            }
            
            this.setProcessingState(false);
            this.updateVideoList();
            this.updateUI();
            
        } catch (error) {
            this.setProcessingState(false);
            this.showError('Upload failed: ' + error.message);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return await response.json();
    }

    updateUploadProgress(current, total) {
        const percent = Math.round((current / total) * 100);
        this.showProgress(percent);
    }

    updateVideoList() {
        if (!this.videoItems) return;

        this.videoItems.innerHTML = '';
        
        this.uploadedFiles.forEach((file, index) => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            
            // Create info section
            const infoDiv = document.createElement('div');
            infoDiv.className = 'video-item-info';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'video-item-name';
            nameDiv.textContent = file.name; // Safe: uses textContent instead of innerHTML
            
            const sizeDiv = document.createElement('div');
            sizeDiv.className = 'video-item-size';
            sizeDiv.textContent = this.formatFileSize(file.size);
            
            infoDiv.appendChild(nameDiv);
            infoDiv.appendChild(sizeDiv);
            
            // Create actions section
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'video-item-actions';
            
            // Move up button
            const moveUpBtn = document.createElement('button');
            moveUpBtn.className = 'move-up-btn';
            if (index === 0) moveUpBtn.disabled = true;
            moveUpBtn.onclick = () => window.videoMerger.moveVideo(index, -1);
            moveUpBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m18 15-6-6-6 6"/>
                </svg>
            `;
            
            // Move down button
            const moveDownBtn = document.createElement('button');
            moveDownBtn.className = 'move-down-btn';
            if (index === this.uploadedFiles.length - 1) moveDownBtn.disabled = true;
            moveDownBtn.onclick = () => window.videoMerger.moveVideo(index, 1);
            moveDownBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            `;
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => window.videoMerger.removeVideo(index);
            removeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            
            actionsDiv.appendChild(moveUpBtn);
            actionsDiv.appendChild(moveDownBtn);
            actionsDiv.appendChild(removeBtn);
            
            videoItem.appendChild(infoDiv);
            videoItem.appendChild(actionsDiv);
            this.videoItems.appendChild(videoItem);
        });
        
        if (this.videoList) {
            this.videoList.style.display = this.uploadedFiles.length > 0 ? 'block' : 'none';
        }
        
        // Expose instance to window for button callbacks
        window.videoMerger = this;
    }

    moveVideo(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.uploadedFiles.length) return;
        
        // Swap files and results
        [this.uploadedFiles[index], this.uploadedFiles[newIndex]] = [this.uploadedFiles[newIndex], this.uploadedFiles[index]];
        [this.uploadResults[index], this.uploadResults[newIndex]] = [this.uploadResults[newIndex], this.uploadResults[index]];
        
        this.updateVideoList();
    }

    removeVideo(index) {
        this.uploadedFiles.splice(index, 1);
        this.uploadResults.splice(index, 1);
        this.updateVideoList();
        this.updateUI();
    }

    updateUI() {
        // Hide upload area if we have files, show video list
        if (this.uploadedFiles.length > 0) {
            this.uploadArea.style.display = 'none';
            if (this.videoList) this.videoList.style.display = 'block';
        } else {
            this.uploadArea.style.display = 'block';
            if (this.videoList) this.videoList.style.display = 'none';
        }
        
        // Update convert button
        if (this.convertBtn) {
            this.convertBtn.disabled = this.uploadedFiles.length < 2;
        }
    }

    async mergeVideos() {
        if (this.uploadedFiles.length < 2 || this.isProcessing) return;

        this.setProcessingState(true, 'Merging videos...');
        this.showProgress(0);
        this.results.style.display = 'none';

        try {
            const settings = this.getMergeSettings();
            await this.performMerge(settings);
            
            this.showMergeResults();
            this.trackConversion();
            
        } catch (error) {
            this.showError('Video merge failed: ' + error.message);
        }

        this.setProcessingState(false);
        this.hideProgress();
    }

    getMergeSettings() {
        return {
            format: this.outputFormat?.value || 'mp4',
            quality: this.quality?.value || 'medium',
            resolution: this.resolution?.value || 'auto',
            add_transitions: this.addTransitions?.checked || false,
            normalize_audio: this.normalizeAudio?.checked || true,
            video_files: this.uploadResults.map(result => result.temp_path)
        };
    }

    async performMerge(settings) {
        const POLL_MS = 1000; // Poll every 1 second for progress updates
        
        this.showProgress(0);
        
        // Start the conversion
        const response = await fetch('/api/convert-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversion_type: 'video_merge',
                options: settings
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Merge failed');
        }

        this.conversionResult = await response.json();
        
        // If we have the output file, poll for progress
        if (this.conversionResult.output_file) {
            let currentProgress = 0;
            while (currentProgress < 100) {
                try {
                    const progressResponse = await fetch(`/api/progress/${this.conversionResult.output_file}`);
                    if (progressResponse.ok) {
                        const progressData = await progressResponse.json();
                        currentProgress = progressData.progress || 0;
                        this.showProgress(currentProgress);
                        
                        if (currentProgress >= 100) {
                            break;
                        }
                        
                        // Wait before next poll
                        await new Promise(resolve => setTimeout(resolve, POLL_MS));
                    } else {
                        // If progress endpoint fails, assume completed
                        break;
                    }
                } catch (error) {
                    // If polling fails, assume completed
                    break;
                }
            }
        }
        
        this.showProgress(100);
    }

    showMergeResults() {
        if (!this.results) return;

        const mergeStats = document.getElementById('mergeStats');

        // Show merge stats
        if (mergeStats && this.conversionResult) {
            const totalFiles = this.uploadedFiles.length;
            const totalSize = this.uploadedFiles.reduce((sum, file) => sum + file.size, 0);

            // Clear existing content
            mergeStats.textContent = '';
            
            // Create stats grid using safe DOM methods
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';
            
            // Files merged stat
            const filesItem = document.createElement('div');
            filesItem.className = 'stat-item';
            const filesLabel = document.createElement('span');
            filesLabel.className = 'stat-label';
            filesLabel.textContent = 'Files Merged';
            const filesValue = document.createElement('span');
            filesValue.className = 'stat-value';
            filesValue.textContent = totalFiles;
            filesItem.appendChild(filesLabel);
            filesItem.appendChild(filesValue);
            
            // Total input size stat
            const inputSizeItem = document.createElement('div');
            inputSizeItem.className = 'stat-item';
            const inputSizeLabel = document.createElement('span');
            inputSizeLabel.className = 'stat-label';
            inputSizeLabel.textContent = 'Total Input Size';
            const inputSizeValue = document.createElement('span');
            inputSizeValue.className = 'stat-value';
            inputSizeValue.textContent = this.formatFileSize(totalSize);
            inputSizeItem.appendChild(inputSizeLabel);
            inputSizeItem.appendChild(inputSizeValue);
            
            // Output size stat
            const outputSizeItem = document.createElement('div');
            outputSizeItem.className = 'stat-item';
            const outputSizeLabel = document.createElement('span');
            outputSizeLabel.className = 'stat-label';
            outputSizeLabel.textContent = 'Output Size';
            const outputSizeValue = document.createElement('span');
            outputSizeValue.className = 'stat-value';
            outputSizeValue.textContent = this.formatFileSize(this.conversionResult.file_size);
            outputSizeItem.appendChild(outputSizeLabel);
            outputSizeItem.appendChild(outputSizeValue);
            
            // Append all items to grid
            statsGrid.appendChild(filesItem);
            statsGrid.appendChild(inputSizeItem);
            statsGrid.appendChild(outputSizeItem);
            
            // Append grid to container
            mergeStats.appendChild(statsGrid);
        }

        this.results.style.display = 'block';
    }

    downloadFile() {
        if (this.conversionResult?.download_url) {
            const link = document.createElement('a');
            link.href = this.conversionResult.download_url;
            link.download = `merged_video.${this.outputFormat?.value || 'mp4'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    setProcessingState(processing, message = '') {
        this.isProcessing = processing;
        
        // Create/update processing overlay
        let overlay = this.uploadArea.querySelector('.processing-overlay');
        if (processing) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'processing-overlay';
                this.uploadArea.appendChild(overlay);
            }
            // Create safe DOM structure
            const content = document.createElement('div');
            content.className = 'processing-content';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            
            content.appendChild(spinner);
            content.appendChild(messageEl);
            
            overlay.innerHTML = '';
            overlay.appendChild(content);
            overlay.style.display = 'flex';
            
            // Disable upload area interactions
            this.uploadArea.style.pointerEvents = 'none';
            this.uploadArea.style.opacity = '0.7';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
            // Re-enable upload area interactions
            this.uploadArea.style.pointerEvents = 'auto';
            this.uploadArea.style.opacity = '1';
        }
        
        // Update convert button
        if (this.convertBtn) {
            this.convertBtn.disabled = processing || this.uploadedFiles.length < 2;
            const btnText = this.convertBtn.querySelector('.btn-text');
            const btnLoader = this.convertBtn.querySelector('.btn-loader');
            
            if (btnText) btnText.style.display = processing ? 'none' : 'inline';
            if (btnLoader) btnLoader.style.display = processing ? 'inline-block' : 'none';
        }
        
        // Update add more button
        if (this.addMoreBtn) {
            this.addMoreBtn.disabled = processing;
        }
    }

    showProgress(percent) {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'block';
            if (this.progressFill) {
                this.progressFill.style.width = `${percent}%`;
            }
            if (this.progressText) {
                this.progressText.textContent = `${percent}%`;
            }
        }
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }

    showError(message) {
        // Show error message inline
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            this.uploadArea.parentNode.insertBefore(errorDiv, this.uploadArea.nextSibling);
        }
        
        // Clear existing content
        errorDiv.innerHTML = '';
        
        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'error-content';
        
        // Create SVG icon safely
        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgIcon.setAttribute('width', '20');
        svgIcon.setAttribute('height', '20');
        svgIcon.setAttribute('viewBox', '0 0 24 24');
        svgIcon.setAttribute('fill', 'none');
        svgIcon.setAttribute('stroke', 'currentColor');
        svgIcon.setAttribute('stroke-width', '2');
        svgIcon.setAttribute('stroke-linecap', 'round');
        svgIcon.setAttribute('stroke-linejoin', 'round');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '15');
        line1.setAttribute('y1', '9');
        line1.setAttribute('x2', '9');
        line1.setAttribute('y2', '15');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '9');
        line2.setAttribute('y1', '9');
        line2.setAttribute('x2', '15');
        line2.setAttribute('y2', '15');
        
        svgIcon.appendChild(circle);
        svgIcon.appendChild(line1);
        svgIcon.appendChild(line2);
        
        // Create message span safely
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message; // Safe text content assignment
        
        // Assemble the elements
        contentDiv.appendChild(svgIcon);
        contentDiv.appendChild(messageSpan);
        errorDiv.appendChild(contentDiv);
        
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.style.display = 'none';
        }, 5000);
    }

    trackConversion() {
        // Analytics tracking for conversion
        if (window.gtag) {
            gtag('event', 'conversion', {
                event_category: 'Video Merge',
                event_label: `${this.uploadedFiles.length} files`
            });
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

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoMerger();
});