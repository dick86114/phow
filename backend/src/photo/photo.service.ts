import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Photo, Visibility } from '@prisma/client';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import * as exifParser from 'exif-parser';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class PhotoService {
  private readonly uploadDir = 'uploads';

  constructor(private prisma: PrismaService) {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'thumbs'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'compressed'), { recursive: true });
    }
  }

  public parseExif(buffer: Buffer) {
    let exifData: any = {};
    let cameraModel: string | undefined;
    let lensModel: string | undefined;
    let takenAt: Date | undefined;
    let location: string | undefined;
    let gps: { lat: number; lng: number } | undefined;

    try {
      // Method 1: exif-parser (Robust for Model, Date, GPS)
      const parser = exifParser.create(buffer);
      const result = parser.parse();
      
      if (result.tags) {
        exifData = { ...exifData, ...result.tags };

        // Camera Model
        if (result.tags.Model) {
          cameraModel = result.tags.Model;
          if (result.tags.Make && cameraModel && !cameraModel.toLowerCase().includes(result.tags.Make.toLowerCase())) {
            cameraModel = `${result.tags.Make} ${cameraModel}`;
          }
        }

        // Lens
        if (result.tags.LensModel) {
          lensModel = result.tags.LensModel;
        }

        // Date
        if (result.tags.DateTimeOriginal) {
           // exif-parser returns timestamp in seconds
           takenAt = new Date(result.tags.DateTimeOriginal * 1000);
           exifData.DateTimeOriginal = takenAt;
        }

        // GPS
        if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
           gps = {
             lat: result.tags.GPSLatitude,
             lng: result.tags.GPSLongitude
           };
           location = `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`;
        }
      }
    } catch (e) {
      console.warn('exif-parser failed:', e);
    }

    // Method 2: sharp + exif-reader (Fallback and supplement)
    // Sometimes exif-reader gets tags that exif-parser misses, or vice versa
    try {
      // Note: We don't have the exif buffer here directly, 
      // but if we need deeper tags we might need to rely on what we have.
      // Since we are processing raw file buffer, we can't use exif-reader directly on it.
      // We'll stick to exif-parser as primary.
    } catch (e) {
       // ignore
    }

    return { exifData, cameraModel, lensModel, takenAt, location, gps };
  }

  private sanitizeExif(data: any): any {
    if (data instanceof Date) {
      return data;
    }
    if (typeof data === 'string') {
      // Remove null bytes
      return data.replace(/\u0000/g, '').trim();
    }
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeExif(item));
    }
    if (typeof data === 'object' && data !== null) {
      if (Buffer.isBuffer(data)) {
        return data.toString('utf-8').replace(/\u0000/g, '').trim();
      }
      const result = {};
      for (const key in data) {
        result[key] = this.sanitizeExif(data[key]);
      }
      return result;
    }
    return data;
  }

  async processAndCreate(file: Express.Multer.File, data: any, userId: number): Promise<Photo> {
    const filename = `${Date.now()}-${file.originalname}`;
    const originalPath = path.join(this.uploadDir, filename);
    const compressedPath = path.join(this.uploadDir, 'compressed', filename);
    const thumbPath = path.join(this.uploadDir, 'thumbs', filename);

    // Save original
    await fs.writeFile(originalPath, file.buffer);

    // Parse EXIF from buffer
    const { exifData, cameraModel, lensModel, takenAt, location } = this.parseExif(file.buffer);

    // Merge manual data with EXIF data
    if (data.exif) {
      try {
        const manualExif = typeof data.exif === 'string' ? JSON.parse(data.exif) : data.exif;
        Object.assign(exifData, manualExif);
      } catch (e) {
        console.warn('Failed to parse manual EXIF data', e);
      }
    }

    // Merge individual fields if provided (overwrites EXIF or manual EXIF)
    if (data.takenAt) {
       exifData.DateTimeOriginal = new Date(data.takenAt);
    }
    if (data.iso) {
       exifData.ISO = Number(data.iso);
    }
    if (data.aperture) {
       // Aperture might be "f/1.8" or "1.8"
       const val = data.aperture.toString().replace(/^f\//i, '');
       exifData.FNumber = parseFloat(val);
    }
    if (data.shutter) {
       // Shutter might be "1/100" or "0.01"
       // If it contains '/', parse it.
       if (data.shutter.toString().includes('/')) {
          const [num, den] = data.shutter.toString().split('/');
          exifData.ExposureTime = Number(num) / Number(den);
       } else {
          // Check if it ends with 's' e.g. "2s"
          const val = data.shutter.toString().replace(/s$/i, '');
          exifData.ExposureTime = parseFloat(val);
       }
    }
    if (data.focalLength) {
       exifData.FocalLength = parseFloat(data.focalLength);
    }

    // Process image
    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    // Compress
    await image
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(compressedPath);

    // Generate Thumbnail
    await image
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toFile(thumbPath);

    return this.prisma.photo.create({
      data: {
        url: `/uploads/compressed/${filename}`,
        thumbUrl: `/uploads/thumbs/${filename}`,
        title: data.title,
        description: data.description,
        story: data.story,
        visibility: data.visibility || Visibility.PUBLIC,
        userId,
        // width/height not in schema? let's check. Assuming they are not based on error logs, but wait.
        // The error log didn't complain about width/height. It complained about thumbnailUrl.
        // Let's remove width/height if not in schema.
        // Checking schema above: Photo model does NOT have width/height.
        exif: this.sanitizeExif(exifData),
        camera: data.camera || cameraModel,
        lens: data.lens || lensModel,
        // takenAt not in schema
        location: data.location || location,
      },
    });
  }

  async findAll(visibility?: Visibility) {
    return this.prisma.photo.findMany({
      where: visibility ? { visibility } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    });
  }

  async findOne(id: number) {
    return this.prisma.photo.findUnique({
      where: { id },
      include: { 
        user: { select: { username: true } },
        comments: {
          include: { replies: true },
          where: { parentId: null }
        }
      },
    });
  }

  async getUploadActivity() {
    const activity = await this.prisma.photo.groupBy({
      by: ['createdAt'],
      _count: {
        id: true,
      },
    });
    
    // Group by date string
    const result = {};
    activity.forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];
      result[date] = (result[date] || 0) + item._count.id;
    });
    return result;
  }

  async delete(id: number) {
    return this.prisma.photo.delete({ where: { id } });
  }

  async update(id: number, data: any) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      throw new NotFoundException(`Photo #${id} not found`);
    }

    const updateData = { ...data };
    const exifData: any = (photo.exif as any) || {};

    // Map flat fields to EXIF
    if (updateData.iso !== undefined && updateData.iso !== '') {
      exifData.ISO = Number(updateData.iso);
    }
    delete updateData.iso;

    if (updateData.aperture !== undefined && updateData.aperture !== '') {
       const val = updateData.aperture.toString().replace(/^f\//i, '');
       exifData.FNumber = parseFloat(val);
    }
    delete updateData.aperture;

    if (updateData.shutter !== undefined && updateData.shutter !== '') {
       if (updateData.shutter.toString().includes('/')) {
          const [num, den] = updateData.shutter.toString().split('/');
          exifData.ExposureTime = Number(num) / Number(den);
       } else {
          const val = updateData.shutter.toString().replace(/s$/i, '');
          exifData.ExposureTime = parseFloat(val);
       }
    }
    delete updateData.shutter;

    if (updateData.focalLength !== undefined && updateData.focalLength !== '') {
       exifData.FocalLength = parseFloat(updateData.focalLength);
    }
    delete updateData.focalLength;

    if (updateData.takenAt) {
      exifData.DateTimeOriginal = updateData.takenAt;
    }
    delete updateData.takenAt;

    updateData.exif = exifData;

    return this.prisma.photo.update({
      where: { id },
      data: updateData,
    });
  }

  async regenerateAllThumbnails() {
    const photos = await this.prisma.photo.findMany();
    let count = 0;
    
    for (const photo of photos) {
      try {
        const filename = photo.url.split('/').pop();
        if (!filename) continue;
        
        const originalPath = path.join(this.uploadDir, filename);
        const thumbPath = path.join(this.uploadDir, 'thumbs', filename);
        
        // Check if original exists
        try {
            await fs.access(originalPath);
        } catch {
            console.warn(`Original file not found for photo ${photo.id}: ${originalPath}`);
            continue;
        }

        const image = sharp(await fs.readFile(originalPath));
        await image
          .resize({ width: 600, withoutEnlargement: true })
          .toFile(thumbPath);
          
        count++;
      } catch (error) {
        console.error(`Failed to regenerate thumbnail for photo ${photo.id}`, error);
      }
    }
    return { count, message: `Successfully regenerated ${count} thumbnails` };
  }

  async fixMetadata() {
    const photos = await this.prisma.photo.findMany();
    let count = 0;
    
    for (const photo of photos) {
      try {
        const filename = photo.url.split('/').pop();
        if (!filename) continue;
        
        const originalPath = path.join(this.uploadDir, filename);
        try {
            await fs.access(originalPath);
        } catch {
            continue;
        }

        const buffer = await fs.readFile(originalPath);
        const { exifData, cameraModel, lensModel, takenAt, location } = this.parseExif(buffer);

        if (Object.keys(exifData).length > 0) {
          await this.prisma.photo.update({
            where: { id: photo.id },
            data: {
              exif: this.sanitizeExif(exifData),
              camera: cameraModel || photo.camera,
              lens: lensModel || photo.lens,
              location: location || photo.location
            }
          });
          count++;
        }
      } catch (error) {
        console.error(`Failed to fix metadata for photo ${photo.id}`, error);
      }
    }
    return { count, message: `Successfully updated metadata for ${count} photos` };
  }
}
