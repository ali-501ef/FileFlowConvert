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
    
    import sys
    def log(msg):
        print(msg, file=sys.stderr, flush=True)
    
    # Simple, reliable Ghostscript command based on compression level
    jpeg_quality = level_cfg['JPEGQuality']
    
    if jpeg_quality <= 50:  # Maximum compression
        pdfsetting = "/screen"
    elif jpeg_quality <= 70:  # High/Medium compression  
        pdfsetting = "/ebook"
    else:  # Low compression
        pdfsetting = "/prepress"
    
    cmd = [
        "gs", 
        "-sDEVICE=pdfwrite", 
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={pdfsetting}",
        "-dNOPAUSE", 
        "-dBATCH", 
        "-dSAFER"
    ]
    
    # Add specific image optimization for aggressive compression
    if optimize_images and jpeg_quality <= 50:
        cmd.extend([
            "-dDownsampleColorImages=true",
            "-dDownsampleGrayImages=true",
            f"-dColorImageResolution={max(72, level_cfg['ColorImageResolution'])}",
            f"-dGrayImageResolution={max(72, level_cfg['GrayImageResolution'])}",
            "-dColorImageDownsampleType=/Average",
            "-dGrayImageDownsampleType=/Average"
        ])
    
    # Add output and input files
    cmd.extend([f"-sOutputFile={out_pdf}", in_pdf])
    
    # Log the command for debugging
    log(f"Running Ghostscript: {' '.join(cmd)}")
    
    code, stdout, err = _run(cmd)
    if code != 0:
        log(f"Ghostscript failed with code {code}")
        log(f"Ghostscript stdout: {stdout}")
        log(f"Ghostscript stderr: {err}")
        raise RuntimeError(f"ghostscript failed with code {code}: {err}")
    
    log(f"Ghostscript completed successfully")
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
        "ColorImageResolution": 72,
        "GrayImageResolution": 72,
        "MonoImageResolution": 300,
        "JPEGQuality": 30,
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
    
    # Log to stderr to avoid polluting stdout JSON
    import sys
    def log(msg):
        print(msg, file=sys.stderr, flush=True)
    
    log(f"PDF compression: level={level}, quality={cfg['JPEGQuality']}, optimize={optimize_images}, metadata={remove_metadata}")
    
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
            log("Applying qpdf lossless compression...")
            _qpdf_lossless(str(src_pdf), str(qpdf_out))
            qpdf_size = qpdf_out.stat().st_size
            log(f"qpdf result: {qpdf_size} bytes ({(original_size - qpdf_size)/original_size*100:.1f}% reduction)")
            
            # Step 2: Apply Ghostscript lossy compression
            log("Applying Ghostscript lossy compression...")
            _gs_lossy(str(qpdf_out), str(gs_out), cfg, optimize_images)
            gs_size = gs_out.stat().st_size
            log(f"Ghostscript result: {gs_size} bytes ({(original_size - gs_size)/original_size*100:.1f}% reduction)")
            
            # Step 3: Choose the smaller result
            if gs_size < qpdf_size:
                chosen_pdf = gs_out
                chosen_size = gs_size
                log("Using Ghostscript result (smaller)")
            else:
                chosen_pdf = qpdf_out
                chosen_size = qpdf_size
                log("Using qpdf result (smaller)")
            
            # Step 4: Remove metadata if requested
            final_file = chosen_pdf
            if remove_metadata:
                log("Removing metadata...")
                _strip_metadata(str(chosen_pdf), str(final_pdf))
                final_size = final_pdf.stat().st_size
                final_file = final_pdf
                log(f"Metadata removal result: {final_size} bytes")
            
            # Return the final compressed PDF
            result_bytes = final_file.read_bytes()
            final_reduction = (original_size - len(result_bytes)) / original_size * 100
            log(f"Final compression: {len(result_bytes)} bytes ({final_reduction:.1f}% reduction)")
            
            return result_bytes
            
        except Exception as e:
            log(f"Compression failed: {e}")
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