import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import { insertConversionSchema } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from client directory
  const clientPath = path.resolve(import.meta.dirname, "../client");
  app.use(express.static(clientPath));

  // API Routes for database operations
  app.post('/api/conversions', async (req, res) => {
    try {
      const conversionData = insertConversionSchema.parse(req.body);
      const conversion = await storage.createConversion(conversionData);
      res.status(201).json(conversion);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid conversion data", details: error.errors });
      }
      console.error("Error tracking conversion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getConversionStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Handle HTML routes for clean URLs
  app.get('/heic-to-jpg', (req, res) => {
    res.sendFile(path.join(clientPath, 'heic-to-jpg.html'));
  });

  app.get('/jpg-to-png', (req, res) => {
    res.sendFile(path.join(clientPath, 'jpg-to-png.html'));
  });

  app.get('/pdf-merge', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-merge.html'));
  });

  app.get('/pdf-split', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-split.html'));
  });

  app.get('/mp4-to-mp3', (req, res) => {
    res.sendFile(path.join(clientPath, 'mp4-to-mp3.html'));
  });

  app.get('/video-compress', (req, res) => {
    res.sendFile(path.join(clientPath, 'video-compress.html'));
  });

  app.get('/audio-converter', (req, res) => {
    res.sendFile(path.join(clientPath, 'audio-converter.html'));
  });

  app.get('/pdf-compress', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-compress.html'));
  });

  app.get('/pdf-to-word', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-to-word.html'));
  });

  app.get('/video-trim', (req, res) => {
    res.sendFile(path.join(clientPath, 'video-trim.html'));
  });

  app.get('/gif-maker', (req, res) => {
    res.sendFile(path.join(clientPath, 'gif-maker.html'));
  });

  app.get('/video-merger', (req, res) => {
    res.sendFile(path.join(clientPath, 'video-merger.html'));
  });

  app.get('/pdf-rotate', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-rotate.html'));
  });

  app.get('/pdf-watermark', (req, res) => {
    res.sendFile(path.join(clientPath, 'pdf-watermark.html'));
  });

  app.get('/convert-to-jpeg', (req, res) => {
    res.sendFile(path.join(clientPath, 'convert-to-jpeg.html'));
  });

  // Fallback to index.html for other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  const httpServer = createServer(app);
  return httpServer;
}
