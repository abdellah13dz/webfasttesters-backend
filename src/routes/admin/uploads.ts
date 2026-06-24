import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  UploadFolder,
  buildObjectKey,
  isAllowedUpload,
  sanitizeFilename,
} from '../../lib/uploads.js';
import { getUploadStorageMode, storeUploadedFile } from '../../lib/r2.js';

function createUploader(maxBytes: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
  });
}

const imageUpload = createUploader(MAX_IMAGE_BYTES);
const fileUpload = createUploader(MAX_FILE_BYTES);

const router = Router();

router.get('/config', (_req, res) => {
  res.json({
    storage: getUploadStorageMode(),
    maxImageBytes: MAX_IMAGE_BYTES,
    maxFileBytes: MAX_FILE_BYTES,
  });
});

async function handleUpload(
  req: Request,
  res: Response,
  mode: 'image' | 'file',
  folder: UploadFolder
) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const validationError = isAllowedUpload(
      req.file.mimetype,
      req.file.originalname,
      mode
    );
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const filename = sanitizeFilename(req.file.originalname);
    const key = buildObjectKey(folder, filename);
    const stored = await storeUploadedFile(key, req.file.buffer, req.file.mimetype);

    res.json({
      url: stored.url,
      key,
      filename,
      storage: stored.storage,
      contentType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
}

function runUpload(
  upload: multer.Multer,
  mode: 'image' | 'file',
  folder: UploadFolder,
  maxLabel: string
) {
  return (req: Request, res: Response) => {
    upload.single('file')(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: `${maxLabel} file is too large` });
        }
        return res.status(400).json({ error: error.message });
      }

      if (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }

      void handleUpload(req, res, mode, folder);
    });
  };
}

router.post('/image', runUpload(imageUpload, 'image', 'blog', 'Image'));
router.post('/file', runUpload(fileUpload, 'file', 'files', 'File'));

export default router;
