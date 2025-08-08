/**
 * Shared filename formatting utilities
 * Implements consistent naming across all converters
 */

/**
 * Format output filename with consistent pattern
 * Pattern: <base>_to_<targetExt>_<yyyyMMdd-HHmm>.<targetExt>
 * @param originalName - Original filename
 * @param targetExt - Target file extension (without dot)
 * @returns Formatted filename
 */
export function formatOutputFilename(originalName: string, targetExt: string): string {
  // Remove path and get base filename
  const baseName = originalName.split(/[/\\]/).pop() || 'file';
  
  // Remove all extensions and sanitize
  const cleanBase = baseName
    .replace(/\.[^.]*$/, '') // Remove last extension
    .replace(/\.[^.]*$/, '') // Remove potential double extension
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace unsafe chars with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim leading/trailing underscores
  
  // Generate timestamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const timestamp = `${year}${month}${day}-${hour}${minute}`;
  
  // Ensure we have a base name
  const finalBase = cleanBase || 'converted';
  
  return `${finalBase}_to_${targetExt}_${timestamp}.${targetExt}`;
}

/**
 * Extract file extension from filename
 * @param filename - File name
 * @returns Extension without dot, or empty string if none
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Sanitize filename for safe filesystem usage
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace unsafe chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Trim leading/trailing underscores
    .substring(0, 100); // Limit length
}

/**
 * Generate unique filename to avoid conflicts
 * @param baseFilename - Base filename
 * @param extension - File extension (with or without dot)
 * @returns Unique filename with timestamp
 */
export function generateUniqueFilename(baseFilename: string, extension: string): string {
  const cleanExt = extension.startsWith('.') ? extension.slice(1) : extension;
  const sanitized = sanitizeFilename(baseFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${sanitized}_${timestamp}_${random}.${cleanExt}`;
}