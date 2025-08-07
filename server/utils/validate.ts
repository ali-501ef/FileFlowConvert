/**
 * File validation utilities for all conversion types
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface ValidationResult {
  valid: boolean;
  actualType?: string;
  actualExtension?: string;
  error?: string;
  metadata?: any;
}

/**
 * Validate PDF file and get metadata
 * @param filePath - Path to PDF file
 * @returns Validation result with PDF metadata
 */
export async function validatePDF(filePath: string): Promise<ValidationResult> {
  try {
    // Check file exists
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    // Check magic bytes
    const buffer = await fs.readFile(filePath, { encoding: null });
    const header = buffer.subarray(0, 5).toString('ascii');
    
    if (!header.startsWith('%PDF-')) {
      return { valid: false, error: 'Not a valid PDF file' };
    }

    // Use pdfinfo to validate and get metadata
    try {
      const { stdout } = await execAsync(`pdfinfo "${filePath}"`);
      
      const metadata: any = {};
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          metadata[key] = value;
        }
      }

      // Check if truly password protected
      const isEncrypted = metadata['Encrypted'] && metadata['Encrypted'].toLowerCase() !== 'no';
      
      if (isEncrypted) {
        // Test if we can actually process it
        try {
          await execAsync(`pdftoppm -jpeg -r 72 -f 1 -l 1 "${filePath}" /dev/null`, { timeout: 10000 });
        } catch (error: any) {
          if (error.message.includes('Incorrect password') || 
              error.message.includes('Command not allowed') ||
              error.message.includes('Permission denied')) {
            return { 
              valid: false, 
              error: 'PDF is password-protected',
              metadata 
            };
          }
        }
      }

      return {
        valid: true,
        actualType: 'application/pdf',
        actualExtension: 'pdf',
        metadata
      };
    } catch (error: any) {
      return { 
        valid: false, 
        error: `PDF validation failed: ${error.message}` 
      };
    }
  } catch (error: any) {
    return { 
      valid: false, 
      error: `File validation failed: ${error.message}` 
    };
  }
}

/**
 * Validate image file using imagemagick identify
 * @param filePath - Path to image file
 * @returns Validation result with image metadata
 */
export async function validateImage(filePath: string): Promise<ValidationResult> {
  try {
    const { stdout } = await execAsync(`identify -ping -format "%m %w %h %[colorspace]" "${filePath}"`);
    const [format, width, height, colorspace] = stdout.trim().split(' ');
    
    const metadata = {
      format,
      width: parseInt(width),
      height: parseInt(height),
      colorspace
    };

    // Map ImageMagick format to MIME type
    const formatToMime: { [key: string]: string } = {
      'JPEG': 'image/jpeg',
      'PNG': 'image/png',
      'GIF': 'image/gif',
      'WEBP': 'image/webp',
      'TIFF': 'image/tiff',
      'BMP': 'image/bmp',
      'HEIC': 'image/heic'
    };

    const actualType = formatToMime[format] || `image/${format.toLowerCase()}`;
    const actualExtension = format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase();

    return {
      valid: true,
      actualType,
      actualExtension,
      metadata
    };
  } catch (error: any) {
    return { 
      valid: false, 
      error: `Image validation failed: ${error.message}` 
    };
  }
}

/**
 * Validate video/audio file using ffprobe
 * @param filePath - Path to media file
 * @returns Validation result with media metadata
 */
export async function validateMedia(filePath: string): Promise<ValidationResult> {
  try {
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const data = JSON.parse(stdout);
    
    const format = data.format;
    const streams = data.streams;
    
    const hasVideo = streams.some((s: any) => s.codec_type === 'video');
    const hasAudio = streams.some((s: any) => s.codec_type === 'audio');
    
    let actualType = 'application/octet-stream';
    let actualExtension = '';
    
    if (hasVideo && hasAudio) {
      actualType = `video/${format.format_name.split(',')[0]}`;
      actualExtension = format.format_name.split(',')[0];
    } else if (hasAudio) {
      actualType = `audio/${format.format_name.split(',')[0]}`;
      actualExtension = format.format_name.split(',')[0];
    }

    return {
      valid: true,
      actualType,
      actualExtension,
      metadata: {
        duration: parseFloat(format.duration),
        bitrate: parseInt(format.bit_rate),
        streams: streams.length,
        hasVideo,
        hasAudio
      }
    };
  } catch (error: any) {
    return { 
      valid: false, 
      error: `Media validation failed: ${error.message}` 
    };
  }
}

/**
 * Validate any file by detecting its type and using appropriate validator
 * @param filePath - Path to file
 * @param expectedType - Expected file type for additional validation
 * @returns Validation result
 */
export async function validateFile(filePath: string, expectedType?: string): Promise<ValidationResult> {
  try {
    // Check if file exists and has content
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    // Read first few bytes to detect type
    const buffer = await fs.readFile(filePath, { encoding: null });
    const header = buffer.subarray(0, 20);
    
    // If expecting a specific type, be more strict
    if (expectedType === 'application/pdf') {
      if (!header.subarray(0, 4).toString('ascii').startsWith('%PDF')) {
        return { valid: false, error: 'Not a valid PDF file' };
      }
      return validatePDF(filePath);
    }
    
    // PDF magic bytes
    if (header.subarray(0, 4).toString('ascii') === '%PDF') {
      return validatePDF(filePath);
    }
    
    // Image magic bytes
    if (header[0] === 0xFF && header[1] === 0xD8) return validateImage(filePath); // JPEG
    if (header.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return validateImage(filePath); // PNG
    if (header.subarray(0, 3).toString('ascii') === 'GIF') return validateImage(filePath); // GIF
    if (header.subarray(0, 4).toString('ascii') === 'RIFF') return validateImage(filePath); // WebP
    
    // If we expected a PDF but didn't find one, be explicit
    if (expectedType === 'application/pdf') {
      return { valid: false, error: 'Not a valid PDF file' };
    }
    
    // Try media validation for other files
    return validateMedia(filePath);
    
  } catch (error: any) {
    return { 
      valid: false, 
      error: `File type detection failed: ${error.message}` 
    };
  }
}

/**
 * Log structured conversion information
 * @param operation - Conversion operation
 * @param input - Input file info
 * @param output - Output file info
 * @param options - Conversion options
 * @param result - Conversion result
 */
export function logConversion(
  operation: string,
  input: { filename: string; mime: string; size: number },
  output: { filename: string; mime: string; size?: number },
  options: any = {},
  result: { success: boolean; error?: string; duration?: number }
) {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    input: {
      filename: input.filename,
      mimeType: input.mime,
      detectedFormat: input.mime.split('/')[1] || 'unknown',
      sizeBytes: input.size
    },
    output: {
      filename: output.filename,
      mimeType: output.mime,
      targetFormat: output.mime.split('/')[1] || 'unknown',
      sizeBytes: output.size || 0
    },
    options,
    result: {
      success: result.success,
      error: result.error || null,
      durationMs: result.duration || 0
    }
  };
  
  if (result.success) {
    console.log('✅ CONVERSION SUCCESS:', JSON.stringify(logData, null, 2));
  } else {
    console.error('❌ CONVERSION FAILED:', JSON.stringify(logData, null, 2));
  }
}