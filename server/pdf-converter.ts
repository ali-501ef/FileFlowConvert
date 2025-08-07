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

      // Check if PDF is encrypted using pdfinfo
      let isPasswordProtected = false;
      try {
        const { stdout } = await execAsync(`pdfinfo "${filePath}"`);
        
        // Parse pdfinfo output to specifically check the Encrypted field
        const lines = stdout.split('\n');
        const encryptLine = lines.find(line => line.trim().startsWith('Encrypted:'));
        
        if (encryptLine) {
          const encryptValue = encryptLine.split(':')[1]?.trim().toLowerCase();
          // Only consider it password-protected if Encrypted field is not "no"
          isPasswordProtected = encryptValue !== 'no';
        }
      } catch (error) {
        // If pdfinfo fails completely, we'll test conversion directly
        console.log('pdfinfo failed, will test conversion directly:', error);
      }

      // If pdfinfo indicates encryption, verify by attempting conversion
      if (isPasswordProtected) {
        try {
          await execAsync(`pdftoppm -jpeg -r 72 -f 1 -l 1 "${filePath}" /dev/null`, { timeout: 10000 });
          // If conversion succeeds, the PDF isn't actually password-protected for our purposes
          console.log('PDF has encryption flags but is convertible');
        } catch (conversionError: any) {
          // Check if the error is specifically about incorrect password
          if (conversionError.message.includes('Incorrect password') || 
              conversionError.message.includes('Command not allowed') ||
              conversionError.message.includes('Permission denied')) {
            return { valid: false, error: "This PDF is password-protected. Please decrypt it and try again." };
          }
          // For other conversion errors, return a generic message
          console.log('Conversion test failed with non-password error:', conversionError.message);
          return { valid: false, error: "Unable to process this PDF file. Please try a different file." };
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