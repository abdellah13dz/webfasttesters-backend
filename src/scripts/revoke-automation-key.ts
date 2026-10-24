/**
 * Revoke an automation API key by id or key prefix.
 *
 * Usage:
 *   npx tsx src/scripts/revoke-automation-key.ts --id clxxxxxxxx
 *   npx tsx src/scripts/revoke-automation-key.ts --prefix ft_auto_xxxxx
 */
import 'dotenv/config';
import { applyDatabaseUrlEnv } from '../lib/database-url.js';

applyDatabaseUrlEnv();

import { db } from '../lib/db.js';

function argValue(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const id = argValue(argv, '--id');
  const prefix = argValue(argv, '--prefix');

  if (!id && !prefix) {
    throw new Error('Provide --id <keyId> or --prefix <keyPrefix>');
  }

  const record = id
    ? await db.automationApiKey.findUnique({ where: { id } })
    : await db.automationApiKey.findFirst({ where: { keyPrefix: prefix! } });

  if (!record) {
    throw new Error('Automation API key not found');
  }

  const updated = await db.automationApiKey.update({
    where: { id: record.id },
    data: { active: false, revokedAt: new Date() },
  });

  console.log(`Revoked automation key ${updated.id} (${updated.name}, prefix ${updated.keyPrefix})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
