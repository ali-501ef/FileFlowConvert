#!/usr/bin/env python3
"""
PDF Compression API Route
Provides server-side PDF compression with Ghostscript + qpdf + pikepdf
"""

import json
import tempfile
import os
from pathlib import Path
import sys

# Add the parent directory to the Python path to import our service
current_dir = Path(__file__).parent
server_dir = current_dir.parent
sys.path.insert(0, str(server_dir))

from features.pdf_compress.service import compress_pdf, test_dependencies

def handle_pdf_compress(file_data: bytes, options_str: str = "{}"):
    """
    Handle PDF compression request
    
    Args:
        file_data: PDF file as bytes
        options_str: JSON string with compression options
        
    Returns:
        dict with compression results
    """
    try:
        # Parse options
        options = json.loads(options_str or "{}")
        
        # Validate input
        if not file_data:
            return {"error": "No file data provided", "success": False}
        
        # Check dependencies
        deps_ok, deps_msg = test_dependencies()
        if not deps_ok:
            return {"error": f"Dependencies not available: {deps_msg}", "success": False}
        
        original_size = len(file_data)
        
        # Perform compression
        compressed_data = compress_pdf(file_data, options)
        compressed_size = len(compressed_data)
        
        # Calculate compression ratio
        reduction_percent = ((original_size - compressed_size) / original_size) * 100 if original_size > 0 else 0
        
        return {
            "success": True,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": round(reduction_percent, 1),
            "compressed_data": compressed_data
        }
        
    except json.JSONDecodeError:
        return {"error": "Invalid options JSON", "success": False}
    except Exception as e:
        return {"error": f"Compression failed: {str(e)}", "success": False}

if __name__ == "__main__":
    # Test the service directly
    print("Testing PDF compression service...")
    success, message = test_dependencies()
    print(f"Dependencies: {message}")