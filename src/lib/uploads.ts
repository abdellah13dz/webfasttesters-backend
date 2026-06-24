import fs from 'fs';
import path from 'path';

export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

export const MAX_IMAGE_BYTES = Number(process.env.UPLOAD_MAX_IMAGE_BYTES || 5 * 1024 * 1024);
export const MAX_FILE_BYTES = Number(process.env.UPLOAD_MAX_FILE_BYTES || 20 * 1024 * 1024);

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export const ALLOWED_FILE_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.sh',
  '.php',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.htm',
]);

export type UploadFolder = 'blog' | 'files';

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim() &&
      process.env.R2_PUBLIC_URL?.trim()
  );
}

export function ensureUploadDirs(): void {
  fs.mkdirSync(path.join(UPLOAD_ROOT, 'blog'), { recursive: true });
  fs.mkdirSync(path.join(UPLOAD_ROOT, 'files'), { recursive: true });
}

export function buildLocalUploadUrl(relativePath: string): string {
  return `/uploads/${relativePath.replace(/^\/+/, '')}`;
}

export function sanitizeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base =
    path
      .basename(original, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'file';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base}-${unique}${ext}`;
}

export function buildObjectKey(folder: UploadFolder, filename: string): string {
  return `${folder}/${filename}`;
}

export function isAllowedUpload(
  mimetype: string,
  originalname: string,
  mode: 'image' | 'file'
): string | null {
  const ext = path.extname(originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return `File type ${ext} is not allowed`;
  }

  if (mimetype.startsWith('text/html') || mimetype.includes('javascript')) {
    return 'HTML and script files are not allowed';
  }

  const allowed = mode === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
  if (!allowed.has(mimetype)) {
    return mode === 'image'
      ? 'Only JPEG, PNG, WebP, GIF, and SVG images are allowed'
      : 'This file type is not allowed';
  }

  return null;
}
