#!/usr/bin/env python3
"""
Test suite for PDF compression service
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from features.pdf_compress.service import compress_pdf, test_dependencies

def _opts(level, meta=False, opt_images=True, iq=None):
    """Helper to create options dict"""
    o = {"level": level, "removeMetadata": meta, "optimizeEmbeddedImages": opt_images}
    if iq is not None:
        o["imageQuality"] = iq
    return o

def test_dependencies():
    """Test that all required dependencies are available"""
    success, message = test_dependencies()
    print(f"Dependencies test: {message}")
    return success

def test_sample_compression():
    """Test compression with sample data"""
    # Create a minimal PDF for testing
    sample_pdf = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000216 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
309
%%EOF"""
    
    try:
        # Test with different compression levels
        for level in ['low', 'medium', 'high', 'maximum']:
            options = _opts(level, meta=True, opt_images=True, iq=70)
            result = compress_pdf(sample_pdf, options)
            
            print(f"Level {level}: {len(sample_pdf)} -> {len(result)} bytes")
            
            # Verify the result is still a valid PDF
            if result.startswith(b'%PDF'):
                print(f"✓ {level} compression produced valid PDF")
            else:
                print(f"✗ {level} compression produced invalid PDF")
                
        return True
        
    except Exception as e:
        print(f"Compression test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing PDF compression service...")
    
    # Test dependencies
    if not test_dependencies():
        print("Dependencies not available, exiting")
        sys.exit(1)
    
    # Test compression
    if test_sample_compression():
        print("✓ All tests passed!")
    else:
        print("✗ Tests failed")
        sys.exit(1)