import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_PREFIX = 'ft_auto_';

export function generateAutomationToken(): { token: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString('base64url');
  const token = `${TOKEN_PREFIX}${secret}`;
  return {
    token,
    prefix: token.slice(0, 16),
    hash: hashAutomationToken(token),
  };
}

export function hashAutomationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function looksLikeAutomationToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length >= 40;
}
