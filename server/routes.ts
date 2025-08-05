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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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
        heif_file = pyheif.read(input_path)
        img = Image.frombytes(
            heif_file.mode,
            heif_file.size,
            heif_file.data,
            "raw",
            heif_file.mode,
            heif_file.stride,
        )
        return img
    except ImportError:
        # Fallback: try using pillow-heif
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
            return Image.open(input_path)
        except ImportError:
            raise Exception("HEIC support requires pyheif or pillow-heif library")

try:
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    output_format = sys.argv[3].upper()
    
    # Check if input is HEIC/HEIF
    input_ext = os.path.splitext(input_path)[1].lower()
    if input_ext in ['.heic', '.heif']:
        img = convert_heic_to_pil(input_path)
    else:
        img = Image.open(input_path)
    
    # Apply EXIF orientation
    img = ImageOps.exif_transpose(img)
    
    # Handle format conversion
    if output_format in ['JPG', 'JPEG']:
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            img = background
        img.save(output_path, 'JPEG', quality=92, optimize=True)
    else:
        img.save(output_path, output_format, optimize=True)
    
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
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
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post('/api/convert', async (req, res) => {
    try {
      console.log('Convert request body:', req.body);
      const { file_id, output_format, temp_path } = req.body;

      if (!temp_path) {
        return res.status(400).json({ error: "Missing temp_path parameter" });
      }

      console.log('Checking file at path:', temp_path);
      if (!fs.existsSync(temp_path)) {
        console.log('Available files in uploads:', fs.readdirSync(uploadsDir));
        return res.status(404).json({ error: "Input file not found" });
      }

      // Generate output path
      const outputFilename = `${file_id}_converted.${output_format}`;
      const outputPath = path.join(outputDir, outputFilename);

      // Perform conversion
      const success = await convertImageWithPython(temp_path, outputPath, output_format);

      // Clean up input file
      try {
        fs.unlinkSync(temp_path);
      } catch {}

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
    }
  });

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
