import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { formatOutputFilename, generateUniqueFilename } from './utils/filename';
import { validatePDF, logConversion } from './utils/validate';

const execAsync = promisify(exec);

export interface ConversionOptions {
  dpi?: number;
  quality?: 'low' | 'medium' | 'high';
  pageRange?: {
    first?: number;
    last?: number;
  };
}

export interface ConversionResult {
  success: boolean;
  files: string[];
  isMultiPage: boolean;
  error?: string;
}

export class PDFConverter {
  private tempDir = path.join(process.cwd(), 'uploads', 'temp');

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async validatePDF(filePath: string): Promise<{ valid: boolean; error?: string; metadata?: any }> {
    try {
      // Check file size first
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return { valid: false, error: "The uploaded file is empty." };
      }

      if (stats.size > 50 * 1024 * 1024) { // 50MB limit
        return { valid: false, error: "File too large. Maximum size is 50MB." };
      }

      // Use shared validation utility
      const validationResult = await validatePDF(filePath);
      
      if (!validationResult.valid) {
        return { 
          valid: false, 
          error: validationResult.error || "PDF validation failed",
          metadata: validationResult.metadata 
        };
      }

      return { 
        valid: true, 
        metadata: validationResult.metadata 
      };
    } catch (error: any) {
      return { valid: false, error: `PDF validation failed: ${error.message}` };
    }
  }

  async convertPDFToJPG(filePath: string, options: ConversionOptions = {}, originalFilename = ''): Promise<ConversionResult> {
    const startTime = Date.now();
    const outputFiles: string[] = [];

    try {
      // Get input file info for logging
      const inputStats = await fs.stat(filePath);
      const inputInfo = {
        filename: originalFilename || path.basename(filePath),
        mime: 'application/pdf',
        size: inputStats.size
      };

      // Generate unique output prefix using new filename utility
      const outputPrefix = path.join(this.tempDir, generateUniqueFilename('pdf_conversion', 'jpg').replace('.jpg', ''));

      // Build pdftoppm command with validation
      const dpi = Math.max(72, Math.min(300, options.dpi || 150)); // Clamp DPI between 72-300
      let command = `pdftoppm -jpeg -r ${dpi}`;

      // Add page range if specified (with validation)
      if (options.pageRange) {
        if (options.pageRange.first && options.pageRange.first > 0) {
          command += ` -f ${options.pageRange.first}`;
        }
        if (options.pageRange.last && options.pageRange.last > 0) {
          command += ` -l ${options.pageRange.last}`;
        }
      }

      // Add quality settings with validation
      if (options.quality) {
        const qualityMap = { low: 70, medium: 85, high: 95 };
        const qualityValue = qualityMap[options.quality] || 85;
        command += ` -jpegopt quality=${qualityValue}`;
      }

      command += ` "${filePath}" "${outputPrefix}"`;

      console.log('🔄 Running PDF conversion command:', command);

      // Execute conversion with timeout
      const { stdout, stderr } = await execAsync(command, { timeout: 120000 });

      if (stderr && stderr.includes('Error')) {
        throw new Error(`PDF conversion failed: ${stderr}`);
      }

      // Find generated files
      const tempFiles = await fs.readdir(this.tempDir);
      const baseFilename = path.basename(outputPrefix);
      const generatedFiles = tempFiles.filter(file => 
        file.startsWith(baseFilename) && file.endsWith('.jpg')
      );

      if (generatedFiles.length === 0) {
        throw new Error('No output files generated');
      }

      // Sort files by page number
      generatedFiles.sort((a, b) => {
        const aMatch = a.match(/-(\d+)\.jpg$/);
        const bMatch = b.match(/-(\d+)\.jpg$/);
        if (aMatch && bMatch) {
          return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
        return a.localeCompare(b);
      });

      // Create output file list
      for (const file of generatedFiles) {
        outputFiles.push(path.join(this.tempDir, file));
      }

      // Validate output files
      for (const outputFile of outputFiles) {
        const outputStats = await fs.stat(outputFile);
        if (outputStats.size === 0) {
          throw new Error(`Generated file is empty: ${path.basename(outputFile)}`);
        }
      }

      const isMultiPage = outputFiles.length > 1;
      const duration = Date.now() - startTime;

      // Log successful conversion
      const outputInfo = {
        filename: isMultiPage ? `${path.basename(filePath, '.pdf')}_images.zip` : formatOutputFilename(inputInfo.filename, 'jpg'),
        mime: isMultiPage ? 'application/zip' : 'image/jpeg',
        size: outputFiles.reduce(async (acc, file) => {
          const stats = await fs.stat(file);
          return (await acc) + stats.size;
        }, Promise.resolve(0))
      };

      logConversion('pdf-to-jpg', inputInfo, {
        ...outputInfo,
        size: await outputInfo.size
      }, options, {
        success: true,
        duration
      });

      return {
        success: true,
        files: outputFiles,
        isMultiPage
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ PDF conversion error:', error);
      
      // Log failed conversion
      logConversion('pdf-to-jpg', {
        filename: originalFilename || path.basename(filePath),
        mime: 'application/pdf',
        size: 0
      }, {
        filename: 'failed',
        mime: 'image/jpeg',
        size: 0
      }, options, {
        success: false,
        error: error.message,
        duration
      });
      
      // Clean up any partial files
      await this.cleanupFiles(outputFiles);
      
      return {
        success: false,
        files: [],
        isMultiPage: false,
        error: error.message
      };
    }
  }

  async createZip(files: string[], outputPath: string): Promise<void> {
    const fileList = files.map(f => `"${f}"`).join(' ');
    const command = `cd "${path.dirname(files[0])}" && zip -j "${outputPath}" ${fileList}`;
    
    await execAsync(command);
  }

  async cleanupFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.error(`Failed to cleanup file ${file}:`, error);
      }
    }
  }

  generateOutputFilename(originalName: string, isMultiPage: boolean): string {
    if (isMultiPage) {
      // For multi-page, use ZIP with consistent naming
      return formatOutputFilename(originalName, 'zip');
    } else {
      // For single page, use JPG with consistent naming
      return formatOutputFilename(originalName, 'jpg');
    }
  }
}