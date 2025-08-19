import fs from "fs/promises";
import path from "path";
import type { Request, Response, NextFunction } from "express";
// @ts-ignore - heic-convert doesn't have type definitions
import heicConvert from "heic-convert";
import { OUTPUT_DIR } from "../filePaths";

const isHeicExt = (p: string) => /\.(heic|heif)$/i.test(p || "");
const isHeicMime = (m?: string) => !!m && /image\/hei(c|f)/i.test(m);

export async function heicConvertIfHeic(req: Request, res: Response, next: NextFunction) {
  try {
    // Your existing client posts to /api/convert with body like:
    // { file_id, temp_path, output_format, quality? }
    const { temp_path, output_format = "jpg", quality } = (req.body || {}) as {
      temp_path?: string; output_format?: string; quality?: number;
    };

    console.log(`HEIC Controller: received request body:`, req.body);

    // Only intercept real HEIC/HEIF
    const looksHeic = isHeicExt(temp_path || "") || isHeicMime((req as any).file?.mimetype);
    console.log(`HEIC Controller: looks like HEIC? ${looksHeic}, temp_path: ${temp_path}`);
    if (!looksHeic) return next(); // let your legacy Python flow handle non‑HEIC

    // Read input (the uploaded file already on disk)
    if (!temp_path) return res.status(400).json({ error: "Missing temp_path for HEIC file" });
    const inBuf = await fs.readFile(temp_path);

    // Convert to JPG/PNG (heic-convert only supports JPEG and PNG)
    const fmt = (output_format || "jpg").toLowerCase();
    const valid = new Set(["jpg","jpeg","png"]);
    const outFmt = valid.has(fmt) ? (fmt === "jpeg" ? "jpg" : fmt) : "jpg";
    const quality0to1 = typeof quality === "number" ? Math.max(0.1, Math.min(1, quality)) : 0.95;

    // heic-convert expects uppercase format names
    const heicFormat = outFmt === "jpg" ? "JPEG" : "PNG";
    
    console.log(`HEIC conversion: input format: ${fmt}, output format: ${outFmt}, heic format: ${heicFormat}`);

    const outBuffer = await heicConvert({
      buffer: inBuf,
      format: heicFormat,
      quality: heicFormat === "JPEG" ? quality0to1 : undefined
    });

    // Name + write output
    const base = path.basename(temp_path);
    const stamped = `${base}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${outFmt}`;
    const outPath = path.join(OUTPUT_DIR, stamped);
    await fs.writeFile(outPath, outBuffer);

    // Get file stats for size
    const stats = await fs.stat(outPath);

    // Clean up the input file after successful conversion
    await fs.unlink(temp_path);

    // Match existing success response shape used by your image convert endpoint
    return res.json({ 
      success: true, 
      output_file: stamped, 
      download_url: `/api/download/${stamped}`,
      file_size: stats.size
    });
  } catch (err) {
    console.error("HEIC convert error:", err);
    return res.status(500).json({ error: "HEIC conversion failed" });
  }
}