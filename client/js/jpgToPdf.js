/**
 * JPG to PDF Converter Client
 * Handles multiple image files and converts them to PDF using the clean API contract
 */

class JpgToPdfConverter {
  constructor() {
    this.selectedFiles = [];
    this.isConverting = false;
    
    // Load saved preferences from localStorage
    this.loadPreferences();
    
    this.init();
  }

  init() {
    this.setupFileInput();
    this.setupDropZone();
    this.setupAdvancedOptions();
    this.setupConvertButton();
    this.setupFormValidation();
  }

  // Load user preferences from localStorage
  loadPreferences() {
    const saved = localStorage.getItem('jpgToPdfPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        
        // Apply saved preferences to form elements
        document.addEventListener('DOMContentLoaded', () => {
          if (prefs.pageSize) document.getElementById('pageSize').value = prefs.pageSize;
          if (prefs.orientation) document.getElementById('orientation').value = prefs.orientation;
          if (prefs.fit) document.getElementById('fit').value = prefs.fit;
          if (prefs.margins) document.getElementById('margins').value = prefs.margins;
          if (prefs.dpi) document.getElementById('dpi').value = prefs.dpi;
          if (prefs.bgColor) document.getElementById('bgColor').value = prefs.bgColor;
          if (prefs.order) document.getElementById('order').value = prefs.order;
        });
      } catch (error) {
        console.warn('Failed to load preferences:', error);
      }
    }
  }

  // Save user preferences to localStorage
  savePreferences() {
    const prefs = {
      pageSize: document.getElementById('pageSize').value,
      orientation: document.getElementById('orientation').value,
      fit: document.getElementById('fit').value,
      margins: document.getElementById('margins').value,
      dpi: document.getElementById('dpi').value,
      bgColor: document.getElementById('bgColor').value,
      order: document.getElementById('order').value
    };
    
    localStorage.setItem('jpgToPdfPreferences', JSON.stringify(prefs));
  }

  setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput?.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });
  }

  setupDropZone() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop area when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      this.handleFiles(files);
    });
  }

  setupAdvancedOptions() {
    const optionsToggle = document.getElementById('optionsToggle');
    const optionsContent = document.getElementById('optionsContent');
    
    optionsToggle?.addEventListener('click', () => {
      const isExpanded = optionsContent.style.display !== 'none';
      optionsContent.style.display = isExpanded ? 'none' : 'block';
      
      // Update chevron rotation
      const chevron = optionsToggle.querySelector('.chevron');
      if (chevron) {
        chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });

    // Save preferences when options change
    const optionElements = ['pageSize', 'orientation', 'fit', 'margins', 'dpi', 'bgColor', 'order'];
    optionElements.forEach(id => {
      const element = document.getElementById(id);
      element?.addEventListener('change', () => this.savePreferences());
    });
  }

  setupConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    convertBtn?.addEventListener('click', () => {
      if (!this.isConverting && this.selectedFiles.length > 0) {
        this.convertToPdf();
      }
    });
  }

  setupFormValidation() {
    // Validate margins input
    const marginsInput = document.getElementById('margins');
    marginsInput?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      if (value < 0) e.target.value = 0;
      if (value > 200) e.target.value = 200;
    });

    // Validate DPI input
    const dpiInput = document.getElementById('dpi');
    dpiInput?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      if (value < 72) e.target.value = 72;
      if (value > 600) e.target.value = 600;
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleFiles(files) {
    const validFiles = this.validateFiles(files);
    
    if (validFiles.length === 0) {
      this.showError('Please select valid image files (JPG, PNG, WEBP, TIFF, BMP).');
      return;
    }

    // Add to existing selection or replace
    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    this.updateFilePreview();
    this.updateConvertButton();
    this.hideError();
  }

  validateFiles(files) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp'];
    
    return Array.from(files).filter(file => {
      const extension = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
      return allowedTypes.some(type => file.type.includes(type.split('/')[1])) || 
             allowedExtensions.includes(extension);
    });
  }

  updateFilePreview() {
    const filePreview = document.getElementById('filePreview');
    const uploadArea = document.getElementById('uploadArea');
    const fileList = document.getElementById('fileList');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    if (this.selectedFiles.length === 0) {
      filePreview.style.display = 'none';
      uploadArea.style.display = 'flex';
      return;
    }

    // Hide upload area and show preview
    uploadArea.style.display = 'none';
    filePreview.style.display = 'block';

    // Update header
    const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    fileName.textContent = this.selectedFiles.length === 1 
      ? this.selectedFiles[0].name 
      : `${this.selectedFiles.length} images selected`;
    fileSize.textContent = this.formatFileSize(totalSize);

    // Update file list
    fileList.innerHTML = '';
    this.selectedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-info">
          <span class="file-name">${file.name}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
        </div>
        <button class="remove-file-btn" onclick="jpgToPdfConverter.removeFile(${index})">×</button>
      `;
      fileList.appendChild(fileItem);
    });
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.updateFilePreview();
    this.updateConvertButton();
  }

  updateConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    const btnText = convertBtn?.querySelector('.btn-text');
    
    if (convertBtn) {
      convertBtn.disabled = this.selectedFiles.length === 0;
    }
    
    if (btnText) {
      btnText.textContent = this.selectedFiles.length === 0 
        ? 'Convert to PDF'
        : this.selectedFiles.length === 1
        ? 'Convert 1 image to PDF'
        : `Convert ${this.selectedFiles.length} images to PDF`;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFormOptions() {
    return {
      pageSize: document.getElementById('pageSize')?.value || 'A4',
      orientation: document.getElementById('orientation')?.value || 'portrait',
      margins: parseInt(document.getElementById('margins')?.value) || 36,
      fit: document.getElementById('fit')?.value || 'contain',
      dpi: parseInt(document.getElementById('dpi')?.value) || 300,
      bgColor: document.getElementById('bgColor')?.value || '#ffffff',
      order: document.getElementById('order')?.value || 'uploaded'
    };
  }

  async convertToPdf() {
    if (this.isConverting || this.selectedFiles.length === 0) return;

    this.isConverting = true;
    this.showProgress(0);
    this.hideError();

    try {
      // Create FormData with images and options
      const formData = new FormData();
      
      // Add all image files
      this.selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      // Add options with exact field names as specified
      const options = this.getFormOptions();
      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });

      console.log('🔄 Starting conversion with options:', options);

      // Make API request
      const response = await fetch('/api/convert/jpg-to-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      // Handle PDF response
      const blob = await response.blob();
      if (blob.type !== 'application/pdf') {
        throw new Error('Invalid response type - expected PDF');
      }

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'converted_images.pdf';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download the PDF
      this.downloadPdf(blob, filename);
      this.showSuccess(`Successfully converted ${this.selectedFiles.length} image${this.selectedFiles.length > 1 ? 's' : ''} to PDF!`);

    } catch (error) {
      console.error('❌ Conversion failed:', error);
      this.showError(`Conversion failed: ${error.message}`);
    } finally {
      this.isConverting = false;
      this.hideProgress();
    }
  }

  downloadPdf(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showProgress(progress) {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const convertBtn = document.getElementById('convertBtn');
    const btnText = convertBtn?.querySelector('.btn-text');
    const btnLoader = convertBtn?.querySelector('.btn-loader');

    // Show progress container
    if (progressContainer) {
      progressContainer.style.display = 'block';
    }

    // Update progress bar
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }

    // Update button state
    if (btnText && btnLoader) {
      if (this.isConverting) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
      } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
      }
    }

    if (convertBtn) {
      convertBtn.disabled = this.isConverting;
    }
  }

  hideProgress() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }

    // Reset button state
    const convertBtn = document.getElementById('convertBtn');
    const btnText = convertBtn?.querySelector('.btn-text');
    const btnLoader = convertBtn?.querySelector('.btn-loader');

    if (btnText && btnLoader) {
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
    }

    if (convertBtn) {
      convertBtn.disabled = this.selectedFiles.length === 0;
    }
  }

  showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      
      // Auto-hide after 8 seconds
      setTimeout(() => this.hideError(), 8000);
    }
  }

  hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
  }

  showSuccess(message) {
    // Create temporary success message
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.textContent = message;
    successEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-weight: 500;
    `;
    
    document.body.appendChild(successEl);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (successEl.parentNode) {
        document.body.removeChild(successEl);
      }
    }, 4000);
  }
}

// Initialize converter when DOM is loaded
let jpgToPdfConverter;
document.addEventListener('DOMContentLoaded', () => {
  jpgToPdfConverter = new JpgToPdfConverter();
});