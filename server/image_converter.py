#!/usr/bin/env python3
"""
Image Conversion Service
Handles image format conversions with HEIC/HEIF support
"""

import sys
from PIL import Image, ImageOps
import os

def convert_heic_to_pil(input_path):
    """Convert HEIC/HEIF to PIL Image using multiple fallback methods"""
    print(f"Attempting to convert HEIC file: {input_path}")
    
    # Method 1: Try pillow-heif first (more reliable)
    try:
        from pillow_heif import register_heif_opener
        print("Trying pillow-heif method...")
        register_heif_opener()
        img = Image.open(input_path)
        print(f"pillow-heif conversion successful. Mode: {img.mode}, Size: {img.size}")
        return img
    except ImportError as e1:
        print(f"pillow-heif not available: {e1}")
    except Exception as e1:
        print(f"pillow-heif conversion failed: {e1}")
    
    # Method 2: Try pyheif as fallback
    try:
        import pyheif
        print("Trying pyheif method...")
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
        print("pyheif conversion successful")
        return img
    except ImportError as e2:
        print(f"pyheif not available: {e2}")
    except Exception as e2:
        print(f"pyheif conversion failed: {e2}")
    
    # If both methods fail, provide detailed error
    raise Exception(f"Failed to convert HEIC file using all available methods. Ensure file is valid HEIC/HEIF format.")

def main():
    """Main conversion function"""
    try:
        if len(sys.argv) != 4:
            raise Exception("Usage: python3 image_converter.py <input_path> <output_path> <output_format>")
        
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

if __name__ == "__main__":
    main()