import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

interface PageSize {
  A4: number[];
  Letter: number[];
  Legal: number[];
  [key: string]: number[];
}

interface ConversionOptions {
  pageSize: string;
  orientation: string;
  margins: number;
  fit: string;
  dpi: number;
  bgColor: string;
  order: string;
}

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface ImagePlacement {
  width: number;
  height: number;
  x: number;
  y: number;
}

class JpgToPdfController {
  
  // Page size mappings in points (1 inch = 72 points)
  static PAGE_SIZES: PageSize = {
    A4: [595.276, 841.89],
    Letter: [612, 792], 
    Legal: [612, 1008]
  };

  // Default options
  static DEFAULT_OPTIONS = {
    pageSize: 'A4',
    orientation: 'portrait', 
    margins: 36,
    fit: 'contain',
    dpi: 300,
    bgColor: '#FFFFFF',
    order: 'uploaded'
  };

  // Parse and validate hex color
  static parseColor(hex: string): { r: number; g: number; b: number } {
    const match = hex.match(/^#([0-9A-Fa-f]{6})$/);
    if (!match) throw new Error(`Invalid color format: ${hex}`);
    
    const r = parseInt(match[1].substr(0, 2), 16) / 255;
    const g = parseInt(match[1].substr(2, 2), 16) / 255; 
    const b = parseInt(match[1].substr(4, 2), 16) / 255;
    return { r, g, b };
  }

  // Convert hex color to RGB buffer for Sharp
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const match = hex.match(/^#([0-9A-Fa-f]{6})$/);
    if (!match) return { r: 255, g: 255, b: 255 };
    
    return {
      r: parseInt(match[1].substr(0, 2), 16),
      g: parseInt(match[1].substr(2, 2), 16),
      b: parseInt(match[1].substr(4, 2), 16)
    };
  }

  // Get page dimensions based on size and orientation
  static getPageDimensions(pageSize: string, orientation: string, imageDimensions?: ImageDimensions | null, dpi: number = 300): { width: number; height: number } {
    let [width, height] = this.PAGE_SIZES[pageSize] || this.PAGE_SIZES.A4;
    
    // Handle auto sizing based on image dimensions and DPI
    if (pageSize === 'auto' && imageDimensions) {
      // Convert pixels to points using DPI (72 points per inch)
      width = (imageDimensions.width / dpi) * 72;
      height = (imageDimensions.height / dpi) * 72;
    }
    
    // Apply orientation
    if (orientation === 'landscape') {
      [width, height] = [height, width];
    }
    
    return { width, height };
  }

  // Calculate image placement based on fit option
  static calculateImagePlacement(imageWidth: number, imageHeight: number, pageWidth: number, pageHeight: number, margins: number, fit: string): ImagePlacement {
    const usableWidth = pageWidth - (margins * 2);
    const usableHeight = pageHeight - (margins * 2);
    
    let width, height, x, y;
    
    if (fit === 'contain') {
      // Scale to fit without cropping (maintain aspect ratio)
      const scale = Math.min(usableWidth / imageWidth, usableHeight / imageHeight);
      width = imageWidth * scale;
      height = imageHeight * scale;
      x = margins + (usableWidth - width) / 2;
      y = margins + (usableHeight - height) / 2;
      
    } else if (fit === 'cover') {
      // Scale to fill page (may crop, maintain aspect ratio)
      const scale = Math.max(usableWidth / imageWidth, usableHeight / imageHeight);
      width = imageWidth * scale;
      height = imageHeight * scale; 
      x = margins + (usableWidth - width) / 2;
      y = margins + (usableHeight - height) / 2;
    } else {
      // Default to contain
      const scale = Math.min(usableWidth / imageWidth, usableHeight / imageHeight);
      width = imageWidth * scale;
      height = imageHeight * scale;
      x = margins + (usableWidth - width) / 2;
      y = margins + (usableHeight - height) / 2;
    }
    
    return { width, height, x, y };
  }

  // Sort files based on order option
  static sortFiles(files: Express.Multer.File[], order: string): Express.Multer.File[] {
    if (order === 'filename') {
      return [...files].sort((a, b) => a.originalname.localeCompare(b.originalname));
    }
    // Default to uploaded order
    return files;
  }

  // Process single image with Sharp
  static async processImage(imagePath: string, bgColor: string): Promise<ProcessedImage> {
    try {
      const bgRgb = this.hexToRgb(bgColor);
      
      // Load image and get metadata
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // Convert to RGB and composite on background color if has transparency
      let processedBuffer;
      
      if (metadata.channels === 4 || metadata.hasAlpha) {
        // Has transparency - composite on background color
        const background = {
          create: {
            width: metadata.width || 1,
            height: metadata.height || 1,
            channels: 3,
            background: bgRgb
          }
        };
        
        processedBuffer = await image
          .composite([{ input: await image.png().toBuffer(), top: 0, left: 0 }])
          .flatten({ background: bgRgb })
          .jpeg({ quality: 95 })
          .toBuffer();
      } else {
        // No transparency - just convert to JPEG if needed
        processedBuffer = await image
          .jpeg({ quality: 95 })
          .toBuffer();
      }
      
      return {
        buffer: processedBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: 'jpeg'
      };
      
    } catch (error: any) {
      throw new Error(`Failed to process image ${path.basename(imagePath)}: ${error.message}`);
    }
  }

  // Generate unique filename with pattern
  static generateFilename(files: Express.Multer.File[]): string {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/T/, '-')
      .replace(/\..+/, '')
      .slice(0, 13); // YYYYMMDD-HHMM
    
    if (files.length === 1) {
      const baseName = path.parse(files[0].originalname).name
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      return `${baseName || 'image'}_to_pdf_${timestamp}.pdf`;
    } else {
      return `images_to_pdf_${timestamp}.pdf`;
    }
  }

