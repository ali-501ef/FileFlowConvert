#!/usr/bin/env python3
"""
JPG to PDF Conversion Service
Handles robust JPG/JPEG to PDF conversion with detailed logging and validation
"""

import sys
import os
import json
from pathlib import Path
from PIL import Image, ExifTags
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter, legal, A3
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_image_metadata(image_path: str) -> dict:
    """Extract detailed image metadata for debug logging"""
    try:
        with Image.open(image_path) as img:
            # Get basic image properties
            metadata = {
                "format": img.format,
                "mode": img.mode,
                "size": img.size,
                "width": img.size[0],
                "height": img.size[1],
                "has_transparency": img.mode in ('RGBA', 'LA') or 'transparency' in img.info
            }
            
            # Get DPI information
            dpi = img.info.get('dpi')
            if dpi:
                metadata["dpi"] = dpi
            else:
                # Try to get from EXIF data
                try:
                    exif = img.getexif()
                    if exif:
                        for tag, value in exif.items():
                            tag_name = ExifTags.TAGS.get(tag, tag)
                            if tag_name == 'XResolution':
                                metadata["dpi_x"] = value
                            elif tag_name == 'YResolution':  
                                metadata["dpi_y"] = value
                except Exception:
                    # EXIF not available, skip DPI extraction
                    pass
                                
            # Get file size
            metadata["file_size_bytes"] = os.path.getsize(image_path)
            metadata["file_size_mb"] = round(metadata["file_size_bytes"] / (1024 * 1024), 2)
            
            return metadata
    except Exception as e:
        logger.error(f"Failed to get image metadata: {e}")
        return {"error": str(e)}


def validate_pdf_structure(pdf_path: str) -> dict:
    """Validate PDF structure and return detailed validation info"""
    try:
        # Read first few bytes to check PDF header
        with open(pdf_path, 'rb') as f:
            header = f.read(8)
            if not header.startswith(b'%PDF-'):
                return {"valid": False, "error": "Missing %PDF- header"}
            
            # Check file size
            file_size = os.path.getsize(pdf_path)
            if file_size < 100:  # PDFs should be at least 100 bytes
                return {"valid": False, "error": f"PDF too small: {file_size} bytes"}
            
            # Read end of file to check for %%EOF
            f.seek(max(0, file_size - 100))
            tail = f.read()
            if b'%%EOF' not in tail:
                return {"valid": False, "error": "Missing %%EOF marker"}
            
            return {
                "valid": True,
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "header": header.decode('utf-8', errors='ignore')[:8]
            }
    except Exception as e:
        return {"valid": False, "error": f"Validation failed: {str(e)}"}


