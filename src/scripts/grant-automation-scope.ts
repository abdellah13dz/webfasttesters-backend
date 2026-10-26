/**
 * Grant an extra scope (e.g. media:upload) to an existing automation API key.
 *
 * Usage:
 *   npx tsx src/scripts/grant-automation-scope.ts --prefix ft_auto_usPRENt4 --scope media:upload
 *   npx tsx src/scripts/grant-automation-scope.ts --id <keyId> --scope media:upload
 */
import 'dotenv/config';
import { applyDatabaseUrlEnv } from '../lib/database-url.js';

applyDatabaseUrlEnv();

import { db } from '../lib/db.js';
import { AUTOMATION_SCOPES, parseScopes, type AutomationScope } from '../lib/automation/scopes.js';

function argValue(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const id = argValue(argv, '--id');
  const prefix = argValue(argv, '--prefix');
  const scope = argValue(argv, '--scope') as AutomationScope | undefined;

  if (!scope || !(AUTOMATION_SCOPES as readonly string[]).includes(scope)) {
    throw new Error(`Provide --scope one of: ${AUTOMATION_SCOPES.join(', ')}`);
  }
  if (!id && !prefix) {
    throw new Error('Provide --id <keyId> or --prefix <keyPrefix>');
  }

  const record = id
    ? await db.automationApiKey.findUnique({ where: { id } })
    : await db.automationApiKey.findFirst({ where: { keyPrefix: prefix! } });

  if (!record) {
    throw new Error('Automation API key not found');
  }

  const scopes = parseScopes(record.scopes);
  if (!scopes.includes(scope)) {
    scopes.push(scope);
  }

  const updated = await db.automationApiKey.update({
    where: { id: record.id },
    data: { scopes: JSON.stringify(scopes) },
  });

  console.log(`Updated key ${updated.id} (${updated.name})`);
  console.log(`scopes: ${updated.scopes}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
