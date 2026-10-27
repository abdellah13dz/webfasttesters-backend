export const AUTOMATION_SCOPES = [
  'blog:read',
  'blog:draft:create',
  'blog:draft:update',
  'media:upload',
  'blog:publish',
  'blog:update_published',
  'blog:revisions:read',
  'blog:rollback',
] as const;

export type AutomationScope = (typeof AUTOMATION_SCOPES)[number];

export const DEFAULT_AUTOMATION_SCOPES: AutomationScope[] = [
  'blog:read',
  'blog:draft:create',
  'blog:draft:update',
];

export function parseScopes(raw: string): AutomationScope[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (scope): scope is AutomationScope =>
        typeof scope === 'string' && (AUTOMATION_SCOPES as readonly string[]).includes(scope)
    );
  } catch {
    return [];
  }
}

export function hasScope(scopes: AutomationScope[], required: AutomationScope): boolean {
  return scopes.includes(required);
}
