import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function countLinks(html: string): { internal: number; external: number } {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  let internal = 0;
  let external = 0;
  for (const h of hrefs) {
    if (h.startsWith('http')) external++;
    else internal++;
  }
  return { internal, external };
}

async function main() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      slug: true,
      title: true,
      status: true,
      category: true,
      coverImage: true,
      content: true,
      createdAt: true,
    },
  });

  console.log(`TOTAL: ${articles.length}\n`);
  console.log('cover | html | words | int | ext | created    | slug');
  console.log('------------------------------------------------------------');
  for (const a of articles) {
    const html = a.content.trim().startsWith('<');
    const words = wordCount(a.content);
    const { internal, external } = countLinks(a.content);
    const cover = a.coverImage && a.coverImage.trim() ? 'YES' : 'no ';
    const created = a.createdAt.toISOString().slice(0, 10);
    console.log(
      `${cover}   | ${html ? 'html' : 'md  '} | ${String(words).padStart(5)} | ${String(internal).padStart(3)} | ${String(external).padStart(3)} | ${created} | ${a.slug}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
