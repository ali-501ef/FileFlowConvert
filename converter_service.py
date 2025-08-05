#!/usr/bin/env python3
"""
Simple File Conversion Service
Robust server-side file conversion using Python
"""

import os
import uuid
import mimetypes
from pathlib import Path
import shutil
import tempfile

from PIL import Image, ImageOps
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="FileFlow Converter Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = Path("temp_uploads")
OUTPUT_DIR = Path("temp_output")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

class SimpleConverter:
    """Simple, reliable file converter focusing on core functionality"""
    
    @staticmethod
    def convert_image_format(input_path: str, output_path: str, target_format: str) -> bool:
        """Convert image between formats using PIL"""
        try:
            with Image.open(input_path) as img:
                # Apply EXIF orientation
                img = ImageOps.exif_transpose(img)
                
                # Handle format-specific conversions
                if target_format.lower() in ['jpg', 'jpeg']:
                    # Convert to RGB for JPEG
                    if img.mode in ('RGBA', 'LA', 'P'):
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        if img.mode == 'RGBA':
                            background.paste(img, mask=img.split()[-1])
                        img = background
                    img.save(output_path, 'JPEG', quality=92, optimize=True)
                elif target_format.lower() == 'png':
                    img.save(output_path, 'PNG', optimize=True)
                elif target_format.lower() == 'webp':
                    img.save(output_path, 'WebP', quality=92, optimize=True)
                else:
                    img.save(output_path, target_format.upper())
                
                return True
        except Exception as e:
            print(f"Image conversion error: {e}")
            return False
    
    @staticmethod
    def get_supported_formats(file_extension: str) -> list:
        """Get supported output formats for input file type"""
        format_map = {
            'jpg': ['png', 'webp', 'gif', 'bmp'],
            'jpeg': ['png', 'webp', 'gif', 'bmp'],
            'png': ['jpg', 'jpeg', 'webp', 'gif', 'bmp'],
            'webp': ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
            'gif': ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
            'bmp': ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            'tiff': ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        }
        return format_map.get(file_extension.lower(), [])

converter = SimpleConverter()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FileFlow Converter"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and analyze file for conversion"""
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_ext = Path(file.filename).suffix.lower()
        temp_filename = f"{file_id}{file_ext}"
        temp_path = UPLOAD_DIR / temp_filename
        
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Get file info
        file_size = len(content)
        mime_type, _ = mimetypes.guess_type(file.filename)
        extension = file_ext.lstrip('.')
        
        # Get supported formats
        supported_formats = converter.get_supported_formats(extension)
        
        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "size": file_size,
            "mime_type": mime_type,
            "extension": extension,
            "supported_formats": supported_formats,
            "temp_path": str(temp_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/convert")
async def convert_file(
    file_id: str = Form(...),
    output_format: str = Form(...),
    temp_path: str = Form(...)
):
    """Convert file to target format"""
    try:
        # Validate input
        if not os.path.exists(temp_path):
            raise HTTPException(status_code=404, detail="Input file not found")
        
        # Generate output file path
        output_filename = f"{file_id}_converted.{output_format}"
        output_path = OUTPUT_DIR / output_filename
        
        # Perform conversion
        success = converter.convert_image_format(temp_path, str(output_path), output_format)
        
        # Clean up input file
        try:
            os.remove(temp_path)
        except:
            pass
        
        if success and output_path.exists():
            return {
                "success": True,
                "output_file": output_filename,
                "download_url": f"/api/download/{output_filename}",
                "file_size": output_path.stat().st_size
            }
        else:
            raise HTTPException(status_code=500, detail="Conversion failed")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

@app.get("/api/download/{filename}")
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

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=False)