#!/usr/bin/env python3
"""
Advanced PDF Compression Service
Uses qpdf + Ghostscript + pikepdf for maximum compression
"""

import os
import tempfile
import subprocess
import json
from pathlib import Path
import pikepdf

def _run(cmd):
    """Run subprocess command and return results"""
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return p.returncode, p.stdout, p.stderr

def _qpdf_lossless(in_pdf, out_pdf):
    """Apply lossless qpdf compression"""
    cmd = ["qpdf", "--object-streams=generate", "--stream-data=compress", "--linearize", in_pdf, out_pdf]
    code, stdout, err = _run(cmd)
    if code != 0:
        raise RuntimeError(f"qpdf failed: {err}")
    return True

def _gs_lossy(in_pdf, out_pdf, level_cfg, optimize_images=True):
    """Apply Ghostscript lossy compression"""
    
    # Select image filters based on UseJPX setting
    if level_cfg.get("UseJPX", False):
        filters = ["-sColorImageFilter=/JPXEncode", "-sGrayImageFilter=/JPXEncode"]
    else:
        filters = ["-sColorImageFilter=/DCTEncode", "-sGrayImageFilter=/DCTEncode"]
    
    # Base Ghostscript command
    cmd = [
        "gs", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.6", 
        "-dNOPAUSE", "-dBATCH", "-dSAFER",
        "-dDetectDuplicateImages=true",
        "-dEncodeColorImages=true", "-dEncodeGrayImages=true", "-dEncodeMonoImages=true",
        f"-dColorImageResolution={level_cfg['ColorImageResolution']}",
        f"-dGrayImageResolution={level_cfg['GrayImageResolution']}",
        f"-dMonoImageResolution={level_cfg['MonoImageResolution']}",
        f"-dJPEGQ={level_cfg['JPEGQuality']}"
    ]
    
    # Add image optimization flags if enabled
    if optimize_images:
        cmd.extend([
            "-dColorImageDownsampleType=/Average",
            "-dGrayImageDownsampleType=/Average", 
            "-dMonoImageDownsampleType=/Subsample"
        ])
    
    # Add image filters
    cmd.extend(filters)
    
    # Add output and input files
    cmd.extend(["-sOutputFile=" + out_pdf, in_pdf])
    
    code, stdout, err = _run(cmd)
    if code != 0:
        raise RuntimeError(f"ghostscript failed: {err}")
    return True

def _strip_metadata(in_pdf, out_pdf):
    """Remove PDF metadata using pikepdf"""
    try:
        with pikepdf.open(in_pdf) as pdf:
            # Clear document info
            if hasattr(pdf, 'docinfo'):
                pdf.docinfo.clear()
            
            # Remove XMP metadata
            if "/Metadata" in pdf.root:
                del pdf.root["/Metadata"]
            
            # Remove unused name trees
            if "/Names" in pdf.root:
                del pdf.root["/Names"]
                
            # Save the cleaned PDF
            pdf.save(out_pdf)
    except Exception as e:
        # If metadata removal fails, copy the original file
        import shutil
        shutil.copy2(in_pdf, out_pdf)
        print(f"Warning: Metadata removal failed: {e}")

# Compression level configurations
GS_LEVELS = {
    "low": {
        "ColorImageResolution": 300,
        "GrayImageResolution": 300,
        "MonoImageResolution": 600,
        "JPEGQuality": 85,
        "UseJPX": False
    },
    "medium": {
        "ColorImageResolution": 200,
        "GrayImageResolution": 200,
        "MonoImageResolution": 600,
        "JPEGQuality": 70,
        "UseJPX": False
    },
    "high": {
        "ColorImageResolution": 150,
        "GrayImageResolution": 150,
        "MonoImageResolution": 600,
        "JPEGQuality": 60,
        "UseJPX": True
    },
    "maximum": {
        "ColorImageResolution": 120,
        "GrayImageResolution": 120,
        "MonoImageResolution": 600,
        "JPEGQuality": 45,
        "UseJPX": True
    }
}

