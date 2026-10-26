import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { applyDatabaseUrlEnv } from '../../../lib/database-url.js';
import { generateAutomationToken } from '../../../lib/automation/tokens.js';
import { DEFAULT_AUTOMATION_SCOPES } from '../../../lib/automation/scopes.js';

// Force local disk storage before app/r2 modules load (CI-safe, no real R2).
process.env.R2_ACCOUNT_ID = '';
process.env.R2_ACCESS_KEY_ID = '';
process.env.R2_SECRET_ACCESS_KEY = '';
process.env.R2_BUCKET_NAME = '';
process.env.R2_PUBLIC_URL = '';

applyDatabaseUrlEnv();

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

function pngFixture(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
    0x77, 0x53, 0xde,
  ]);
}

describe('automation uploads route (local storage)', { skip: !hasDb }, () => {
  let server: Server;
  let baseUrl = '';
  let tokenWithUpload = '';
  let tokenNoUpload = '';
  let keyWithUploadId = '';
  let keyNoUploadId = '';
  const createdKeys: string[] = [];

  before(async () => {
    const { db } = await import('../../../lib/db.js');
    const { createApp } = await import('../../../app.js');

    const withUpload = generateAutomationToken();
    tokenWithUpload = withUpload.token;
    const noUpload = generateAutomationToken();
    tokenNoUpload = noUpload.token;

    const stamp = Date.now();
    const createdUpload = await db.automationApiKey.create({
      data: {
        name: `upload-test-${stamp}`,
        keyPrefix: withUpload.prefix,
        keyHash: withUpload.hash,
        scopes: JSON.stringify([...DEFAULT_AUTOMATION_SCOPES, 'media:upload']),
        active: true,
        rateLimit: 120,
      },
    });
    keyWithUploadId = createdUpload.id;

    const createdNo = await db.automationApiKey.create({
      data: {
        name: `noup-test-${stamp}`,
        keyPrefix: noUpload.prefix,
        keyHash: noUpload.hash,
        scopes: JSON.stringify(DEFAULT_AUTOMATION_SCOPES),
        active: true,
        rateLimit: 120,
      },
    });
    keyNoUploadId = createdNo.id;

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('bind failed');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    const { db } = await import('../../../lib/db.js');
    const { UPLOAD_ROOT } = await import('../../../lib/uploads.js');
    for (const key of createdKeys) {
      const full = path.join(UPLOAD_ROOT, key);
      fs.rmSync(full, { force: true });
    }
    if (keyWithUploadId) {
      await db.automationApiKey.deleteMany({ where: { id: keyWithUploadId } }).catch(() => undefined);
    }
    if (keyNoUploadId) {
      await db.automationApiKey.deleteMany({ where: { id: keyNoUploadId } }).catch(() => undefined);
    }
    await new Promise<void>((resolve, reject) => {
      if (!server) return resolve();
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await db.$disconnect();
  });

  async function postMultipart(
    token: string | null,
    parts: { name: string; filename?: string; contentType?: string; body: Buffer | string }[]
  ) {
    const boundary = '----FastTestersTestBoundary7MA4YWxk';
    const chunks: Buffer[] = [];

    for (const part of parts) {
      chunks.push(Buffer.from(`--${boundary}\r\n`));
      if (part.filename) {
        chunks.push(
          Buffer.from(
            `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: ${part.contentType || 'application/octet-stream'}\r\n\r\n`
          )
        );
        chunks.push(typeof part.body === 'string' ? Buffer.from(part.body) : part.body);
        chunks.push(Buffer.from('\r\n'));
      } else {
        chunks.push(
          Buffer.from(
            `Content-Disposition: form-data; name="${part.name}"\r\n\r\n${String(part.body)}\r\n`
          )
        );
      }
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(chunks);

    const headers: Record<string, string> = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/automation/v1/uploads/image`, {
      method: 'POST',
      headers,
      body,
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: response.status, json };
  }

  it('rejects missing API key', async () => {
    const res = await postMultipart(null, [
      { name: 'file', filename: 'a.png', contentType: 'image/png', body: pngFixture() },
    ]);
    assert.equal(res.status, 401);
  });

  it('rejects Admin JWT shape (non ft_auto token)', async () => {
    const res = await postMultipart('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.sig', [
      { name: 'file', filename: 'a.png', contentType: 'image/png', body: pngFixture() },
    ]);
    assert.equal(res.status, 401);
  });

  it('rejects key without media:upload', async () => {
    const res = await postMultipart(tokenNoUpload, [
      { name: 'file', filename: 'a.png', contentType: 'image/png', body: pngFixture() },
    ]);
    assert.equal(res.status, 403);
  });

  it('uploads valid PNG with media:upload under blog/', async () => {
    const res = await postMultipart(tokenWithUpload, [
      { name: 'file', filename: 'cover.png', contentType: 'image/png', body: pngFixture() },
    ]);
    assert.equal(res.status, 201);
    const body = res.json as {
      url: string;
      key: string;
      contentType: string;
      storage: string;
      filename: string;
      size: number;
    };
    assert.match(body.key, /^blog\//);
    assert.equal(body.contentType, 'image/png');
    assert.equal(body.storage, 'local');
    assert.ok(body.url.includes('/uploads/blog/'));
    assert.ok(body.size > 0);
    createdKeys.push(body.key);

    const { UPLOAD_ROOT } = await import('../../../lib/uploads.js');
    assert.equal(fs.existsSync(path.join(UPLOAD_ROOT, body.key)), true);
  });

  it('rejects missing file field', async () => {
    const res = await postMultipart(tokenWithUpload, [{ name: 'note', body: 'no-file' }]);
    assert.equal(res.status, 400);
  });

  it('rejects MIME spoofed payload', async () => {
    const res = await postMultipart(tokenWithUpload, [
      {
        name: 'file',
        filename: 'evil.png',
        contentType: 'image/png',
        body: Buffer.from('MZ not an image at all!!!!!!!!'),
      },
    ]);
    assert.equal(res.status, 400);
  });

  it('rejects oversized upload with 413', async () => {
    const huge = Buffer.alloc(5 * 1024 * 1024 + 1024, 0xff);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    const res = await postMultipart(tokenWithUpload, [
      { name: 'file', filename: 'big.jpg', contentType: 'image/jpeg', body: huge },
    ]);
    assert.equal(res.status, 413);
  });
});

describe('R2 public URL builder', () => {
  it('builds HTTPS assets URL from R2_PUBLIC_URL + key', async () => {
    const prev = process.env.R2_PUBLIC_URL;
    process.env.R2_PUBLIC_URL = 'https://assets.fasttesters.com';
    const { buildR2PublicUrl } = await import('../../../lib/r2.js');
    assert.equal(
      buildR2PublicUrl('blog/example-image.webp'),
      'https://assets.fasttesters.com/blog/example-image.webp'
    );
    process.env.R2_PUBLIC_URL = prev;
  });
});
