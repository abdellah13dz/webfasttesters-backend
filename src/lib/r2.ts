import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import {
  UPLOAD_ROOT,
  buildLocalUploadUrl,
  isR2Configured,
} from './uploads.js';

let cachedClient: S3Client | null | undefined;

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }

  const endpoint =
    process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;

  cachedClient = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
}

export function buildR2PublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (!base) {
    throw new Error('R2_PUBLIC_URL is not configured');
  }
  return `${base}/${key.replace(/^\/+/, '')}`;
}

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!bucket) {
    throw new Error('R2_BUCKET_NAME is not configured');
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return buildR2PublicUrl(key);
}

function uploadToLocalDisk(key: string, body: Buffer): string {
  const fullPath = path.join(UPLOAD_ROOT, key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, body);
  return buildLocalUploadUrl(key);
}

export async function storeUploadedFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string; storage: 'r2' | 'local' }> {
  if (isR2Configured()) {
    const url = await uploadToR2(key, body, contentType);
    return { url, storage: 'r2' };
  }

  const url = uploadToLocalDisk(key, body);
  return { url, storage: 'local' };
}

export function getUploadStorageMode(): 'r2' | 'local' {
  return isR2Configured() ? 'r2' : 'local';
}
