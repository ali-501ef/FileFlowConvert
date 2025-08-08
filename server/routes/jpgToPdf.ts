import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { jpgToPdfController } from '../controllers/jpgToPdf';

const router = express.Router();

// Configure multer for multiple image uploads
const uploadsDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 100 // Allow up to 100 files as per spec
  },
  fileFilter: (req, file, cb) => {
    // Accept JPG/JPEG/PNG/WEBP/TIFF/BMP files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'];
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp'];
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files (JPG, PNG, WEBP, TIFF, BMP) are supported. Got: ${file.mimetype}`));
    }
  }
});

// JPG to PDF conversion endpoint
router.post('/convert/jpg-to-pdf', upload.array('images', 100), jpgToPdfController.convert);

export { router as jpgToPdfRouter };