  // Validate PDF structure
  static validatePDF(buffer: Buffer): { valid: boolean; error?: string } {
    try {
      // Check PDF header
      const header = buffer.subarray(0, 5).toString();
      if (!header.startsWith('%PDF-')) {
        return { valid: false, error: 'Invalid PDF header' };
      }
      
      // Check PDF footer
      const footer = buffer.subarray(-50).toString();
      if (!footer.includes('%%EOF')) {
        return { valid: false, error: 'Missing PDF EOF marker' };
      }
      
      // Try to re-parse with pdf-lib to ensure structure is valid
      PDFDocument.load(buffer);
      
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `PDF structure validation failed: ${error.message}` };
    }
  }

  // Main conversion method
  async convert(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let tempFiles: string[] = [];
    
    try {
      console.log('🔍 Starting JPG → PDF conversion');
      
      // Validate input files
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }
      
      if (files.length > 100) {
        res.status(400).json({ error: 'Maximum 100 files allowed' });
        return;
      }
      
      // Validate and parse options
      const options: ConversionOptions = { ...JpgToPdfController.DEFAULT_OPTIONS, ...req.body };
      
      // Validate pageSize
      if (!['auto', 'A4', 'Letter', 'Legal'].includes(options.pageSize)) {
        res.status(400).json({ error: `Invalid pageSize: ${options.pageSize}` });
        return;
      }
      
      // Validate orientation
      if (!['portrait', 'landscape'].includes(options.orientation)) {
        res.status(400).json({ error: `Invalid orientation: ${options.orientation}` });
        return;
      }
      
      // Validate fit
      if (!['contain', 'cover'].includes(options.fit)) {
        res.status(400).json({ error: `Invalid fit: ${options.fit}` });
        return;
      }
      
      // Validate margins
      const margins = parseInt(options.margins.toString());
      if (isNaN(margins) || margins < 0 || margins > 200) {
        res.status(400).json({ error: 'Margins must be between 0 and 200 points' });
        return;
      }
      
      // Validate DPI
      const dpi = parseInt(options.dpi.toString());
      if (isNaN(dpi) || dpi < 72 || dpi > 600) {
        res.status(400).json({ error: 'DPI must be between 72 and 600' });
        return;
      }
      
      // Validate bgColor
      try {
        JpgToPdfController.parseColor(options.bgColor);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
        return;
      }
      
      // Validate order
      if (!['filename', 'uploaded'].includes(options.order)) {
        res.status(400).json({ error: `Invalid order: ${options.order}` });
        return;
      }
      
      console.log(`📄 Processing ${files.length} files with options:`, options);
      tempFiles = files.map(f => f.path);
      
      // Sort files based on order preference
      const sortedFiles = JpgToPdfController.sortFiles(files, options.order);
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Set PDF metadata
      pdfDoc.setTitle('Converted Images');
      pdfDoc.setAuthor('FileFlow');
      pdfDoc.setCreator('FileFlow JPG to PDF Converter');
      pdfDoc.setProducer('FileFlow');
      pdfDoc.setCreationDate(new Date());
      
      // Process each image
      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        console.log(`📸 Processing image ${i + 1}/${sortedFiles.length}: ${file.originalname}`);
        
        try {
          // Process image with Sharp
          const processedImage = await JpgToPdfController.processImage(file.path, options.bgColor);
          
          // Get page dimensions (auto-size based on first image if needed)
          const pageDims = JpgToPdfController.getPageDimensions(
            options.pageSize,
            options.orientation,
            i === 0 ? { width: processedImage.width, height: processedImage.height } : null,
            dpi
          );
          
          // Calculate image placement
          const placement = JpgToPdfController.calculateImagePlacement(
            processedImage.width,
            processedImage.height,
            pageDims.width,
            pageDims.height,
            margins,
            options.fit
          );
          
          // Create new page
          const page = pdfDoc.addPage([pageDims.width, pageDims.height]);
          
          // Fill page background
          const bgColor = JpgToPdfController.parseColor(options.bgColor);
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageDims.width,
            height: pageDims.height,
            color: rgb(bgColor.r, bgColor.g, bgColor.b)
          });
          
          // Embed image
          const image = await pdfDoc.embedJpg(processedImage.buffer);
          
          // Draw image on page
          page.drawImage(image, {
            x: placement.x,
            y: placement.y, 
            width: placement.width,
            height: placement.height
          });
          
          console.log(`✅ Added image ${i + 1} to PDF (${placement.width.toFixed(1)}x${placement.height.toFixed(1)} pts)`);
          
        } catch (error: any) {
          throw new Error(`Failed to process image ${file.originalname}: ${error.message}`);
        }
      }
      
      // Generate PDF bytes with maximum compatibility
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
      const pdfBuffer = Buffer.from(pdfBytes);
      
      // Validate PDF structure before sending
      const validation = JpgToPdfController.validatePDF(pdfBuffer);
      if (!validation.valid) {
        throw new Error(`PDF validation failed: ${validation.error}`);
      }
      
      // Generate filename
      const filename = JpgToPdfController.generateFilename(sortedFiles);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBytes.length);
      
      console.log(`✅ PDF conversion completed successfully`);
      console.log(`📊 Stats: ${sortedFiles.length} pages, ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB, ${Date.now() - startTime}ms`);
      
      // Send PDF
      res.send(pdfBuffer);
      
      // Log successful conversion
      console.log(`📥 Served download: ${filename} (${pdfBuffer.length} bytes)`);
      
    } catch (error: any) {
      console.error('❌ Conversion failed:', error);
      res.status(500).json({ 
        error: 'Conversion failed',
        message: error.message
      });
    } finally {
      // Cleanup temp files
      for (const tempFile of tempFiles) {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
    }
  }
}

export const jpgToPdfController = new JpgToPdfController();