import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  isRevisionUniqueConflict,
  resolvePublishedAtPreservation,
  snapshotArticle,
  snapshotToUpdateData,
} from './revisions.js';

describe('resolvePublishedAtPreservation', () => {
  it('keeps existing publishedAt', () => {
    const existing = new Date('2026-01-15T12:00:00.000Z');
    assert.equal(
      resolvePublishedAtPreservation(existing, '2025-01-01T00:00:00.000Z')?.toISOString(),
      existing.toISOString()
    );
  });

  it('uses snapshot publishedAt when existing is null', () => {
    const result = resolvePublishedAtPreservation(null, '2026-03-01T10:00:00.000Z');
    assert.equal(result?.toISOString(), '2026-03-01T10:00:00.000Z');
  });

  it('preserves null for legacy articles (does not invent from createdAt)', () => {
    assert.equal(resolvePublishedAtPreservation(null, null), null);
    assert.equal(resolvePublishedAtPreservation(null, undefined), null);
  });
});

describe('isRevisionUniqueConflict', () => {
  it('detects Prisma P2002', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    assert.equal(isRevisionUniqueConflict(error), true);
  });

  it('rejects other errors', () => {
    assert.equal(isRevisionUniqueConflict(new Error('nope')), false);
    assert.equal(
      isRevisionUniqueConflict(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        })
      ),
      false
    );
  });
});

describe('snapshot publishedAt', () => {
  it('serializes null publishedAt without inventing createdAt', () => {
    const article = {
      id: 'a1',
      slug: 's',
      title: 't',
      description: 'd',
      content: 'c',
      coverImage: null,
      category: 'TESTING',
      status: 'published',
      readTime: '1 min',
      featured: false,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      publishedAt: null,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      updatedAt: new Date('2020-02-01T00:00:00.000Z'),
    };
    const snap = snapshotArticle(article as never);
    assert.equal(snap.publishedAt, null);
    const data = snapshotToUpdateData(snap);
    assert.equal('publishedAt' in data, false);
  });
});
