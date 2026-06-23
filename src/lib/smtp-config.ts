import { db } from './db.js';

export interface ResolvedSmtpConfig {
  id?: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  notifyEmail: string | null;
  active: boolean;
  source: 'database' | 'environment';
}

export function getSmtpTransportTimeouts() {
  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000);
  const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT || 15000);

  return {
    connectionTimeout: Number.isFinite(connectionTimeout) ? connectionTimeout : 10000,
    socketTimeout: Number.isFinite(socketTimeout) ? socketTimeout : 15000,
    greetingTimeout: Number.isFinite(connectionTimeout) ? connectionTimeout : 10000,
  };
}

export function getSmtpConfigFromEnv(): ResolvedSmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_KEY?.trim() || process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const fromEmail = process.env.SMTP_FROM?.trim() || 'noreply@fasttesters.com';

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: port === 465,
    user,
    pass,
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'Fast Testers',
    fromEmail,
    notifyEmail:
      process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
      process.env.SMTP_NOTIFY_EMAIL?.trim() ||
      fromEmail,
    active: true,
    source: 'environment',
  };
}

export async function resolveSmtpConfig(): Promise<ResolvedSmtpConfig | null> {
  const envConfig = getSmtpConfigFromEnv();
  if (envConfig) {
    return envConfig;
  }

  const dbConfig = await db.smtpConfig.findFirst({ where: { active: true } });
  if (dbConfig) {
    return {
      id: dbConfig.id,
      host: dbConfig.host,
      port: dbConfig.port,
      secure: dbConfig.secure,
      user: dbConfig.user,
      pass: dbConfig.pass,
      fromName: dbConfig.fromName,
      fromEmail: dbConfig.fromEmail,
      notifyEmail: dbConfig.notifyEmail,
      active: dbConfig.active,
      source: 'database',
    };
  }

  return null;
}

/** Persist SMTP_* env vars into the database when no active row exists. */
export async function syncSmtpConfigFromEnv(): Promise<void> {
  const envConfig = getSmtpConfigFromEnv();
  if (!envConfig) return;

  const existing = await db.smtpConfig.findFirst({ where: { active: true } });
  if (existing) return;

  await db.smtpConfig.create({
    data: {
      host: envConfig.host,
      port: envConfig.port,
      secure: envConfig.secure,
      user: envConfig.user,
      pass: envConfig.pass,
      fromName: envConfig.fromName,
      fromEmail: envConfig.fromEmail,
      notifyEmail: envConfig.notifyEmail,
      active: true,
    },
  });

  console.log('SMTP configuration initialized from environment variables');
}
