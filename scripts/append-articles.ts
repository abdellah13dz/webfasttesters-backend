/**
 * Appends HTML (new sections + links) to existing articles by slug, preserving
 * the original crafted content. Used for Group B (cover-image) articles.
 *
 * Usage:
 *   npx tsx scripts/append-articles.ts ./append-content-1.js
 *
 * The target module must export ARTICLES: Array<{
 *   slug: string;
 *   append: string;          // HTML appended to the end of existing content
 *   readTime?: string;
 *   seoTitle?: string;
 *   seoDescription?: string;
 *   seoKeywords?: string;
 * }>
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'url';
import path from 'path';

const prisma = new PrismaClient();

function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

async function main() {
  const rel = process.argv[2];
  if (!rel) {
    console.error('Provide a content module, e.g. ./append-content-1.js');
    process.exit(1);
  }
  const abs = pathToFileURL(
    path.resolve(process.cwd(), 'scripts', rel.replace(/^\.\//, '')),
  ).href;
  const mod = await import(abs);
  const ARTICLES = mod.ARTICLES as Array<{
    slug: string;
    append: string;
    readTime?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
  }>;

  let updated = 0;
  let missing = 0;
  for (const a of ARTICLES) {
    const existing = await prisma.article.findUnique({ where: { slug: a.slug } });
    if (!existing) {
      missing++;
      console.log(`MISSING  ${a.slug} (not in DB, skipped)`);
      continue;
    }
    const MARKER = `<!-- appended:${a.slug} -->`;
    let newContent: string;
    if (existing.content.includes(MARKER)) {
      const idx = existing.content.indexOf(MARKER);
      const base = existing.content.slice(0, idx).trimEnd();
      newContent = base + '\n' + MARKER + '\n' + a.append.trim() + '\n';
    } else {
      newContent =
        existing.content.trimEnd() + '\n' + MARKER + '\n' + a.append.trim() + '\n';
    }
    const data: Record<string, unknown> = { content: newContent };
    if (a.readTime !== undefined) data.readTime = a.readTime;
    if (a.seoTitle !== undefined) data.seoTitle = a.seoTitle;
    if (a.seoDescription !== undefined) data.seoDescription = a.seoDescription;
    if (a.seoKeywords !== undefined) data.seoKeywords = a.seoKeywords;
    await prisma.article.update({ where: { slug: a.slug }, data });
    updated++;
    console.log(
      `UPDATED  ${String(wordCount(newContent)).padStart(5)} words (was ${String(wordCount(existing.content)).padStart(5)}) | ${a.slug}`,
    );
  }
  console.log(`\nDone. Updated ${updated}, missing ${missing}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
