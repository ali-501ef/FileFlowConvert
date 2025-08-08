#!/usr/bin/env python3

import sys
import os
import subprocess
import json
from pathlib import Path

def convert_media(input_path, output_path, conversion_type, options=None):
    """
    Convert media files using FFmpeg
    """
    if options is None:
        options = {}
    
    try:
        # Ensure FFmpeg is available
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {"error": "FFmpeg not available"}
    
    try:
        if conversion_type == "video_compress":
            return compress_video(input_path, output_path, options)
        elif conversion_type == "video_to_audio":
            return extract_audio(input_path, output_path, options)
        elif conversion_type == "audio_convert":
            return convert_audio(input_path, output_path, options)
        elif conversion_type == "video_trim":
            return trim_video(input_path, output_path, options)
        elif conversion_type == "video_to_gif":
            return create_gif(input_path, output_path, options)
        elif conversion_type == "video_merge":
            return merge_videos(input_path, output_path, options)
        else:
            return {"error": f"Unknown conversion type: {conversion_type}"}
    
    except Exception as e:
        return {"error": str(e)}

def compress_video(input_path, output_path, options):
    """Compress video file"""
    cmd = ['ffmpeg', '-i', input_path]
    
    # Compression level settings
    compression = options.get('compression', 'medium')
    if compression == 'light':
        cmd.extend(['-crf', '23', '-preset', 'medium'])
    elif compression == 'medium':
        cmd.extend(['-crf', '28', '-preset', 'medium'])
    elif compression == 'heavy':
        cmd.extend(['-crf', '32', '-preset', 'fast'])
    else:
        # Custom settings
        if 'bitrate' in options:
            cmd.extend(['-b:v', f"{options['bitrate']}k"])
        if 'crf' in options:
            cmd.extend(['-crf', str(options['crf'])])
    
    # Resolution
    if 'resolution' in options and options['resolution'] != 'original':
        if options['resolution'] == '1080p':
            cmd.extend(['-vf', 'scale=1920:1080'])
        elif options['resolution'] == '720p':
            cmd.extend(['-vf', 'scale=1280:720'])
        elif options['resolution'] == '480p':
            cmd.extend(['-vf', 'scale=854:480'])
    
    # Frame rate
    if 'framerate' in options and options['framerate'] != 'original':
        cmd.extend(['-r', str(options['framerate'])])
    
    cmd.extend(['-y', output_path])
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        original_size = os.path.getsize(input_path)
        compressed_size = os.path.getsize(output_path)
        return {
            "success": True,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": round((1 - compressed_size/original_size) * 100, 1)
        }
    else:
        return {"error": f"FFmpeg error: {result.stderr}"}

def extract_audio(input_path, output_path, options):
    """Extract audio from video"""
    cmd = ['ffmpeg', '-i', input_path]
    
    # Audio format
    format_ext = options.get('format', 'mp3')
    if format_ext == 'mp3':
        cmd.extend(['-vn', '-acodec', 'libmp3lame'])
        # Bitrate
        bitrate = options.get('bitrate', '192')
        cmd.extend(['-b:a', f'{bitrate}k'])
    elif format_ext == 'wav':
        cmd.extend(['-vn', '-acodec', 'pcm_s16le'])
    elif format_ext == 'aac':
        cmd.extend(['-vn', '-acodec', 'aac'])
        bitrate = options.get('bitrate', '128') 
        cmd.extend(['-b:a', f'{bitrate}k'])
    
    cmd.extend(['-y', output_path])
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        return {"success": True}
    else:
        return {"error": f"FFmpeg error: {result.stderr}"}

def convert_audio(input_path, output_path, options):
    """Convert audio format"""
    cmd = ['ffmpeg', '-i', input_path]
    
    format_ext = options.get('format', 'mp3')
    if format_ext == 'mp3':
        cmd.extend(['-acodec', 'libmp3lame'])
        bitrate = options.get('bitrate', '192')
        cmd.extend(['-b:a', f'{bitrate}k'])
    elif format_ext == 'wav':
        cmd.extend(['-acodec', 'pcm_s16le'])
    elif format_ext == 'flac':
        cmd.extend(['-acodec', 'flac'])
    elif format_ext == 'aac':
        cmd.extend(['-acodec', 'aac'])
        bitrate = options.get('bitrate', '128')
        cmd.extend(['-b:a', f'{bitrate}k'])
    
    # Sample rate
    if 'sample_rate' in options and options['sample_rate'] != 'keep':
        cmd.extend(['-ar', str(options['sample_rate'])])
    
    cmd.extend(['-y', output_path])
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        return {"success": True}
    else:
        return {"error": f"FFmpeg error: {result.stderr}"}

def trim_video(input_path, output_path, options):
    """Trim video to specified time range"""
    start_time = options.get('start_time', 0)
    duration = options.get('duration', 10)
    
    cmd = [
        'ffmpeg', '-i', input_path,
        '-ss', str(start_time),
        '-t', str(duration),
        '-c', 'copy',  # Copy streams without re-encoding for speed
        '-y', output_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        return {"success": True}
    else:
        return {"error": f"FFmpeg error: {result.stderr}"}

def create_gif(input_path, output_path, options):
    """Create GIF from video"""
    start_time = options.get('start_time', 0)
    duration = options.get('duration', 3)
    fps = options.get('fps', 10)
    width = options.get('width', 480)
    
    # Two-pass approach for better quality
    palette_path = output_path.replace('.gif', '_palette.png')
    
    # Generate palette
    palette_cmd = [
        'ffmpeg', '-i', input_path,
        '-ss', str(start_time), '-t', str(duration),
        '-vf', f'fps={fps},scale={width}:-1:flags=lanczos,palettegen',
        '-y', palette_path
    ]
    
    result = subprocess.run(palette_cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        return {"error": f"Palette generation failed: {result.stderr}"}
    
    # Create GIF with palette
    gif_cmd = [
        'ffmpeg', '-i', input_path, '-i', palette_path,
        '-ss', str(start_time), '-t', str(duration),
        '-lavfi', f'fps={fps},scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse',
        '-y', output_path
    ]
    
    result = subprocess.run(gif_cmd, capture_output=True, text=True, timeout=120)
    
    # Clean up palette file
    try:
        os.remove(palette_path)
    except:
        pass
    
    if result.returncode == 0:
        return {"success": True}
    else:
        return {"error": f"GIF creation failed: {result.stderr}"}

def merge_videos(input_path, output_path, options):
    """Merge multiple video files into one"""
    # For video merger, input_path should be a directory or list of files
    # For now, implement basic concatenation
    video_list = options.get('video_files', [])
    if not video_list:
        return {"error": "No video files provided for merging"}
    
    # Create a temporary file list for FFmpeg concat
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        concat_file = f.name
        for video_file in video_list:
            f.write(f"file '{video_file}'\n")
    
    try:
        cmd = [
            'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file,
            '-c', 'copy',  # Copy streams without re-encoding for speed
            '-y', output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            return {"success": True}
        else:
            return {"error": f"Video merge failed: {result.stderr}"}
    finally:
        # Clean up temporary concat file
        try:
            os.remove(concat_file)
        except:
            pass

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: python media_converter.py <input> <output> <type> [options_json]"}))
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    conversion_type = sys.argv[3]
    options = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    
    if not os.path.exists(input_path):
        print(json.dumps({"error": "Input file not found"}))
        sys.exit(1)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    result = convert_media(input_path, output_path, conversion_type, options)
    print(json.dumps(result))