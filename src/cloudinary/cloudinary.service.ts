import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Parse a standard res.cloudinary.com HTTPS URL for this account into API delete params.
   * Skips transformation segments (e.g. w_400,c_scale) when present.
   */
  private parseSecureUrl(secureUrl: string): {
    resourceType: 'image' | 'video' | 'raw';
    publicId: string;
  } | null {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !secureUrl?.trim()) return null;
    try {
      const u = new URL(secureUrl.trim());
      if (u.hostname !== 'res.cloudinary.com') return null;
      const prefix = `/${cloudName}/`;
      if (!u.pathname.startsWith(prefix)) return null;
      const afterCloud = u.pathname.slice(prefix.length);
      const m = afterCloud.match(/^(image|video|raw)\/upload\/(.+)$/);
      if (!m) return null;
      const resourceType = m[1] as 'image' | 'video' | 'raw';
      const parts = m[2].split('/').filter(Boolean);
      let i = 0;
      while (i < parts.length) {
        const seg = parts[i];
        if (seg.includes(',') || /^[a-z]{1,6}_[a-z0-9,_-]+$/i.test(seg)) {
          i += 1;
          continue;
        }
        break;
      }
      if (i < parts.length && /^v\d+$/i.test(parts[i])) {
        i += 1;
      }
      const pubParts = parts.slice(i);
      if (pubParts.length === 0) return null;
      const last = pubParts.length - 1;
      pubParts[last] = pubParts[last].replace(/\.[^/.]+$/, '');
      const publicId = pubParts.join('/');
      if (!publicId) return null;
      return { resourceType, publicId };
    } catch {
      return null;
    }
  }

  async deleteBySecureUrl(secureUrl: string): Promise<void> {
    const parsed = this.parseSecureUrl(secureUrl);
    if (!parsed) {
      throw new BadRequestException(
        'URL is not a deletable Cloudinary asset for this account',
      );
    }
    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(
        parsed.publicId,
        { resource_type: parsed.resourceType, invalidate: true },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          const r = result as { result?: string } | undefined;
          if (r?.result && r.result !== 'ok' && r.result !== 'not found') {
            reject(new Error(`Cloudinary destroy: ${r.result}`));
            return;
          }
          resolve();
        },
      );
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) {
            reject(new Error('Failed to upload file to Cloudinary'));
          } else {
            resolve(result?.secure_url || '');
          }
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) {
            reject(new Error('Failed to upload buffer to Cloudinary'));
          } else {
            resolve(result?.secure_url || '');
          }
        }
      );
      uploadStream.end(buffer);
    });
  }
}
