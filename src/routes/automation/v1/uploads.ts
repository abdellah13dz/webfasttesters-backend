import { Router, type Response } from 'express';
import multer from 'multer';
import {
  MAX_IMAGE_BYTES,
  buildObjectKey,
  sanitizeFilename,
} from '../../../lib/uploads.js';
import { storeUploadedFile } from '../../../lib/r2.js';
import { validateAutomationImageUpload } from '../../../lib/automation/image-content.js';
import { fail } from '../../../lib/automation/response.js';
import { writeAuditLog } from '../../../middleware/auditAdmin.js';
import {
  requireAutomationScope,
  type AutomationRequest,
} from '../../../middleware/requireAutomation.js';

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

function clientIp(req: AutomationRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
}

/**
 * POST /uploads/image
 * multipart field: file
 * Scope: media:upload
 * Reuses Admin R2/local storage helpers; folder locked to blog/.
 */
router.post(
  '/image',
  requireAutomationScope('media:upload'),
  (req: AutomationRequest, res: Response) => {
    imageUpload.single('file')(req, res, (error) => {
      void (async () => {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return fail(res, 413, 'Image file is too large', {
              max_bytes: MAX_IMAGE_BYTES,
            });
          }
          return fail(res, 400, error.message);
        }

        if (error) {
          return fail(
            res,
            400,
            error instanceof Error ? error.message : 'Upload failed'
          );
        }

        try {
          if (!req.file) {
            return fail(res, 400, 'No file provided', { field: 'file' });
          }

          const validation = validateAutomationImageUpload(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
          );

          if (!validation.ok) {
            return fail(res, 400, validation.error);
          }

          // Server-generated name under blog/ only — client cannot choose object key.
          const filename = sanitizeFilename(req.file.originalname);
          const key = buildObjectKey('blog', filename);

          const stored = await storeUploadedFile(
            key,
            req.file.buffer,
            validation.contentType
          );

          const payload = {
            url: stored.url,
            key,
            filename,
            storage: stored.storage,
            contentType: validation.contentType,
            size: req.file.size,
          };

          const keyCtx = req.automationKey;
          if (keyCtx) {
            void writeAuditLog({
              userId: keyCtx.id,
              userEmail: `automation:${keyCtx.name}`,
              action: 'upload',
              entity: 'automation_media',
              entityId: key,
              metadata: {
                method: 'POST',
                path: req.originalUrl,
                request_id: res.locals.requestId,
                content_type: validation.contentType,
                size: req.file.size,
                storage: stored.storage,
                // Never log Authorization or the API token.
              },
              ip: clientIp(req),
            });
          }

          return res.status(201).json({
            request_id: res.locals.requestId,
            data: payload,
            // Flat fields for Make.com / Admin-compatible consumers
            ...payload,
          });
        } catch (uploadError) {
          console.error(
            'Automation image upload error:',
            uploadError instanceof Error ? uploadError.message : 'unknown'
          );
          return fail(res, 500, 'Upload failed');
        }
      })();
    });
  }
);

export default router;
