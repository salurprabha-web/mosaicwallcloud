import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// If Redis is not available locally, we can fallback to a simple in-memory Queue for this demo setup.
// Using an array for a simple local queue fallback if we can't connect to Redis.
const memoryQueue: any[] = [];

export async function processImage(filePath: string, tileId: string) {
  try {
    const outputFileName = `${tileId}.jpg`;
    const outputPath = path.join(__dirname, '../../uploads/', outputFileName);

    await sharp(filePath)
      .resize(800, 800, {
        fit: sharp.fit.cover,
        position: sharp.strategy.entropy
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Optionally cleanup original: fs.unlinkSync(filePath);
    return `/uploads/${outputFileName}`;
  } catch (error) {
    console.error('Image processing failed:', error);
    throw error;
  }
}
