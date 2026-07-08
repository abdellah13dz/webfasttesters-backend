import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    select: { slug: true, title: true, status: true, category: true },
  });
  console.log(`TOTAL: ${articles.length}`);
  for (const a of articles) {
    console.log(`${a.status}\t${a.category}\t${a.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
