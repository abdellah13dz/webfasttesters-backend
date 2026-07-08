/**
 * Seed blog batch 3 (Cluster 6 + 8 gaps) into PostgreSQL (Supabase).
 *
 * Usage:
 *   npx tsx scripts/seed-blog-batch-3.ts
 *   npx tsx scripts/seed-blog-batch-3.ts --update   # overwrite existing slugs
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ARTICLES } from './blog-batch-content-3.js';

const prisma = new PrismaClient();
const UPDATE = process.argv.includes('--update');

async function main() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const article of ARTICLES) {
    const existing = await prisma.article.findUnique({ where: { slug: article.slug } });

    if (existing) {
      if (UPDATE) {
        await prisma.article.update({ where: { slug: article.slug }, data: article });
        updated++;
        console.log(`UPDATED  ${article.slug}`);
      } else {
        skipped++;
        console.log(`SKIP     ${article.slug} (already exists)`);
      }
      continue;
    }

    await prisma.article.create({ data: article });
    created++;
    console.log(`CREATED  ${article.slug}`);
  }

  console.log(`\nDone. Created ${created}, updated ${updated}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
