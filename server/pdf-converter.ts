import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

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

  async validatePDF(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return { valid: false, error: "The uploaded file is empty." };
      }

      if (stats.size > 50 * 1024 * 1024) { // 50MB limit
        return { valid: false, error: "File too large. Maximum size is 50MB." };
      }

      // Check PDF magic bytes
      const buffer = await fs.readFile(filePath, { encoding: null });
      const header = buffer.subarray(0, 5).toString('ascii');
      
      if (!header.startsWith('%PDF-')) {
        return { valid: false, error: "That file isn't a valid PDF. Please upload a .pdf file." };
      }

      // Check if PDF is encrypted
      try {
        const { stdout, stderr } = await execAsync(`pdfinfo "${filePath}"`);
        if (stdout.includes('Encrypted:') && stdout.includes('yes')) {
          return { valid: false, error: "This PDF is password-protected. Please decrypt it and try again." };
        }
      } catch (error) {
        // If pdfinfo fails, try pdftoppm to check encryption
        try {
          await execAsync(`pdftoppm -jpeg -r 72 -f 1 -l 1 "${filePath}" /dev/null`);
        } catch (pdfError: any) {
          if (pdfError.message.includes('Incorrect password')) {
            return { valid: false, error: "This PDF is password-protected. Please decrypt it and try again." };
          }
        }
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `PDF validation failed: ${error.message}` };
    }
  }

  async convertPDFToJPG(filePath: string, options: ConversionOptions = {}): Promise<ConversionResult> {
    const timestamp = Date.now();
    const outputPrefix = path.join(this.tempDir, `converted_${timestamp}`);
    const outputFiles: string[] = [];

    try {
      // Build pdftoppm command
      const dpi = options.dpi || 150;
      let command = `pdftoppm -jpeg -r ${dpi}`;

      // Add page range if specified
      if (options.pageRange) {
        if (options.pageRange.first) {
          command += ` -f ${options.pageRange.first}`;
        }
        if (options.pageRange.last) {
          command += ` -l ${options.pageRange.last}`;
        }
      }

      // Add quality settings
      if (options.quality) {
        const qualityMap = { low: 70, medium: 85, high: 95 };
        const qualityValue = qualityMap[options.quality];
        command += ` -jpegopt quality=${qualityValue}`;
      }

      command += ` "${filePath}" "${outputPrefix}"`;

      console.log('Running command:', command);

      // Execute conversion
      const { stdout, stderr } = await execAsync(command, { timeout: 120000 });

      if (stderr && stderr.includes('Error')) {
        throw new Error(`PDF conversion failed: ${stderr}`);
      }

      // Find generated files
      const tempFiles = await fs.readdir(this.tempDir);
      const generatedFiles = tempFiles.filter(file => 
        file.startsWith(`converted_${timestamp}`) && file.endsWith('.jpg')
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

      for (const file of generatedFiles) {
        outputFiles.push(path.join(this.tempDir, file));
      }

      return {
        success: true,
        files: outputFiles,
        isMultiPage: outputFiles.length > 1
      };

    } catch (error: any) {
      console.error('PDF conversion error:', error);
      
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
    const baseName = originalName.replace(/\.pdf$/i, '');
    return isMultiPage ? `${baseName}_images.zip` : `${baseName}.jpg`;
  }
}