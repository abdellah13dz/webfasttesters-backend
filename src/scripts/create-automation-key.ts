/**
 * Create a scoped automation API key for Make.com.
 *
 * Usage:
 *   npx tsx src/scripts/create-automation-key.ts --name "Make.com Production"
 *
 * The plaintext token is printed once. Store it in Make.com credentials only.
 */
import 'dotenv/config';
import { applyDatabaseUrlEnv } from '../lib/database-url.js';

applyDatabaseUrlEnv();

import { db } from '../lib/db.js';
import { DEFAULT_AUTOMATION_SCOPES } from '../lib/automation/scopes.js';
import { generateAutomationToken } from '../lib/automation/tokens.js';

function parseName(argv: string[]): string {
  const idx = argv.indexOf('--name');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return 'Make.com Automation';
}

async function main() {
  const name = parseName(process.argv.slice(2));
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

  console.log('Automation API key created.');
  console.log('');
  console.log(`  id:     ${record.id}`);
  console.log(`  name:   ${record.name}`);
  console.log(`  prefix: ${record.keyPrefix}`);
  console.log(`  scopes: ${record.scopes}`);
  console.log('');
  console.log('Store this token in Make.com (shown once):');
  console.log('');
  console.log(`  ${token}`);
  console.log('');
  console.log('Authorize requests with:');
  console.log('  Authorization: Bearer <token>');
  console.log('  — or —');
  console.log('  X-Api-Key: <token>');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
