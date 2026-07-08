import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

async function main() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'asc' },
    select: { slug: true, coverImage: true, content: true, createdAt: true },
  });

  const noCoverShort: string[] = [];
  const noCoverLong: string[] = [];
  const cover: string[] = [];

  for (const a of articles) {
    const hasCover = !!(a.coverImage && a.coverImage.trim());
    const words = wordCount(a.content);
    if (hasCover) cover.push(a.slug);
    else if (words < 2000) noCoverShort.push(a.slug);
    else noCoverLong.push(a.slug);
  }

  console.log(`GROUP A - no cover, <2000 words (EXPAND + LINKS): ${noCoverShort.length}`);
  noCoverShort.forEach((s) => console.log(`  A ${s}`));
  console.log(`\nGROUP B - has cover (LINKS ONLY): ${cover.length}`);
  cover.forEach((s) => console.log(`  B ${s}`));
  console.log(`\nGROUP C - no cover, 2000+ words (DONE, skip): ${noCoverLong.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
