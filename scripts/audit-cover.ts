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
    select: { slug: true, coverImage: true, content: true },
  });

  const cover = articles.filter((a) => !!(a.coverImage && a.coverImage.trim()));
  const rows = cover
    .map((a) => {
      const words = wordCount(a.content);
      const { internal, external } = countLinks(a.content);
      const md = a.content.trim().startsWith('<') ? 'html' : 'MD ';
      return { slug: a.slug, words, internal, external, md };
    })
    .sort((x, y) => x.words - y.words);

  console.log(`GROUP B (cover) TOTAL: ${rows.length}\n`);
  console.log('fmt  | words | int | ext | slug');
  console.log('-----------------------------------------------');
  for (const r of rows) {
    console.log(
      `${r.md} | ${String(r.words).padStart(5)} | ${String(r.internal).padStart(3)} | ${String(r.external).padStart(3)} | ${r.slug}`,
    );
  }
  const under = rows.filter((r) => r.words < 2000).length;
  console.log(`\nunder 2000: ${under}   |   2000+: ${rows.length - under}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
