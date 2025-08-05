#!/usr/bin/env python3
"""
FastAPI Server for File Conversion
Handles robust server-side file conversion for all major formats
"""

import os
import uuid
import mimetypes
from pathlib import Path
from typing import Optional, Dict, Any
import shutil

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Image processing
from PIL import Image, ImageOps
import pyheif

# PDF processing
import fitz  # PyMuPDF
from pdf2image import convert_from_bytes
import io

# Document processing
from docx import Document

# Video/Audio processing
import ffmpeg

app = FastAPI(title="FileFlow Converter", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("output")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Supported conversion mappings
SUPPORTED_CONVERSIONS = {
    "heic": ["jpg", "jpeg", "png", "webp"],
    "heif": ["jpg", "jpeg", "png", "webp"],
    "jpg": ["png", "webp", "pdf", "gif", "bmp", "tiff"],
    "jpeg": ["png", "webp", "pdf", "gif", "bmp", "tiff"],
    "png": ["jpg", "jpeg", "webp", "pdf", "gif", "bmp", "tiff"],
    "webp": ["jpg", "jpeg", "png", "pdf", "gif", "bmp", "tiff"],
    "gif": ["jpg", "jpeg", "png", "webp", "pdf"],
    "bmp": ["jpg", "jpeg", "png", "webp", "pdf"],
    "tiff": ["jpg", "jpeg", "png", "webp", "pdf"],
    "pdf": ["jpg", "jpeg", "png", "webp", "docx"],
    "mp4": ["mp3", "wav", "jpg", "png"],
    "avi": ["mp3", "wav", "jpg", "png"],
    "mov": ["mp3", "wav", "jpg", "png"],
    "mkv": ["mp3", "wav", "jpg", "png"],
    "mp3": ["wav", "m4a"],
    "wav": ["mp3", "m4a"],
    "flac": ["mp3", "wav"],
    "docx": ["pdf", "txt"],
}

class FileConverter:
    """Main file conversion class with robust error handling"""
    
    def __init__(self):
        self.temp_files = []
    
    def cleanup_temp_files(self):
        """Clean up temporary files"""
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                print(f"Warning: Could not remove temp file {temp_file}: {e}")
        self.temp_files.clear()
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get detailed file information"""
        file_stat = os.stat(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        
        return {
            "size": file_stat.st_size,
            "mime_type": mime_type,
            "extension": Path(file_path).suffix.lower().lstrip('.'),
        }
    
    def convert_heic_to_image(self, input_path: str, output_path: str, output_format: str) -> bool:
        """Convert HEIC/HEIF files to standard image formats"""
        try:
            # Read HEIC file
            heif_file = pyheif.read(input_path)
            
            # Convert to PIL Image
            image = Image.frombytes(
                heif_file.mode,
                heif_file.size,
                heif_file.data,
                "raw",
                heif_file.mode,
                heif_file.stride,
            )
            
            # Apply EXIF orientation if present
            image = ImageOps.exif_transpose(image)
            
            # Convert and save
            if output_format.lower() in ['jpg', 'jpeg']:
                # Convert to RGB for JPEG (remove alpha channel)
                if image.mode in ('RGBA', 'LA', 'P'):
                    rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'P':
                        image = image.convert('RGBA')
                    rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                    image = rgb_image
                image.save(output_path, 'JPEG', quality=92, optimize=True)
            else:
                image.save(output_path, output_format.upper(), optimize=True)
            
            return True
        except Exception as e:
            print(f"HEIC conversion error: {e}")
            return False
    
    def convert_image_to_image(self, input_path: str, output_path: str, output_format: str) -> bool:
        """Convert between standard image formats"""
        try:
            with Image.open(input_path) as image:
                # Apply EXIF orientation
                image = ImageOps.exif_transpose(image)
                
                if output_format.lower() in ['jpg', 'jpeg']:
                    # Convert to RGB for JPEG
                    if image.mode in ('RGBA', 'LA', 'P'):
                        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                        if image.mode == 'P':
                            image = image.convert('RGBA')
                        rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                        image = rgb_image
                    image.save(output_path, 'JPEG', quality=92, optimize=True)
                elif output_format.lower() == 'pdf':
                    # Convert to RGB for PDF
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    image.save(output_path, 'PDF', resolution=100.0)
                else:
                    image.save(output_path, output_format.upper(), optimize=True)
            
            return True
        except Exception as e:
            print(f"Image conversion error: {e}")
            return False
    
    def convert_pdf_to_image(self, input_path: str, output_path: str, output_format: str, page_num: int = 0) -> bool:
        """Convert PDF page to image using pdf2image"""
        try:
            # Use pdf2image for reliable conversion
            with open(input_path, 'rb') as pdf_file:
                pages = convert_from_bytes(pdf_file.read(), first_page=page_num + 1, last_page=page_num + 1, dpi=200)
                
                if pages:
                    image = pages[0]
                    
                    # Save in target format
                    if output_format.lower() in ['jpg', 'jpeg']:
                        # Convert to RGB for JPEG
                        if image.mode != 'RGB':
                            image = image.convert('RGB')
                        image.save(output_path, 'JPEG', quality=92, optimize=True)
                    else:
                        image.save(output_path, output_format.upper(), optimize=True)
                    
                    return True
            return False
        except Exception as e:
            print(f"PDF to image conversion error: {e}")
            return False
    
    def convert_video_to_audio(self, input_path: str, output_path: str, output_format: str) -> bool:
        """Convert video to audio using ffmpeg"""
        try:
            stream = ffmpeg.input(input_path)
            
            if output_format.lower() == 'mp3':
                stream = ffmpeg.output(stream, output_path, acodec='libmp3lame', audio_bitrate='192k')
            elif output_format.lower() == 'wav':
                stream = ffmpeg.output(stream, output_path, acodec='pcm_s16le')
            else:
                return False
            
            ffmpeg.run(stream, overwrite_output=True, quiet=True)
            return True
        except Exception as e:
            print(f"Video to audio conversion error: {e}")
            return False
    
    def convert_video_to_image(self, input_path: str, output_path: str, output_format: str) -> bool:
        """Extract frame from video as image"""
        try:
            stream = ffmpeg.input(input_path, ss=1)  # Extract frame at 1 second
            stream = ffmpeg.output(stream, output_path, vframes=1, format='image2')
            ffmpeg.run(stream, overwrite_output=True, quiet=True)
            return True
        except Exception as e:
            print(f"Video to image conversion error: {e}")
            return False
    
    def convert_audio_format(self, input_path: str, output_path: str, output_format: str) -> bool:
        """Convert between audio formats"""
        try:
            stream = ffmpeg.input(input_path)
            
            if output_format.lower() == 'mp3':
                stream = ffmpeg.output(stream, output_path, acodec='libmp3lame', audio_bitrate='192k')
            elif output_format.lower() == 'wav':
                stream = ffmpeg.output(stream, output_path, acodec='pcm_s16le')
            else:
                return False
            
            ffmpeg.run(stream, overwrite_output=True, quiet=True)
            return True
        except Exception as e:
            print(f"Audio conversion error: {e}")
            return False
    
    def convert_file(self, input_path: str, output_format: str) -> Optional[str]:
        """Main conversion method - routes to appropriate converter"""
        try:
            file_info = self.get_file_info(input_path)
            input_ext = file_info['extension']
            
            # Generate unique output filename
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = OUTPUT_DIR / output_filename
            
            success = False
            
            # Route to appropriate converter
            if input_ext in ['heic', 'heif']:
                success = self.convert_heic_to_image(input_path, str(output_path), output_format)
            elif input_ext in ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff']:
                success = self.convert_image_to_image(input_path, str(output_path), output_format)
            elif input_ext == 'pdf' and output_format in ['jpg', 'jpeg', 'png', 'webp']:
                success = self.convert_pdf_to_image(input_path, str(output_path), output_format)
            elif input_ext in ['mp4', 'avi', 'mov', 'mkv'] and output_format in ['mp3', 'wav']:
                success = self.convert_video_to_audio(input_path, str(output_path), output_format)
            elif input_ext in ['mp4', 'avi', 'mov', 'mkv'] and output_format in ['jpg', 'jpeg', 'png']:
                success = self.convert_video_to_image(input_path, str(output_path), output_format)
            elif input_ext in ['mp3', 'wav', 'flac'] and output_format in ['mp3', 'wav']:
                success = self.convert_audio_format(input_path, str(output_path), output_format)
            
            if success and os.path.exists(output_path):
                return str(output_path)
            else:
                # Clean up failed output file
                if os.path.exists(output_path):
                    os.remove(output_path)
                return None
                
        except Exception as e:
            print(f"Conversion error: {e}")
            return None

# Global converter instance
converter = FileConverter()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "FileFlow Converter API is running", "version": "1.0.0"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and analyze file"""
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix.lower()
        temp_filename = f"{file_id}{file_extension}"
        temp_path = UPLOAD_DIR / temp_filename
        
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file info
        file_info = converter.get_file_info(str(temp_path))
        file_extension_clean = file_extension.lstrip('.')
        
        # Check supported conversions
        supported_formats = SUPPORTED_CONVERSIONS.get(file_extension_clean, [])
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "size": file_info["size"],
            "mime_type": file_info["mime_type"],
            "extension": file_extension_clean,
            "supported_formats": supported_formats,
            "temp_path": str(temp_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/convert")
async def convert_file(
    file_id: str = Form(...),
    output_format: str = Form(...),
    temp_path: str = Form(...)
):
    """Convert uploaded file to target format"""
    try:
        # Validate input file exists
        if not os.path.exists(temp_path):
            raise HTTPException(status_code=404, detail="Upload file not found")
        
        # Validate output format
        input_ext = Path(temp_path).suffix.lower().lstrip('.')
        if input_ext not in SUPPORTED_CONVERSIONS:
            raise HTTPException(status_code=400, detail=f"Input format '{input_ext}' not supported")
        
        if output_format not in SUPPORTED_CONVERSIONS[input_ext]:
            raise HTTPException(status_code=400, detail=f"Cannot convert {input_ext} to {output_format}")
        
        # Perform conversion
        output_path = converter.convert_file(temp_path, output_format)
        
        if output_path and os.path.exists(output_path):
            # Clean up input file
            try:
                os.remove(temp_path)
            except:
                pass
            
            return {
                "success": True,
                "output_file": os.path.basename(output_path),
                "download_url": f"/download/{os.path.basename(output_path)}",
                "file_size": os.path.getsize(output_path)
            }
        else:
            # Clean up input file
            try:
                os.remove(temp_path)
            except:
                pass
            
            raise HTTPException(status_code=500, detail="Conversion failed")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download converted file"""
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/octet-stream'
    )

@app.get("/formats")
async def get_supported_formats():
    """Get all supported format conversions"""
    return {"supported_conversions": SUPPORTED_CONVERSIONS}

# Cleanup endpoint for maintenance
@app.post("/cleanup")
async def cleanup_files():
    """Clean up old temporary and output files"""
    try:
        # Clean up files older than 1 hour
        import time
        current_time = time.time()
        
        for directory in [UPLOAD_DIR, OUTPUT_DIR]:
            for file_path in directory.glob("*"):
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > 3600:  # 1 hour
                        file_path.unlink()
        
        return {"message": "Cleanup completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)