#!/usr/bin/env python3
"""
PDF Compression Service Script
Called by Express.js endpoint to perform server-side PDF compression
"""

import sys
import json
import base64
from pathlib import Path

# Add the server directory to path
sys.path.insert(0, str(Path(__file__).parent))

from features.pdf_compress.service import compress_pdf, test_dependencies

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "Usage: pdf_compress_service.py <file_path> <options_json>"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    options_json = sys.argv[2]
    
    try:
        # Check dependencies first
        deps_ok, deps_msg = test_dependencies()
        if not deps_ok:
            print(json.dumps({"success": False, "error": f"Dependencies not available: {deps_msg}"}))
            sys.exit(1)
        
        # Parse options
        options = json.loads(options_json)
        
        # Read input PDF
        if not Path(file_path).exists():
            print(json.dumps({"success": False, "error": f"File not found: {file_path}"}))
            sys.exit(1)
        
        with open(file_path, 'rb') as f:
            pdf_data = f.read()
        
        # Perform compression
        compressed_data = compress_pdf(pdf_data, options)
        
        # Encode result as base64 for JSON transport
        compressed_b64 = base64.b64encode(compressed_data).decode('utf-8')
        
        # Return results
        result = {
            "success": True,
            "original_size": len(pdf_data),
            "compressed_size": len(compressed_data),
            "compression_ratio": round(((len(pdf_data) - len(compressed_data)) / len(pdf_data)) * 100, 1),
            "compressed_data": compressed_b64
        }
        
        # Print only the JSON result to stdout
        print(json.dumps(result), flush=True)
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc(file=sys.stderr)  # Send traceback to stderr
        print(json.dumps({"success": False, "error": error_msg}), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()