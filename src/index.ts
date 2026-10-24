import 'dotenv/config';
import { applyDatabaseUrlEnv } from './lib/database-url.js';

applyDatabaseUrlEnv();

import { createApp } from './app.js';
import { syncSmtpConfigFromEnv } from './lib/smtp-config.js';
import { isR2Configured } from './lib/uploads.js';
import { getUploadStorageMode } from './lib/r2.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

if (!isR2Configured()) {
  console.warn('R2 is not configured — uploads will be stored on local disk under /uploads');
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Upload storage: ${getUploadStorageMode()}`);
  syncSmtpConfigFromEnv().catch((error) => {
    console.error('SMTP env sync failed:', error);
  });
});
