import { db } from '../db.js';
import { DEFAULT_AUTOMATION_SCOPES } from './scopes.js';
import {
  generateAutomationToken,
  hashAutomationToken,
  looksLikeAutomationToken,
} from './tokens.js';

/**
 * Ensure Make.com can authenticate after deploy on hosts like Render
 * where one-off CLI scripts are awkward.
 *
 * Priority:
 * 1. AUTOMATION_API_TOKEN — sync this secret from Render env into the DB (preferred).
 * 2. If no active key exists — generate one once and print it (copy into Make, then
 *    set AUTOMATION_API_TOKEN and redeploy so restarts stop printing secrets).
 *
 * Never creates a new random key on every restart when active keys already exist.
 */
export async function ensureAutomationCredentialOnStart(): Promise<void> {
  const fromEnv = process.env.AUTOMATION_API_TOKEN?.trim();

  if (fromEnv) {
    await syncTokenFromEnv(fromEnv);
    return;
  }

  const forceBootstrap = process.env.AUTOMATION_BOOTSTRAP_ON_START === 'true';
  const activeCount = await db.automationApiKey.count({
    where: { active: true, revokedAt: null },
  });

  // Force a NEW printable key even when orphans exist (lost plaintext from tests/old boots).
  if (forceBootstrap) {
    await createAndPrintBootstrapKey('Make.com (forced bootstrap)');
    return;
  }

  if (activeCount > 0) {
    console.log(
      `[automation] ${activeCount} active API key(s) present. Set AUTOMATION_API_TOKEN on Render to sync a known secret, or set AUTOMATION_BOOTSTRAP_ON_START=true once to print a new key.`
    );
    return;
  }

  await createAndPrintBootstrapKey('Make.com (auto-bootstrap)');
}

async function syncTokenFromEnv(token: string): Promise<void> {
  if (!looksLikeAutomationToken(token)) {
    console.error(
      '[automation] AUTOMATION_API_TOKEN is set but invalid (must start with ft_auto_ and be long enough). Ignored.'
    );
    return;
  }

  const hash = hashAutomationToken(token);
  const prefix = token.slice(0, 16);
  const existing = await db.automationApiKey.findUnique({ where: { keyHash: hash } });

  if (existing) {
    if (!existing.active || existing.revokedAt) {
      await db.automationApiKey.update({
        where: { id: existing.id },
        data: { active: true, revokedAt: null },
      });
      console.log(`[automation] Re-activated API key ${existing.id} (prefix ${prefix}…) from AUTOMATION_API_TOKEN.`);
    } else {
      console.log(`[automation] AUTOMATION_API_TOKEN synced (prefix ${prefix}…, id ${existing.id}).`);
    }
    return;
  }

  const record = await db.automationApiKey.create({
    data: {
      name: process.env.AUTOMATION_API_KEY_NAME?.trim() || 'Make.com (from AUTOMATION_API_TOKEN)',
      keyPrefix: prefix,
      keyHash: hash,
      scopes: JSON.stringify(DEFAULT_AUTOMATION_SCOPES),
      active: true,
      rateLimit: Number.parseInt(process.env.AUTOMATION_API_RATE_LIMIT || '60', 10) || 60,
    },
  });

  console.log(
    `[automation] Created API key ${record.id} from AUTOMATION_API_TOKEN (prefix ${prefix}…). Token value is not logged.`
  );
}

async function createAndPrintBootstrapKey(name: string): Promise<void> {
  const { token, prefix, hash } = generateAutomationToken();

  const record = await db.automationApiKey.create({
    data: {
      name,
      keyPrefix: prefix,
      keyHash: hash,
      scopes: JSON.stringify(DEFAULT_AUTOMATION_SCOPES),
      active: true,
      rateLimit: 60,
    },
  });

  console.log('');
  console.log('========== AUTOMATION API KEY (copy once) ==========');
  console.log(`id:     ${record.id}`);
  console.log(`name:   ${record.name}`);
  console.log(`prefix: ${prefix}`);
  console.log(`token:  ${token}`);
  console.log('');
  console.log('1) Paste token into Make.com as Authorization: Bearer <token>');
  console.log('2) Also set Render env AUTOMATION_API_TOKEN to this same value');
  console.log('3) Redeploy (or restart) — future boots will sync silently and will not reprint the token');
  console.log('====================================================');
  console.log('');
}
