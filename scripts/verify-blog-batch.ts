import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ARTICLES } from './blog-batch-content.js';

const prisma = new PrismaClient();

async function main() {
  const slugs = ARTICLES.map((a) => a.slug);
  const rows = await prisma.article.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, title: true, status: true, category: true, content: true, seoTitle: true },
    orderBy: { createdAt: 'desc' },
  });
  for (const r of rows) {
    const words = r.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const html = r.content.trim().startsWith('<');
    console.log(`${r.status} | ${r.category} | words=${words} | html=${html} | ${r.slug}`);
  }
  console.log(`\nVerified ${rows.length}/${slugs.length} articles present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