def compress_pdf(in_bytes: bytes, options: dict) -> bytes:
    """
    Main PDF compression function with multi-pass optimization
    
    Args:
        in_bytes: PDF file as bytes
        options: dict with compression settings:
            - level: "low|medium|high|maximum"  
            - imageQuality: int (10-95, overrides JPEG quality)
            - removeMetadata: bool
            - optimizeEmbeddedImages: bool
    
    Returns:
        Compressed PDF as bytes
    """
    
    # Parse and validate options
    level = (options.get("level") or "medium").lower()
    cfg = dict(GS_LEVELS.get(level, GS_LEVELS["medium"]))
    
    # Override JPEG quality if provided
    if "imageQuality" in options and isinstance(options["imageQuality"], (int, float)):
        quality = max(10, min(95, int(options["imageQuality"])))
        cfg["JPEGQuality"] = quality
    
    optimize_images = bool(options.get("optimizeEmbeddedImages", True))
    remove_metadata = bool(options.get("removeMetadata", False))
    
    print(f"PDF compression: level={level}, quality={cfg['JPEGQuality']}, optimize={optimize_images}, metadata={remove_metadata}")
    
    with tempfile.TemporaryDirectory() as td:
        temp_dir = Path(td)
        src_pdf = temp_dir / "input.pdf"
        qpdf_out = temp_dir / "qpdf.pdf"
        gs_out = temp_dir / "gs.pdf"
        final_pdf = temp_dir / "final.pdf"
        
        # Write input PDF
        src_pdf.write_bytes(in_bytes)
        original_size = len(in_bytes)
        
        try:
            # Step 1: Apply lossless qpdf compression
            print("Applying qpdf lossless compression...")
            _qpdf_lossless(str(src_pdf), str(qpdf_out))
            qpdf_size = qpdf_out.stat().st_size
            print(f"qpdf result: {qpdf_size} bytes ({(original_size - qpdf_size)/original_size*100:.1f}% reduction)")
            
            # Step 2: Apply Ghostscript lossy compression
            print("Applying Ghostscript lossy compression...")
            _gs_lossy(str(qpdf_out), str(gs_out), cfg, optimize_images)
            gs_size = gs_out.stat().st_size
            print(f"Ghostscript result: {gs_size} bytes ({(original_size - gs_size)/original_size*100:.1f}% reduction)")
            
            # Step 3: Choose the smaller result
            if gs_size < qpdf_size:
                chosen_pdf = gs_out
                chosen_size = gs_size
                print("Using Ghostscript result (smaller)")
            else:
                chosen_pdf = qpdf_out
                chosen_size = qpdf_size
                print("Using qpdf result (smaller)")
            
            # Step 4: Remove metadata if requested
            final_file = chosen_pdf
            if remove_metadata:
                print("Removing metadata...")
                _strip_metadata(str(chosen_pdf), str(final_pdf))
                final_size = final_pdf.stat().st_size
                final_file = final_pdf
                print(f"Metadata removal result: {final_size} bytes")
            
            # Return the final compressed PDF
            result_bytes = final_file.read_bytes()
            final_reduction = (original_size - len(result_bytes)) / original_size * 100
            print(f"Final compression: {len(result_bytes)} bytes ({final_reduction:.1f}% reduction)")
            
            return result_bytes
            
        except Exception as e:
            print(f"Compression failed: {e}")
            # Return original file if compression fails
            return in_bytes

def test_dependencies():
    """Test if required dependencies are available"""
    try:
        # Test qpdf
        code, _, _ = _run(["qpdf", "--version"])
        if code != 0:
            return False, "qpdf not available"
        
        # Test ghostscript
        code, _, _ = _run(["gs", "--version"])
        if code != 0:
            return False, "ghostscript not available"
            
        # Test pikepdf
        import pikepdf
        
        return True, "All dependencies available"
        
    except Exception as e:
        return False, f"Dependency test failed: {e}"

if __name__ == "__main__":
    # Test dependencies when run directly
    success, message = test_dependencies()
    print(f"Dependency test: {message}")
    if success:
        print("PDF compression service is ready!")
    else:
        print("Please install missing dependencies")