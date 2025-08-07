import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import multer, { type Multer } from "multer";
import fs from "fs";
import { promisify } from "util";
import { spawn } from "child_process";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { insertConversionSchema } from "@shared/schema";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { PDFConverter } from "./pdf-converter";
import { formatOutputFilename, generateUniqueFilename } from "./utils/filename";
import { validateFile, logConversion } from "./utils/validate";

// Track active conversions to prevent duplicates
const activeConversions = new Map<string, { timestamp: number; promise: Promise<any> }>();

// Initialize PDF converter
const pdfConverter = new PDFConverter();

// File operation semaphore to control concurrent file operations
class FileSemaphore {
  private running: number = 0;
  private readonly maxConcurrent: number;
  private readonly queue: Array<() => void> = [];

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const fileSemaphore = new FileSemaphore(3); // Allow max 3 concurrent file operations

// Generate unique output filename with timestamp and UUID
function generateUniqueOutputFilename(fileId: string, outputFormat: string): string {
  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8); // Use first 8 chars of UUID
  return `${fileId}_${timestamp}_${uuid}.${outputFormat}`;
}

// Atomic file operation wrapper
async function atomicFileOperation<T>(operation: () => Promise<T>): Promise<T> {
  await fileSemaphore.acquire();
  try {
    return await operation();
  } finally {
    fileSemaphore.release();
  }
}

// Generate unique key for conversion tracking
function getConversionKey(fileId: string, outputFormat: string): string {
  return `${fileId}_${outputFormat}`;
}

// Check if conversion is already in progress
function isConversionActive(fileId: string, outputFormat: string): boolean {
  const key = getConversionKey(fileId, outputFormat);
  const active = activeConversions.get(key);
  
  if (!active) return false;
  
  // Clean up stale entries (older than 5 minutes)
  const STALE_TIMEOUT = 5 * 60 * 1000;
  if (Date.now() - active.timestamp > STALE_TIMEOUT) {
    activeConversions.delete(key);
    return false;
  }
  
  return true;
}

// Track a new conversion
function trackConversion(fileId: string, outputFormat: string, promise: Promise<any>): void {
  const key = getConversionKey(fileId, outputFormat);
  activeConversions.set(key, {
    timestamp: Date.now(),
    promise
  });
  
  // Auto-cleanup when promise resolves/rejects
  promise.finally(() => {
    activeConversions.delete(key);
  });
}

// Promisify fs functions for async usage
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

// Extended Request interface for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
const outputDir = path.join(process.cwd(), 'output');

// Ensure directories exist
[uploadsDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Async file cleanup utility with concurrency control
async function cleanupFile(filePath: string): Promise<void> {
  return atomicFileOperation(async () => {
    try {
      await access(filePath, fs.constants.F_OK);
      await unlink(filePath);
      console.log('Cleaned up file:', filePath);
    } catch (error) {
      // File doesn't exist or couldn't be deleted - this is often acceptable
      if ((error as any).code !== 'ENOENT') {
        console.error('Error cleaning up file:', filePath, error);
      }
    }
  });
}

// Sync cleanup for backwards compatibility
function cleanupFileSync(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Cleaned up file:', filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', filePath, error);
  }
}

// Async periodic cleanup function with concurrency control
async function cleanupOldFiles(): Promise<void> {
  const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
  console.log('Starting periodic cleanup of old files...');
  
  for (const dir of [uploadsDir, outputDir]) {
    try {
      const files = await atomicFileOperation(async () => {
        return await readdir(dir);
      });
      
      console.log(`Checking ${files.length} files in ${dir} for cleanup`);
      
      // Process files in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.allSettled(batch.map(async (file) => {
          try {
            const filePath = path.join(dir, file);
            const stats = await stat(filePath);
            if (stats.mtimeMs < cutoffTime) {
              console.log(`Cleaning up old file: ${file} (${new Date(stats.mtimeMs).toISOString()})`);
              await cleanupFile(filePath);
            }
          } catch (error) {
            console.error('Error cleaning individual file:', file, error);
          }
        }));
      }
    } catch (error) {
      console.error('Error during periodic cleanup in directory:', dir, error);
    }
  }
  
  console.log('Periodic cleanup completed');
}

// Run cleanup every hour
setInterval(() => {
  cleanupOldFiles().catch(error => {
    console.error('Error in periodic cleanup:', error);
  });
}, 60 * 60 * 1000);

