import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import multer, { type Multer } from "multer";
import fs from "fs";
import { spawn } from "child_process";
import { insertConversionSchema } from "@shared/schema";
import { storage } from "./storage";

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

// File cleanup utility
function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Cleaned up file:', filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', filePath, error);
  }
}

// Periodic cleanup function
function cleanupOldFiles(): void {
  const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
  
  [uploadsDir, outputDir].forEach(dir => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoffTime) {
          cleanupFile(filePath);
        }
      });
    } catch (error) {
      console.error('Error during periodic cleanup:', error);
    }
  });
}

// Run cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

// Input validation utilities
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic', '.heif'],
  'application/pdf': ['.pdf'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav']
};

const ALLOWED_OUTPUT_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'mp3', 'wav', 'docx'];

function validateFileType(file: Express.Multer.File): { valid: boolean; error?: string } {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  // Check if mime type is allowed
  if (!Object.keys(ALLOWED_MIME_TYPES).includes(mimeType)) {
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

// PDF conversion helper function
async function convertPDFWithPython(inputPath: string, outputPath: string, outputFormat: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pdfConverterPath = path.join(process.cwd(), 'server', 'pdf_converter.py');
    console.log('Running PDF conversion:', pdfConverterPath, inputPath, outputPath, outputFormat);
    
    const pythonProcess = spawn('python3', [pdfConverterPath, inputPath, outputPath, outputFormat]);
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      console.log('PDF Python process closed with code:', code);
      console.log('PDF Python output:', output);
      console.log('PDF Python error:', error);
      
      if (code === 0 && output.includes('SUCCESS')) {
        resolve(true);
      } else {
        console.error('PDF conversion error:', error || 'No error output');
        resolve(false);
      }
    });
  });
}

