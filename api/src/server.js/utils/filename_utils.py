"""
Shared filename formatting utilities for Python converters
Implements consistent naming across all converters
"""

import re
import os
from datetime import datetime
from typing import Optional


def format_output_filename(original_name: str, target_ext: str) -> str:
    """
    Format output filename with consistent pattern
    Pattern: <base>_to_<targetExt>_<yyyyMMdd-HHmm>.<targetExt>
    
    Args:
        original_name: Original filename
        target_ext: Target file extension (without dot)
        
    Returns:
        Formatted filename
    """
    # Remove path and get base filename
    base_name = os.path.basename(original_name)
    
    # Remove all extensions and sanitize
    clean_base = base_name
    # Remove extensions (handle double extensions)
    while '.' in clean_base:
        clean_base = os.path.splitext(clean_base)[0]
    
    # Replace unsafe chars with underscore
    clean_base = re.sub(r'[^a-zA-Z0-9_-]', '_', clean_base)
    # Collapse multiple underscores
    clean_base = re.sub(r'_+', '_', clean_base)
    # Trim leading/trailing underscores
    clean_base = clean_base.strip('_')
    
    # Generate timestamp
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d-%H%M")
    
    # Ensure we have a base name
    final_base = clean_base or 'converted'
    
    return f"{final_base}_to_{target_ext}_{timestamp}.{target_ext}"


def get_file_extension(filename: str) -> str:
    """
    Extract file extension from filename
    
    Args:
        filename: File name
        
    Returns:
        Extension without dot, or empty string if none
    """
    _, ext = os.path.splitext(filename)
    return ext.lower().lstrip('.')


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe filesystem usage
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Replace unsafe chars
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Replace spaces with underscores
    sanitized = re.sub(r'\s+', '_', sanitized)
    # Collapse multiple underscores
    sanitized = re.sub(r'_+', '_', sanitized)
    # Trim leading/trailing underscores
    sanitized = sanitized.strip('_')
    # Limit length
    return sanitized[:100]


def generate_unique_filename(base_filename: str, extension: str) -> str:
    """
    Generate unique filename to avoid conflicts
    
    Args:
        base_filename: Base filename
        extension: File extension (with or without dot)
        
    Returns:
        Unique filename with timestamp
    """
    import time
    import random
    import string
    
    clean_ext = extension.lstrip('.')
    sanitized = sanitize_filename(base_filename)
    timestamp = int(time.time())
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    
    return f"{sanitized}_{timestamp}_{random_str}.{clean_ext}"