// Input validation utilities
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic', '.heif'],
  'image/heif': ['.heic', '.heif'],
  'image/x-heic': ['.heic', '.heif'],
  'image/x-heif': ['.heic', '.heif'],
  'image/avif': ['.heic', '.heif'],
  'application/pdf': ['.pdf'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav']
};

const ALLOWED_OUTPUT_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'mp3', 'wav', 'docx'];

function validateFileType(file: Express.Multer.File): { valid: boolean; error?: string } {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  // Special handling for HEIC files which often have incorrect MIME types
  if (extension === '.heic' || extension === '.heif') {
    // Accept HEIC files regardless of MIME type reported by browser
    console.log(`HEIC file detected: ${file.originalname}, MIME: ${mimeType}`);
    return { valid: true };
  }
  
  // Check if mime type is allowed
  if (!Object.keys(ALLOWED_MIME_TYPES).includes(mimeType)) {
    // Fallback: check if extension is supported even if MIME type is wrong
    const allSupportedExtensions = Object.values(ALLOWED_MIME_TYPES).flat();
    if (allSupportedExtensions.includes(extension)) {
      console.log(`File accepted based on extension: ${extension}, MIME: ${mimeType}`);
      return { valid: true };
    }
    return { valid: false, error: `Unsupported file type: ${mimeType}` };
  }
  
  // Check if extension matches mime type
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: `File extension ${extension} doesn't match mime type ${mimeType}` };
  }
  
  return { valid: true };
}

function validateOutputFormat(format: string): { valid: boolean; error?: string } {
  if (!format || typeof format !== 'string') {
    return { valid: false, error: 'Output format is required' };
  }
  
  const normalizedFormat = format.toLowerCase().trim();
  if (!ALLOWED_OUTPUT_FORMATS.includes(normalizedFormat)) {
    return { valid: false, error: `Unsupported output format: ${format}` };
  }
  
  return { valid: true };
}

const storage_multer = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, uploadsDir);
  },
  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only allow 1 file at a time
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
    const validation = validateFileType(file);
    if (!validation.valid) {
      return cb(new Error(validation.error), false);
    }
    cb(null, true);
  }
});