// Conversion helper function using Python with HEIC support
async function convertImageWithPython(inputPath: string, outputPath: string, outputFormat: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pythonScript = `
import sys
from PIL import Image, ImageOps
import os

def convert_heic_to_pil(input_path):
    """Convert HEIC/HEIF to PIL Image using pyheif"""
    try:
        import pyheif
        print(f"Reading HEIC file: {input_path}")
        heif_file = pyheif.read(input_path)
        print(f"HEIC file read successfully. Mode: {heif_file.mode}, Size: {heif_file.size}")
        img = Image.frombytes(
            heif_file.mode,
            heif_file.size,
            heif_file.data,
            "raw",
            heif_file.mode,
            heif_file.stride,
        )
        print("HEIC to PIL conversion successful")
        return img
    except ImportError as e:
        print(f"pyheif import error: {e}")
        # Fallback: try using pillow-heif
        try:
            from pillow_heif import register_heif_opener
            print("Using pillow-heif fallback")
            register_heif_opener()
            img = Image.open(input_path)
            print("pillow-heif conversion successful")
            return img
        except ImportError as e2:
            print(f"pillow-heif import error: {e2}")
            raise Exception(f"HEIC support requires pyheif or pillow-heif library. pyheif error: {e}, pillow-heif error: {e2}")
    except Exception as e:
        print(f"HEIC conversion error: {e}")
        raise Exception(f"Failed to convert HEIC file: {e}")

try:
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    output_format = sys.argv[3].upper()
    
    print(f"Starting conversion: {input_path} -> {output_path} ({output_format})")
    
    # Check if input file exists
    if not os.path.exists(input_path):
        raise Exception(f"Input file not found: {input_path}")
    
    # Check if input is HEIC/HEIF
    input_ext = os.path.splitext(input_path)[1].lower()
    print(f"Input file extension: {input_ext}")
    
    if input_ext in ['.heic', '.heif']:
        print("Processing HEIC/HEIF file")
        img = convert_heic_to_pil(input_path)
    else:
        print("Processing standard image file")
        img = Image.open(input_path)
    
    print(f"Image loaded. Mode: {img.mode}, Size: {img.size}")
    
    # Apply EXIF orientation
    img = ImageOps.exif_transpose(img)
    print("EXIF orientation applied")
    
    # Handle format conversion
    if output_format in ['JPG', 'JPEG']:
        print("Converting to JPEG")
        if img.mode in ('RGBA', 'LA', 'P'):
            print(f"Converting {img.mode} to RGB")
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            img = background
        img.save(output_path, 'JPEG', quality=85, optimize=True, progressive=True)
    elif output_format == 'PNG':
        print("Converting to PNG")
        img.save(output_path, 'PNG', optimize=True, compress_level=9)
    else:
        print(f"Converting to {output_format}")
        img.save(output_path, output_format, optimize=True)
    
    # Verify output file was created
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path)
        print(f"Conversion successful. Output file size: {file_size} bytes")
        print("SUCCESS")
    else:
        raise Exception("Output file was not created")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;

    const tempScriptPath = path.join(process.cwd(), 'temp_convert.py');
    fs.writeFileSync(tempScriptPath, pythonScript);

    console.log('Running Python conversion:', tempScriptPath, inputPath, outputPath, outputFormat);
    const pythonProcess = spawn('python3', [tempScriptPath, inputPath, outputPath, outputFormat], {
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
      console.log('Python process closed with code:', code);
      console.log('Python output:', output);
      console.log('Python error:', error);
      
      // Clean up temp script
      try {
        fs.unlinkSync(tempScriptPath);
      } catch {}

      if (code === 0 && output.includes('SUCCESS')) {
        resolve(true);
      } else {
        console.error('Python conversion error:', error || 'No error output');
        console.error('Python stdout:', output || 'No stdout');
        resolve(false);
      }
    });
  });
}

function getSupportedFormats(extension: string): string[] {
  const formatMap: Record<string, string[]> = {
    'jpg': ['png', 'webp', 'gif', 'bmp'],
    'jpeg': ['png', 'webp', 'gif', 'bmp'],
    'png': ['jpg', 'jpeg', 'webp', 'gif', 'bmp'],
    'webp': ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
    'gif': ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
    'bmp': ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    'tiff': ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    'heic': ['jpg', 'jpeg', 'png', 'webp'],
    'heif': ['jpg', 'jpeg', 'png', 'webp'],
    'pdf': ['jpg', 'jpeg', 'png', 'docx', 'txt']
  };
  return formatMap[extension.toLowerCase()] || [];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from client directory
  const clientPath = path.resolve(import.meta.dirname, "../client");
  app.use(express.static(clientPath));

  // File conversion API endpoints
  app.post('/api/upload', upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Additional file validation
      const validation = validateFileType(req.file);
      if (!validation.valid) {
        cleanupFile(req.file.path);
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
        cleanupFile(req.file.path);
      }
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post('/api/convert', async (req, res) => {
    let tempPath: string | null = null;
    let outputPath: string | null = null;
    
    try {
      console.log('Convert request body:', req.body);
      const { file_id, output_format, temp_path } = req.body;

      // Validate required parameters
      if (!file_id || !output_format || !temp_path) {
        return res.status(400).json({ error: "Missing required parameters: file_id, output_format, temp_path" });
      }

      // Validate output format
      const formatValidation = validateOutputFormat(output_format);
      if (!formatValidation.valid) {
        return res.status(400).json({ error: formatValidation.error });
      }

      tempPath = temp_path;

      // Security: Validate that temp_path is within uploads directory to prevent path traversal
      const normalizedTempPath = path.normalize(tempPath);
      const normalizedUploadsDir = path.normalize(uploadsDir);
      if (!normalizedTempPath.startsWith(normalizedUploadsDir)) {
        return res.status(400).json({ error: "Invalid file path" });
      }

      console.log('Checking file at path:', tempPath);
      if (!fs.existsSync(tempPath)) {
        console.log('Available files in uploads:', fs.readdirSync(uploadsDir));
        return res.status(404).json({ error: "Input file not found" });
      }

      // Generate output path
      const outputFilename = `${file_id}_converted.${output_format}`;
      outputPath = path.join(outputDir, outputFilename);

      // Determine conversion method based on file type
      const fileExtension = path.extname(tempPath).toLowerCase().substring(1);
      let success: boolean;
      
      if (fileExtension === 'pdf') {
        success = await convertPDFWithPython(tempPath, outputPath, output_format);
      } else {
        success = await convertImageWithPython(tempPath, outputPath, output_format);
      }

      if (success && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        res.json({
          success: true,
          output_file: outputFilename,
          download_url: `/api/download/${outputFilename}`,
          file_size: stats.size
        });
      } else {
        res.status(500).json({ error: "Conversion failed" });
      }
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({ error: "Conversion failed" });
    } finally {
      // Always clean up input file
      if (tempPath) {
        cleanupFile(tempPath);
      }
      // Clean up output file if conversion failed  
      if (outputPath && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        // If file is empty or very small, it likely failed
        if (stats.size < 100) {
          cleanupFile(outputPath);
        }
      }
    }
  });

  // Media conversion endpoint with validation
  app.post('/api/convert-media', (req, res) => {
    const { file_id, conversion_type, options = {} } = req.body;
    
    // Validate required parameters
    if (!file_id || !conversion_type) {
      return res.status(400).json({ error: "Missing required parameters: file_id, conversion_type" });
    }
    
    // Validate conversion type
    const allowedConversions = ['mp4-to-mp3', 'video-compress', 'audio-convert', 'video-trim', 'gif-make', 'video-merge'];
    if (!allowedConversions.includes(conversion_type)) {
      return res.status(400).json({ error: `Unsupported conversion type: ${conversion_type}` });
    }
    
    if (!file_id || !conversion_type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const tempPath = path.join(uploadsDir, file_id);
    
    if (!fs.existsSync(tempPath)) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    // Generate output filename with appropriate extension
    const outputExtension = getOutputExtension(conversion_type, options.format);
    const outputFile = `${file_id}_converted.${outputExtension}`;
    const outputPath = path.join(outputDir, outputFile);

    // Prepare Python command
    const pythonScript = path.join(process.cwd(), 'server', 'media_converter.py');
    const optionsJson = JSON.stringify(options);
    
    console.log(`Running media conversion: ${conversion_type}`);
    console.log(`Input: ${tempPath}, Output: ${outputPath}`);
    
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
          } else {
            res.status(500).json(result);
          }
        } catch (parseError) {
          res.status(500).json({ error: 'Failed to parse conversion result' });
        }
      } else {
        res.status(500).json({ error: error || 'Media conversion failed' });
      }
    });
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

  app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(outputDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: "Download failed" });
      }
    });
  });

  // API Routes for database operations
  app.post('/api/conversions', async (req, res) => {
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

  // Fallback to index.html for other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  const httpServer = createServer(app);
  return httpServer;
}
