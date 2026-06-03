import 'dotenv/config';
import { db } from '../lib/db.js';
import { seedAll } from '../lib/seed.js';

async function main() {
  await seedAll();
  console.log('All data seeded successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