def convert_images_to_pdf(image_paths: list, output_path: str, options: dict | None = None) -> dict:
    """
    Convert JPG/JPEG images to PDF with detailed logging and validation
    
    Args:
        image_paths: List of image file paths
        output_path: Output PDF path
        options: Conversion options (page_size, orientation, image_layout, margin, quality)
        
    Returns:
        Dictionary with conversion result and metadata
    """
    if options is None:
        options: dict = {}
    
    # Debug logging - Input information
    print("🔍 DEBUG: Starting JPG → PDF conversion")
    print(f"📄 Input images: {len(image_paths)}")
    for i, img_path in enumerate(image_paths):
        metadata = get_image_metadata(img_path)
        print(f"📸 Image {i+1}: {os.path.basename(img_path)}")
        print(f"   ├─ MIME: image/jpeg")
        print(f"   ├─ Format: {metadata.get('format', 'Unknown')}")
        print(f"   ├─ Dimensions: {metadata.get('width', 0)}x{metadata.get('height', 0)} px")
        print(f"   ├─ DPI: {metadata.get('dpi', metadata.get('dpi_x', 'Unknown'))}")
        print(f"   ├─ Mode: {metadata.get('mode', 'Unknown')}")
        print(f"   ├─ Size: {metadata.get('file_size_mb', 0)} MB")
        print(f"   └─ Transparency: {metadata.get('has_transparency', False)}")
    
    try:
        # Parse options with defaults
        page_size_name = options.get('page_size', 'A4')
        orientation = options.get('orientation', 'portrait')
        image_layout = options.get('image_layout', 'fit')
        margin = float(options.get('margin', 20))
        quality = int(options.get('quality', 85))
        
        # Page size mapping
        page_sizes = {
            'A4': A4,
            'Letter': letter, 
            'Legal': legal,
            'A3': A3
        }
        
        page_size = page_sizes.get(page_size_name, A4)
        if orientation == 'landscape':
            page_size = (page_size[1], page_size[0])
        
        print(f"📋 PDF Options:")
        print(f"   ├─ Page Size: {page_size_name} ({page_size[0]}x{page_size[1]} pts)")
        print(f"   ├─ Orientation: {orientation}")
        print(f"   ├─ Image Layout: {image_layout}")
        print(f"   ├─ Margin: {margin} pts")
        print(f"   └─ Quality: {quality}%")
        
        # Create PDF
        c = canvas.Canvas(output_path, pagesize=page_size)
        
        # Set metadata
        c.setTitle("Converted Images")
        c.setAuthor("FileFlow")
        c.setSubject("JPG to PDF Conversion")
        c.setCreator("FileFlow JPG to PDF Converter")
        
        # Process each image
        usable_width = page_size[0] - (margin * 2)
        usable_height = page_size[1] - (margin * 2)
        
        for i, img_path in enumerate(image_paths):
            try:
                # Open and process image
                with Image.open(img_path) as img:
                    # Convert RGBA to RGB if needed (handle transparency)
                    if img.mode == 'RGBA':
                        print(f"   🔄 Converting RGBA to RGB (removing transparency)")
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        background.paste(img, mask=img.split()[-1])
                        img = background
                    elif img.mode not in ('RGB', 'L'):
                        print(f"   🔄 Converting {img.mode} to RGB")
                        img = img.convert('RGB')
                    
                    # Get image dimensions
                    img_width, img_height = img.size
                    
                    # Calculate placement based on layout option
                    if image_layout == 'fit':
                        # Scale to fit page while maintaining aspect ratio
                        scale = min(usable_width / img_width, usable_height / img_height)
                        new_width = img_width * scale
                        new_height = img_height * scale
                        x = margin + (usable_width - new_width) / 2
                        y = margin + (usable_height - new_height) / 2
                        
                    elif image_layout == 'fill':
                        # Scale to fill page (may crop)
                        scale = max(usable_width / img_width, usable_height / img_height)
                        new_width = img_width * scale
                        new_height = img_height * scale
                        x = margin + (usable_width - new_width) / 2
                        y = margin + (usable_height - new_height) / 2
                        
                    elif image_layout == 'stretch':
                        # Stretch to fill exactly
                        new_width = usable_width
                        new_height = usable_height
                        x = margin
                        y = margin
                        
                    else:  # original
                        # Use original size, center on page
                        new_width = min(img_width, usable_width)
                        new_height = min(img_height, usable_height)
                        x = margin + max(0, (usable_width - new_width) / 2)
                        y = margin + max(0, (usable_height - new_height) / 2)
                    
                    # Draw image on PDF
                    # ReportLab uses bottom-left origin, so adjust y coordinate
                    y_adjusted = page_size[1] - y - new_height
                    
                    # Create ImageReader for ReportLab
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, format='JPEG', quality=quality)
                    img_buffer.seek(0)
                    img_reader = ImageReader(img_buffer)
                    
                    c.drawImage(img_reader, x, y_adjusted, new_width, new_height)
                    print(f"   ✅ Added image {i+1} to PDF ({new_width:.1f}x{new_height:.1f} pts)")
                    
                    # Add new page if not the last image
                    if i < len(image_paths) - 1:
                        c.showPage()
                        
            except Exception as e:
                print(f"   ❌ Failed to process image {i+1}: {e}")
                raise
        
        # Save PDF
        c.save()
        
        # Validate generated PDF
        print("🔍 Validating generated PDF...")
        validation = validate_pdf_structure(output_path)
        
        if not validation["valid"]:
            raise Exception(f"PDF validation failed: {validation['error']}")
        
        print("✅ PDF validation successful:")
        print(f"   ├─ Header: {validation['header']}")
        print(f"   ├─ Size: {validation['file_size_mb']} MB")
        print(f"   └─ Structure: Valid")
        
        return {
            "success": True,
            "input_images": len(image_paths),
            "output_size_bytes": validation["file_size_bytes"],
            "output_size_mb": validation["file_size_mb"],
            "options_used": {
                "page_size": page_size_name,
                "orientation": orientation,
                "image_layout": image_layout,
                "margin": margin,
                "quality": quality
            },
            "validation": validation
        }
        
    except Exception as e:
        print(f"❌ CONVERSION FAILED: {e}")
        # Clean up failed PDF
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except:
                pass
        
        return {
            "success": False,
            "error": str(e),
            "input_images": len(image_paths)
        }


def main():
    """Command line interface for JPG to PDF conversion"""
    if len(sys.argv) < 4:
        print("ERROR: Invalid arguments")
        print("Usage: python jpg_to_pdf_converter.py <input_images_json> <output_pdf> <options_json>")
        print("   input_images_json: JSON array of image file paths")
        print("   output_pdf: Output PDF file path")
        print("   options_json: JSON object with conversion options")
        sys.exit(1)
    
    try:
        input_images_json = sys.argv[1]
        output_path = sys.argv[2]
        options_json = sys.argv[3] if len(sys.argv) > 3 else "{}"
        
        # Parse inputs
        image_paths = json.loads(input_images_json)
        options = json.loads(options_json)
        
        # Validate input images exist
        for img_path in image_paths:
            if not os.path.exists(img_path):
                raise FileNotFoundError(f"Input image not found: {img_path}")
        
        # Convert
        result = convert_images_to_pdf(image_paths, output_path, options)
        
        # Output result as JSON for Node.js
        print("SUCCESS")
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"ERROR: {e}")
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()