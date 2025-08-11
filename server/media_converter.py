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
    
    # Video codec settings
    cmd.extend(['-c:v', 'libx264'])
    
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
        if 'preset' in options:
            cmd.extend(['-preset', options['preset']])
    
    # Resolution scaling
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
    
    # Audio codec
    cmd.extend(['-c:a', 'aac', '-b:a', '128k'])
    
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
        cmd.extend(['-vn', '-c:a', 'aac'])
        bitrate = options.get('bitrate', '128') 
        cmd.extend(['-b:a', f'{bitrate}k'])
    elif format_ext == 'flac':
        cmd.extend(['-vn', '-c:a', 'flac'])
    elif format_ext == 'ogg':
        cmd.extend(['-vn', '-c:a', 'libvorbis'])
        bitrate = options.get('bitrate', '192')
        cmd.extend(['-b:a', f'{bitrate}k'])
    
    # Add metadata preservation
    cmd.extend(['-map_metadata', '0'])
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
        cmd.extend(['-c:a', 'libmp3lame'])
        bitrate = options.get('bitrate', '192')
        cmd.extend(['-b:a', f'{bitrate}k'])
    elif format_ext == 'wav':
        cmd.extend(['-c:a', 'pcm_s16le'])
    elif format_ext == 'flac':
        cmd.extend(['-c:a', 'flac'])
    elif format_ext == 'aac':
        cmd.extend(['-c:a', 'aac'])
        bitrate = options.get('bitrate', '128')
        cmd.extend(['-b:a', f'{bitrate}k'])
    elif format_ext == 'ogg':
        cmd.extend(['-c:a', 'libvorbis'])
        bitrate = options.get('bitrate', '192')
        cmd.extend(['-b:a', f'{bitrate}k'])
    
    # Sample rate
    if 'sample_rate' in options and options['sample_rate'] != 'keep':
        cmd.extend(['-ar', str(options['sample_rate'])])
    
    # Preserve metadata if requested
    if options.get('preserve_metadata', True):
        cmd.extend(['-map_metadata', '0'])
    
    cmd.extend(['-y', output_path])
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        return {"success": True}
    else:
        return {"error": f"FFmpeg error: {result.stderr}"}

def trim_video(input_path, output_path, options):
    """Trim video to specified time range"""
    start_time = options.get('start_time', 0)
    end_time = options.get('end_time')
    duration = options.get('duration')
    fast_copy = options.get('fast_copy', True)
    
    cmd = ['ffmpeg', '-i', input_path]
    
    # Set start time
    if start_time > 0:
        cmd.extend(['-ss', str(start_time)])
    
    # Set end time or duration
    if end_time is not None:
        cmd.extend(['-to', str(end_time)])
    elif duration is not None:
        cmd.extend(['-t', str(duration)])
    else:
        cmd.extend(['-t', '10'])  # Default 10 seconds
    
    # Copy or re-encode
    if fast_copy:
        cmd.extend(['-c', 'copy'])  # Fast copy without re-encoding
    else:
        cmd.extend(['-c:v', 'libx264', '-c:a', 'aac'])  # Re-encode
    
    cmd.extend(['-y', output_path])
    
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

def get_video_duration(video_path):
    """Get video duration in seconds using ffprobe"""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return float(result.stdout.strip())
        return 0.0
    except:
        return 0.0

def merge_videos(input_path, output_path, options):
    """Merge multiple video files into one with real progress tracking"""
    # For video merger, input_path should be a directory or list of files
    video_list = options.get('video_files', [])
    if not video_list:
        return {"error": "No video files provided for merging"}
    
    # Calculate total duration for progress tracking
    total_duration = 0.0
    for video_file in video_list:
        if os.path.exists(video_file):
            duration = get_video_duration(video_file)
            total_duration += duration
    
    # Create a temporary file list for FFmpeg concat
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        concat_file = f.name
        for video_file in video_list:
            # Ensure proper path escaping
            escaped_path = video_file.replace("'", "'\"'\"'")
            f.write(f"file '{escaped_path}'\n")
    
    try:
        normalize = options.get('normalize', True)
        add_transitions = options.get('add_transitions', False)
        
        if normalize:
            # First normalize all videos to same codec/resolution, then concat
            cmd = [
                'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file,
                '-c:v', 'libx264', '-c:a', 'aac',
                '-preset', 'medium', '-crf', '23',
                '-y', '-hide_banner', '-nostats', '-progress', 'pipe:1',
                output_path
            ]
        else:
            # Try direct concat first (faster)
            cmd = [
                'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file,
                '-c', 'copy',  # Copy streams without re-encoding for speed
                '-y', '-hide_banner', '-nostats', '-progress', 'pipe:1',
                output_path
            ]
        
        # Use Popen for real-time progress tracking
        import threading
        import time
        
        # Initialize progress tracking
        progress_data = {"percent": 0, "status": "running"}
        
        def update_progress_file():
            """Update progress in a file that can be read by the API"""
            progress_file = output_path + '.progress'
            try:
                with open(progress_file, 'w') as f:
                    f.write(f"{progress_data['percent']}")
            except:
                pass
        
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
                                 universal_newlines=True, bufsize=1)
        
        # Track progress in separate thread
        def track_progress():
            last_percent = 0
            while process.poll() is None:
                try:
                    if process.stdout:
                        line = process.stdout.readline()
                        if line:
                            # Parse FFmpeg progress output
                            if 'out_time_ms=' in line:
                                time_ms = int(line.split('=')[1].strip()) / 1000000.0  # Convert microseconds to seconds
                                if total_duration > 0:
                                    percent = min(99, max(0, int((time_ms / total_duration) * 100)))
                                    if percent > last_percent:
                                        last_percent = percent
                                        progress_data["percent"] = percent
                                        update_progress_file()
                except:
                    continue
        
        progress_thread = threading.Thread(target=track_progress)
        progress_thread.start()
        
        # Wait for process to complete
        stdout, stderr = process.communicate()
        progress_thread.join(timeout=1)
        
        if process.returncode == 0:
            progress_data["percent"] = 100
            progress_data["status"] = "completed"
            update_progress_file()
            return {"success": True}
        else:
            progress_data["status"] = "failed"
            return {"error": f"Video merge failed: {stderr}"}
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