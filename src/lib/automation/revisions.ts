import type { Article, Prisma } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import { db } from '../db.js';

export type ArticleSnapshot = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImage: string | null;
  category: string;
  status: string;
  readTime: string;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const REVISION_UNIQUE_RETRIES = 5;

export function snapshotArticle(article: Article): ArticleSnapshot {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    content: article.content,
    coverImage: article.coverImage,
    category: article.category,
    status: article.status,
    readTime: article.readTime,
    featured: article.featured,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    seoKeywords: article.seoKeywords,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export function snapshotToUpdateData(snapshot: ArticleSnapshot): Prisma.ArticleUpdateInput {
  return {
    slug: snapshot.slug,
    title: snapshot.title,
    description: snapshot.description,
    content: snapshot.content,
    coverImage: snapshot.coverImage,
    category: snapshot.category,
    status: 'published',
    readTime: snapshot.readTime,
    featured: snapshot.featured,
    seoTitle: snapshot.seoTitle,
    seoDescription: snapshot.seoDescription,
    seoKeywords: snapshot.seoKeywords,
    ...(snapshot.publishedAt
      ? { publishedAt: new Date(snapshot.publishedAt) }
      : {}),
  };
}

/**
 * Legacy published rows may have publishedAt=null after the additive migration.
 * Do NOT invent timestamps from createdAt — that is article creation, not verified publication.
 */
export function resolvePublishedAtPreservation(
  existingPublishedAt: Date | null,
  snapshotPublishedAt?: string | null
): Date | null {
  if (existingPublishedAt) return existingPublishedAt;
  if (snapshotPublishedAt) return new Date(snapshotPublishedAt);
  return null;
}

export function isRevisionUniqueConflict(error: unknown): boolean {
  return (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export async function nextRevisionNumber(articleId: string, tx: Prisma.TransactionClient = db) {
  const latest = await tx.articleRevision.findFirst({
    where: { articleId },
    orderBy: { revisionNumber: 'desc' },
    select: { revisionNumber: true },
  });
  return (latest?.revisionNumber ?? 0) + 1;
}

/**
 * Create a revision with PostgreSQL row locking so concurrent writers serialize
 * on the parent Article row before allocating revisionNumber.
 * Bounded retry on unique conflicts as a safety net.
 */
export async function createArticleRevision(input: {
  article: Article;
  reason: string;
  actorKeyId?: string | null;
  actorLabel?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  const run = async (client: Prisma.TransactionClient) => {
    // Serialize concurrent revision allocation for this article (PostgreSQL).
    await client.$queryRaw`SELECT id FROM "Article" WHERE id = ${input.article.id} FOR UPDATE`;

    let lastError: unknown;
    for (let attempt = 0; attempt < REVISION_UNIQUE_RETRIES; attempt++) {
      const revisionNumber = await nextRevisionNumber(input.article.id, client);
      try {
        return await client.articleRevision.create({
          data: {
            articleId: input.article.id,
            revisionNumber,
            snapshot: JSON.stringify(snapshotArticle(input.article)),
            reason: input.reason,
            actorKeyId: input.actorKeyId ?? null,
            actorLabel: input.actorLabel ?? null,
          },
        });
      } catch (error) {
        lastError = error;
        if (isRevisionUniqueConflict(error) && attempt < REVISION_UNIQUE_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  if (input.tx) {
    return run(input.tx);
  }

  return db.$transaction((tx) => run(tx));
}

export function parseSnapshot(raw: string): ArticleSnapshot {
  return JSON.parse(raw) as ArticleSnapshot;
}
