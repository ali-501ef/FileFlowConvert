"""
File validation utilities for Python converters
"""

import os
import subprocess
import json
import mimetypes
from typing import Dict, Any, Optional
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ValidationResult:
    def __init__(self, valid: bool, actual_type: Optional[str] = None, 
                 actual_extension: Optional[str] = None, error: Optional[str] = None, 
                 metadata: Optional[Dict[str, Any]] = None):
        self.valid = valid
        self.actual_type = actual_type
        self.actual_extension = actual_extension
        self.error = error
        self.metadata = metadata or {}


def validate_pdf(file_path: str) -> ValidationResult:
    """
    Validate PDF file and get metadata using pdfinfo
    
    Args:
        file_path: Path to PDF file
        
    Returns:
        ValidationResult with PDF metadata
    """
    try:
        # Check file exists and has content
        if not os.path.exists(file_path):
            return ValidationResult(False, error="File does not exist")
            
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            return ValidationResult(False, error="File is empty")

        # Check magic bytes
        with open(file_path, 'rb') as f:
            header = f.read(5)
            if not header.startswith(b'%PDF-'):
                return ValidationResult(False, error="Not a valid PDF file")

        # Use pdfinfo to validate and get metadata
        try:
            result = subprocess.run(['pdfinfo', file_path], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                return ValidationResult(False, error=f"PDF validation failed: {result.stderr}")
            
            metadata = {}
            for line in result.stdout.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip()

            # Check if truly password protected
            is_encrypted = metadata.get('Encrypted', '').lower() != 'no'
            
            if is_encrypted:
                # Test if we can actually process it
                try:
                    test_result = subprocess.run([
                        'pdftoppm', '-jpeg', '-r', '72', '-f', '1', '-l', '1',
                        file_path, '/dev/null'
                    ], capture_output=True, text=True, timeout=10)
                    
                    if test_result.returncode != 0:
                        stderr = test_result.stderr.lower()
                        if any(keyword in stderr for keyword in ['incorrect password', 'command not allowed', 'permission denied']):
                            return ValidationResult(False, error="PDF is password-protected", metadata=metadata)
                except subprocess.TimeoutExpired:
                    pass

            return ValidationResult(
                True,
                actual_type='application/pdf',
                actual_extension='pdf',
                metadata=metadata
            )
            
        except subprocess.TimeoutExpired:
            return ValidationResult(False, error="PDF validation timed out")
        except Exception as e:
            return ValidationResult(False, error=f"PDF validation failed: {str(e)}")
            
    except Exception as e:
        return ValidationResult(False, error=f"File validation failed: {str(e)}")


def validate_image(file_path: str) -> ValidationResult:
    """
    Validate image file using ImageMagick identify
    
    Args:
        file_path: Path to image file
        
    Returns:
        ValidationResult with image metadata
    """
    try:
        result = subprocess.run([
            'identify', '-ping', '-format', '%m %w %h %[colorspace]', file_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return ValidationResult(False, error=f"Image validation failed: {result.stderr}")
            
        parts = result.stdout.strip().split(' ')
        if len(parts) < 3:
            return ValidationResult(False, error="Could not parse image metadata")
            
        format_name, width, height = parts[0], parts[1], parts[2]
        colorspace = parts[3] if len(parts) > 3 else 'Unknown'
        
        metadata = {
            'format': format_name,
            'width': int(width),
            'height': int(height),
            'colorspace': colorspace
        }

        # Map ImageMagick format to MIME type
        format_to_mime = {
            'JPEG': 'image/jpeg',
            'PNG': 'image/png',
            'GIF': 'image/gif',
            'WEBP': 'image/webp',
            'TIFF': 'image/tiff',
            'BMP': 'image/bmp',
            'HEIC': 'image/heic'
        }

        actual_type = format_to_mime.get(format_name, f'image/{format_name.lower()}')
        actual_extension = 'jpg' if format_name == 'JPEG' else format_name.lower()

        return ValidationResult(
            True,
            actual_type=actual_type,
            actual_extension=actual_extension,
            metadata=metadata
        )
        
    except subprocess.TimeoutExpired:
        return ValidationResult(False, error="Image validation timed out")
    except Exception as e:
        return ValidationResult(False, error=f"Image validation failed: {str(e)}")


def validate_media(file_path: str) -> ValidationResult:
    """
    Validate video/audio file using ffprobe
    
    Args:
        file_path: Path to media file
        
    Returns:
        ValidationResult with media metadata
    """
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', file_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return ValidationResult(False, error=f"Media validation failed: {result.stderr}")
            
        data = json.loads(result.stdout)
        format_info = data.get('format', {})
        streams = data.get('streams', [])
        
        has_video = any(s.get('codec_type') == 'video' for s in streams)
        has_audio = any(s.get('codec_type') == 'audio' for s in streams)
        
        actual_type = 'application/octet-stream'
        actual_extension = ''
        
        format_name = format_info.get('format_name', '').split(',')[0]
        
        if has_video and has_audio:
            actual_type = f'video/{format_name}'
            actual_extension = format_name
        elif has_audio:
            actual_type = f'audio/{format_name}'
            actual_extension = format_name

        metadata = {
            'duration': float(format_info.get('duration', 0)),
            'bitrate': int(format_info.get('bit_rate', 0)),
            'streams': len(streams),
            'has_video': has_video,
            'has_audio': has_audio,
            'format_name': format_name
        }

        return ValidationResult(
            True,
            actual_type=actual_type,
            actual_extension=actual_extension,
            metadata=metadata
        )
        
    except subprocess.TimeoutExpired:
        return ValidationResult(False, error="Media validation timed out")
    except json.JSONDecodeError:
        return ValidationResult(False, error="Could not parse media metadata")
    except Exception as e:
        return ValidationResult(False, error=f"Media validation failed: {str(e)}")


def validate_file(file_path: str, expected_type: Optional[str] = None) -> ValidationResult:
    """
    Validate any file by detecting its type and using appropriate validator
    
    Args:
        file_path: Path to file
        expected_type: Expected file type for additional validation
        
    Returns:
        ValidationResult
    """
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return ValidationResult(False, error="File does not exist")
            
        # Read first few bytes to detect type
        with open(file_path, 'rb') as f:
            header = f.read(20)
            
        # PDF magic bytes
        if header[:4] == b'%PDF':
            return validate_pdf(file_path)
        
        # Image magic bytes
        if len(header) >= 2 and header[0] == 0xFF and header[1] == 0xD8:  # JPEG
            return validate_image(file_path)
        if header[:8] == b'\x89PNG\r\n\x1a\n':  # PNG
            return validate_image(file_path)
        if header[:3] == b'GIF':  # GIF
            return validate_image(file_path)
        if header[:4] == b'RIFF':  # WebP/AVI
            return validate_image(file_path)
        
        # Try media validation for other files
        return validate_media(file_path)
        
    except Exception as e:
        return ValidationResult(False, error=f"File type detection failed: {str(e)}")


def log_conversion(operation: str, input_info: Dict[str, Any], 
                  output_info: Dict[str, Any], options: Dict[str, Any] = None,
                  result: Dict[str, Any] = None):
    """
    Log structured conversion information
    
    Args:
        operation: Conversion operation name
        input_info: Input file information
        output_info: Output file information  
        options: Conversion options
        result: Conversion result
    """
    from datetime import datetime
    
    options = options or {}
    result = result or {}
    
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'operation': operation,
        'input': {
            'filename': input_info.get('filename', ''),
            'mimeType': input_info.get('mime', ''),
            'detectedFormat': input_info.get('mime', '').split('/')[-1] if input_info.get('mime') else 'unknown',
            'sizeBytes': input_info.get('size', 0)
        },
        'output': {
            'filename': output_info.get('filename', ''),
            'mimeType': output_info.get('mime', ''),
            'targetFormat': output_info.get('mime', '').split('/')[-1] if output_info.get('mime') else 'unknown',
            'sizeBytes': output_info.get('size', 0)
        },
        'options': options,
        'result': {
            'success': result.get('success', False),
            'error': result.get('error'),
            'durationMs': result.get('duration', 0)
        }
    }
    
    if result.get('success'):
        logger.info(f"✅ CONVERSION SUCCESS: {json.dumps(log_data, indent=2)}")
    else:
        logger.error(f"❌ CONVERSION FAILED: {json.dumps(log_data, indent=2)}")