// PDF conversion helper function with retry logic and better error handling
async function convertPDFWithPython(inputPath: string, outputPath: string, outputFormat: string, maxRetries: number = 3): Promise<boolean> {
  const pdfConverterPath = path.join(process.cwd(), 'server', 'pdf_converter.py');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`PDF conversion attempt ${attempt}/${maxRetries}:`, inputPath, '->', outputPath, `(${outputFormat})`);
    
    try {
      const success = await new Promise<boolean>((resolve, reject) => {
        const pythonProcess = spawn('python3', [pdfConverterPath, inputPath, outputPath, outputFormat], {
          timeout: 120000, // 2 minute timeout
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          console.log(`PDF conversion attempt ${attempt} closed with code:`, code);
          if (output) console.log('PDF output:', output.trim());
          if (error) console.log('PDF error:', error.trim());
          
          if (code === 0 && output.includes('SUCCESS')) {
            resolve(true);
          } else {
            reject(new Error(`PDF conversion failed (code ${code}): ${error || 'No error output'}`));
          }
        });
        
        pythonProcess.on('error', (err) => {
          reject(new Error(`PDF process error: ${err.message}`));
        });
      });
      
      if (success) {
        console.log(`PDF conversion succeeded on attempt ${attempt}`);
        return true;
      }
    } catch (error) {
      console.error(`PDF conversion attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries) {
        console.error('PDF conversion failed after all retry attempts');
        return false;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`Retrying PDF conversion in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

// Image conversion helper function with retry logic and better error handling
async function convertImageWithPython(inputPath: string, outputPath: string, outputFormat: string, maxRetries: number = 3): Promise<boolean> {
  const imageConverterPath = path.join(process.cwd(), 'server', 'image_converter.py');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Image conversion attempt ${attempt}/${maxRetries}:`, inputPath, '->', outputPath, `(${outputFormat})`);
    
    try {
      const success = await new Promise<boolean>((resolve, reject) => {
        const pythonProcess = spawn('python3', [imageConverterPath, inputPath, outputPath, outputFormat], {
          timeout: 60000, // 1 minute timeout
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          console.log(`Image conversion attempt ${attempt} closed with code:`, code);
          if (output) console.log('Image output:', output.trim());
          if (error) console.log('Image error:', error.trim());
          
          if (code === 0 && output.includes('SUCCESS')) {
            resolve(true);
          } else {
            reject(new Error(`Image conversion failed (code ${code}): ${error || 'No error output'}`));
          }
        });
        
        pythonProcess.on('error', (err) => {
          reject(new Error(`Image process error: ${err.message}`));
        });
      });
      
      if (success) {
        console.log(`Image conversion succeeded on attempt ${attempt}`);
        return true;
      }
    } catch (error) {
      console.error(`Image conversion attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries) {
        console.error('Image conversion failed after all retry attempts');
        return false;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`Retrying image conversion in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

function getSupportedFormats(extension: string): string[] {
  const formatMap: Record<string, string[]> = {
    'jpg': ['png', 'webp', 'gif', 'bmp', 'tiff'],
    'jpeg': ['png', 'webp', 'gif', 'bmp', 'tiff'],
    'png': ['jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'],
    'webp': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
    'gif': ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'],
    'bmp': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff'],
    'tiff': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
    'heic': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
    'heif': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
    'pdf': ['jpg', 'jpeg', 'png', 'docx', 'txt']
  };
  return formatMap[extension.toLowerCase()] || [];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiting middleware
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 upload requests per windowMs
    message: {
      error: "Too many uploads from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  const conversionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 30, // Limit each IP to 30 conversion requests per windowMs
    message: {
      error: "Too many conversion requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Slow down middleware for repeated requests
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 10, // Allow 10 requests per windowMs without delay
    delayMs: () => 500, // Add 500ms delay per request after delayAfter (fixed for v2)
    maxDelayMs: 10000, // Maximum delay of 10 seconds
  });
  
  // Serve static files from client directory
  const clientPath = path.resolve(import.meta.dirname, "../client");
  app.use(express.static(clientPath));

  // File conversion API endpoints
  app.post('/api/upload', uploadLimiter, speedLimiter, upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Additional file validation
      const validation = validateFileType(req.file);
      if (!validation.valid) {
        cleanupFileSync(req.file.path);
        return res.status(400).json({ error: validation.error });
      }

      const fileExtension = path.extname(req.file.originalname).toLowerCase().substring(1);
      console.log('File extension detected:', fileExtension);
      const supportedFormats = getSupportedFormats(fileExtension);
      console.log('Supported formats for', fileExtension, ':', supportedFormats);

      res.json({
        success: true,
        file_id: req.file.filename,
        filename: req.file.originalname,
        size: req.file.size,
        extension: fileExtension,
        supported_formats: supportedFormats,
        temp_path: req.file.path
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (req.file) {
        cleanupFileSync(req.file.path);
      }
      res.status(500).json({ 
        error: "Upload failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post('/api/convert', conversionLimiter, speedLimiter, async (req, res) => {
    let tempPath: string | null = null;
    let outputPath: string | null = null;
    
    try {
      console.log('Convert request body:', req.body);
      const { file_id, output_format, temp_path } = req.body;

      // Validate required parameters
      if (!file_id || !output_format || !temp_path) {
        return res.status(400).json({ error: "Missing required parameters: file_id, output_format, temp_path" });
      }

      // Check for duplicate conversion requests
      if (isConversionActive(file_id, output_format)) {
        return res.status(429).json({ 
          error: "Conversion already in progress for this file and format",
          message: "Please wait for the current conversion to complete before starting a new one."
        });
      }

      // Validate output format
      const formatValidation = validateOutputFormat(output_format);
      if (!formatValidation.valid) {
        return res.status(400).json({ error: formatValidation.error });
      }

      tempPath = temp_path;
      
      if (!tempPath) {
        return res.status(400).json({ error: "Invalid temp_path" });
      }

      // Security: Validate that temp_path is within uploads directory to prevent path traversal
      const normalizedTempPath = path.normalize(tempPath);
      const normalizedUploadsDir = path.normalize(uploadsDir);
      if (!normalizedTempPath.startsWith(normalizedUploadsDir)) {
        return res.status(400).json({ error: "Invalid file path" });
      }

      console.log('Checking file at path:', tempPath);
      try {
        await access(tempPath, fs.constants.F_OK);
      } catch {
        console.log('Available files in uploads:', await readdir(uploadsDir));
        return res.status(404).json({ error: "Input file not found" });
      }

      // Generate unique output path to prevent conflicts
      const outputFilename = generateUniqueOutputFilename(file_id, output_format);
      outputPath = path.join(outputDir, outputFilename);

      // Determine conversion method based on file type
      const fileExtension = path.extname(tempPath).toLowerCase().substring(1);
      
      // Create conversion promise and track it
      const conversionPromise = (async () => {
        if (fileExtension === 'pdf') {
          return await convertPDFWithPython(tempPath, outputPath, output_format);
        } else {
          return await convertImageWithPython(tempPath, outputPath, output_format);
        }
      })();
      
      // Track this conversion to prevent duplicates
      trackConversion(file_id, output_format, conversionPromise);
      
      // Await the conversion result
      const success = await conversionPromise;

      try {
        await access(outputPath, fs.constants.F_OK);
        const stats = await stat(outputPath);
        if (success && stats.size > 100) { // Ensure file has content
          // Only cleanup input file after successful conversion
          if (tempPath) {
            await cleanupFile(tempPath);
          }
          res.json({
            success: true,
            output_file: outputFilename,
            download_url: `/api/download/${outputFilename}`,
            file_size: stats.size
          });
        } else {
          // Clean up failed conversion and input file concurrently
          await Promise.allSettled([
            cleanupFile(outputPath),
            tempPath ? cleanupFile(tempPath) : Promise.resolve()
          ]);
          res.status(500).json({ error: "Conversion failed - output file is empty or invalid" });
        }
      } catch {
        // Cleanup input file on conversion failure
        if (tempPath) {
          await cleanupFile(tempPath);
        }
        res.status(500).json({ error: "Conversion failed - output file not found" });
      }
    } catch (error) {
      console.error('Conversion error:', error);
      // Cleanup input file on error
      if (tempPath) {
        await cleanupFile(tempPath);
      }
      res.status(500).json({ error: "Conversion failed" });
    }
  });

  // Media conversion endpoint with validation
  app.post('/api/convert-media', conversionLimiter, speedLimiter, (req, res) => {
    const { file_id, conversion_type, options = {} } = req.body;
    
    // Validate required parameters
    if (!file_id || !conversion_type) {
      return res.status(400).json({ error: "Missing required parameters: file_id, conversion_type" });
    }
    
    // Check for duplicate conversion requests
    if (isConversionActive(file_id, conversion_type)) {
      return res.status(429).json({ 
        error: "Media conversion already in progress for this file and type",
        message: "Please wait for the current conversion to complete before starting a new one."
      });
    }
    
    // Validate conversion type
    const allowedConversions = ['mp4-to-mp3', 'video-compress', 'audio-convert', 'video-trim', 'gif-make', 'video-merge'];
    if (!allowedConversions.includes(conversion_type)) {
      return res.status(400).json({ error: `Unsupported conversion type: ${conversion_type}` });
    }

    const tempPath = path.join(uploadsDir, file_id);
    
    if (!fs.existsSync(tempPath)) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    // Generate unique output filename with appropriate extension
    const outputExtension = getOutputExtension(conversion_type, options.format);
    const outputFile = generateUniqueOutputFilename(file_id, outputExtension);
    const outputPath = path.join(outputDir, outputFile);

    // Prepare Python command
    const pythonScript = path.join(process.cwd(), 'server', 'media_converter.py');
    const optionsJson = JSON.stringify(options);
    
    console.log(`Running media conversion: ${conversion_type}`);
    console.log(`Input: ${tempPath}, Output: ${outputPath}`);
    
    // Create media conversion promise and track it
    const conversionPromise = new Promise<void>((resolve, reject) => {
      const pythonProcess = spawn('python3', [pythonScript, tempPath, outputPath, conversion_type, optionsJson]);
      
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        console.log(`Media conversion process closed with code: ${code}`);
        console.log('Python output:', output);
        console.log('Python error:', error);
        
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            if (result.success) {
              const stats = fs.statSync(outputPath);
              res.json({
                success: true,
                output_file: outputFile,
                download_url: `/api/download/${outputFile}`,
                file_size: stats.size,
                ...result
              });
              resolve();
            } else {
              res.status(500).json(result);
              reject(new Error('Conversion failed'));
            }
          } catch (parseError) {
            res.status(500).json({ error: 'Failed to parse conversion result' });
            reject(parseError);
          }
        } else {
          res.status(500).json({ error: error || 'Media conversion failed' });
          reject(new Error('Media conversion failed'));
        }
      });
    });
    
    // Track this conversion to prevent duplicates
    trackConversion(file_id, conversion_type, conversionPromise);
  });

  function getOutputExtension(conversionType: string, format?: string): string {
    switch (conversionType) {
      case 'video_compress':
        return format || 'mp4';
      case 'video_to_audio':
        return format || 'mp3';
      case 'audio_convert':
        return format || 'mp3';
      case 'video_trim':
        return 'mp4';
      case 'video_to_gif':
        return 'gif';
      default:
        return 'mp4';
    }
  }

  app.get('/api/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(outputDir, filename);

    try {
      // Use atomic operation to check file existence
      await atomicFileOperation(async () => {
        await access(filePath, fs.constants.F_OK);
      });

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Download failed" });
          }
        }
      });
    } catch {
      res.status(404).json({ error: "File not found" });
    }
  });

  // API Routes for database operations
  app.post('/api/conversions', conversionLimiter, async (req, res) => {
    try {
      const conversionData = insertConversionSchema.parse(req.body);
      const conversion = await storage.createConversion(conversionData);
      res.status(201).json(conversion);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid conversion data", details: error.errors });
      }
      console.error("Error tracking conversion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getConversionStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Handle HTML routes for clean URLs
  app.get('/heic-to-jpg', (req, res) => {
    res.sendFile(path.join(clientPath, 'heic-to-jpg.html'));
  });

  app.get('/jpg-to-png', (req, res) => {
    res.sendFile(path.join(clientPath, 'jpg-to-png.html'));
  });

  app.get('/pdf-merge', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-merge.html'));
  });

  app.get('/pdf-split', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-split.html'));
  });

  app.get('/mp4-to-mp3', (req, res) => {
    res.sendFile(path.join(clientPath, 'mp4-to-mp3.html'));
  });

  app.get('/video-compress', (req, res) => {
    res.sendFile(path.join(clientPath, 'video-compress.html'));
  });

  app.get('/audio-converter', (req, res) => {
    res.sendFile(path.join(clientPath, 'audio-converter.html'));
  });

  app.get('/pdf-compress', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-compress.html'));
  });

  app.get('/pdf-to-word', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-to-word.html'));
  });

  app.get('/video-trim', (req, res) => {
    res.sendFile(path.join(clientPath, 'video-trim.html'));
  });

  app.get('/gif-maker', (req, res) => {
    res.sendFile(path.join(clientPath, 'gif-maker.html'));
  });

  app.get('/video-merger', (req, res) => {
    res.sendFile(path.join(clientPath, 'video-merger.html'));
  });

  app.get('/pdf-rotate', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-rotate.html'));
  });

  app.get('/pdf-watermark', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-watermark.html'));
  });

  app.get('/convert-to-jpeg', (req, res) => {
    res.sendFile(path.join(clientPath, 'convert-to-jpeg.html'));
  });

  // PDF to JPG conversion API endpoints
  app.post('/api/pdf-to-jpg/upload', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      
      // Validate PDF using shared utility
      const validation = await validateFile(filePath, 'application/pdf');
      if (!validation.valid) {
        // Clean up invalid file
        try {
          await fs.promises.unlink(filePath);
        } catch {}
        
        // Return appropriate error message
        let errorMessage = validation.error || 'File validation failed';
        if (errorMessage.includes('password-protected')) {
          errorMessage = 'This PDF is password-protected. Please decrypt it and try again.';
        } else if (errorMessage.includes('Not a valid PDF')) {
          errorMessage = "That file isn't a valid PDF. Please upload a .pdf file.";
        }
        
        return res.status(400).json({ error: errorMessage });
      }

      // Store file info for conversion
      const fileId = randomUUID();
      const fileInfo = {
        id: fileId,
        originalName: req.file.originalname,
        path: filePath,
        uploadTime: Date.now(),
        actualType: validation.actualType,
        metadata: validation.metadata
      };

      // Store in memory (you could use a database here)
      activeConversions.set(fileId, {
        timestamp: Date.now(),
        promise: Promise.resolve(fileInfo)
      });

      // Log successful upload
      logConversion('pdf-to-jpg-upload', {
        filename: req.file.originalname,
        mime: validation.actualType || req.file.mimetype,
        size: req.file.size
      }, {
        filename: fileId,
        mime: validation.actualType || req.file.mimetype,
        size: req.file.size
      }, {}, {
        success: true,
        duration: Date.now() - startTime
      });

      res.json({ 
        success: true, 
        fileId: fileId,
        originalName: req.file.originalname,
        actualType: validation.actualType
      });

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      // Log failed upload
      logConversion('pdf-to-jpg-upload', {
        filename: req.file?.originalname || 'unknown',
        mime: req.file?.mimetype || 'unknown',
        size: req.file?.size || 0
      }, {
        filename: 'failed',
        mime: 'unknown',
        size: 0
      }, {}, {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      });
      
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.post('/api/pdf-to-jpg/convert', async (req, res) => {
    try {
      const { fileId, options = {} } = req.body;
      
      if (!fileId || !activeConversions.has(fileId)) {
        return res.status(400).json({ error: 'Invalid or expired file ID' });
      }

      const conversionData = activeConversions.get(fileId)!;
      const fileInfo = await conversionData.promise;

      // Parse conversion options
      const conversionOptions: any = {};
      if (options.dpi) conversionOptions.dpi = parseInt(options.dpi);
      if (options.quality) conversionOptions.quality = options.quality;
      if (options.pageRange) {
        conversionOptions.pageRange = {};
        if (options.pageRange.first) conversionOptions.pageRange.first = parseInt(options.pageRange.first);
        if (options.pageRange.last) conversionOptions.pageRange.last = parseInt(options.pageRange.last);
      }

      // Convert PDF with original filename for proper logging
      const result = await pdfConverter.convertPDFToJPG(fileInfo.path, conversionOptions, fileInfo.originalName);
      
      if (!result.success) {
        // Clean up
        try {
          await fs.promises.unlink(fileInfo.path);
        } catch {}
        activeConversions.delete(fileId);
        return res.status(500).json({ error: result.error });
      }

      let downloadPath = '';
      let filename = '';

      if (result.isMultiPage) {
        // Create ZIP file
        const zipPath = path.join(process.cwd(), 'uploads', 'temp', `${fileId}.zip`);
        await pdfConverter.createZip(result.files, zipPath);
        
        downloadPath = zipPath;
        filename = pdfConverter.generateOutputFilename(fileInfo.originalName, true);
        
        // Clean up individual JPG files
        await pdfConverter.cleanupFiles(result.files);
      } else {
        downloadPath = result.files[0];
        filename = pdfConverter.generateOutputFilename(fileInfo.originalName, false);
      }

      // Update conversion data with download info
      activeConversions.set(fileId, {
        timestamp: Date.now(),
        promise: Promise.resolve({
          ...fileInfo,
          downloadPath,
          filename,
          isMultiPage: result.isMultiPage
        })
      });

      res.json({
        success: true,
        filename,
        isMultiPage: result.isMultiPage,
        downloadUrl: `/api/pdf-to-jpg/download/${fileId}`
      });

    } catch (error: any) {
      console.error('Conversion error:', error);
      res.status(500).json({ error: 'Conversion failed' });
    }
  });

  app.get('/api/pdf-to-jpg/download/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      
      if (!activeConversions.has(fileId)) {
        return res.status(404).json({ error: 'File not found or expired' });
      }

      const conversionData = activeConversions.get(fileId)!;
      const fileInfo = await conversionData.promise;

      if (!fileInfo.downloadPath || !fs.existsSync(fileInfo.downloadPath)) {
        return res.status(404).json({ error: 'Download file not found' });
      }

      // Set appropriate headers with validated content type
      const contentType = fileInfo.isMultiPage ? 'application/zip' : 'image/jpeg';
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
      res.setHeader('Content-Type', contentType);
      
      console.log(`📥 Serving download: ${fileInfo.filename} (${contentType})`);

      // Stream file
      const fileStream = fs.createReadStream(fileInfo.downloadPath);
      fileStream.pipe(res);

      // Cleanup after download
      fileStream.on('end', async () => {
        try {
          await fs.promises.unlink(fileInfo.path); // Original PDF
          await fs.promises.unlink(fileInfo.downloadPath); // Converted file
          activeConversions.delete(fileId);
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      });

    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // Fallback to index.html for other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  const httpServer = createServer(app);
  return httpServer;
}
