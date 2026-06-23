import nodemailer from 'nodemailer';
import { db } from './db.js';
import {
  getSmtpTransportTimeouts,
  resolveSmtpConfig,
  type ResolvedSmtpConfig,
} from './smtp-config.js';

export const MASKED_SMTP_PASSWORD = '••••••••';

export interface SmtpCredentials {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

let cachedTransporter: nodemailer.Transporter | null | undefined;
let cachedConfigKey: string | null | undefined;

function configCacheKey(config: ResolvedSmtpConfig): string {
  return `${config.source}:${config.id || 'env'}:${config.host}:${config.port}:${config.user}`;
}

export function createSmtpTransport(config: SmtpCredentials): nodemailer.Transporter {
  const port = Number(config.port);
  const secure = port === 465 ? true : port === 587 ? false : Boolean(config.secure);
  const timeouts = getSmtpTransportTimeouts();

  return nodemailer.createTransport({
    host: config.host.trim(),
    port,
    secure,
    auth: {
      user: config.user.trim(),
      pass: config.pass,
    },
    connectionTimeout: timeouts.connectionTimeout,
    socketTimeout: timeouts.socketTimeout,
    greetingTimeout: timeouts.greetingTimeout,
    ...(port === 587 && !secure ? { requireTLS: true } : {}),
  });
}

async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; config: ResolvedSmtpConfig } | null> {
  const config = await resolveSmtpConfig();
  if (!config) {
    cachedTransporter = null;
    cachedConfigKey = null;
    return null;
  }

  const key = configCacheKey(config);
  if (cachedTransporter !== undefined && cachedConfigKey === key) {
    return { transporter: cachedTransporter!, config };
  }

  cachedTransporter = createSmtpTransport(config);
  cachedConfigKey = key;
  return { transporter: cachedTransporter, config };
}

export function clearMailerCache(): void {
  cachedTransporter = undefined;
  cachedConfigKey = undefined;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export async function sendMail(options: SendMailOptions): Promise<{ sent: boolean; error?: string }> {
  try {
    const resolved = await getTransporter();
    if (!resolved) {
      return { sent: false, error: 'SMTP is not configured' };
    }

    const { transporter, config } = resolved;

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('Send mail error:', error);
    return { sent: false, error: message };
  }
}

export async function getAdminNotifyEmail(): Promise<string | null> {
  const config = await resolveSmtpConfig();
  if (config?.notifyEmail?.trim()) {
    return config.notifyEmail.trim();
  }

  if (process.env.ADMIN_NOTIFY_EMAIL?.trim()) {
    return process.env.ADMIN_NOTIFY_EMAIL.trim();
  }

  const admin = await db.user.findFirst({
    where: { role: 'admin' },
    select: { email: true },
  });

  return admin?.email?.trim() ?? config?.fromEmail?.trim() ?? null;
}

export async function notifyAdminNewContact(contact: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ sent: boolean; error?: string }> {
  const notifyEmail = await getAdminNotifyEmail();
  if (!notifyEmail) {
    return { sent: false, error: 'No admin notification email configured' };
  }

  return sendMail({
    to: notifyEmail,
    subject: `[Fast Testers] New contact: ${contact.subject}`,
    text: [
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      `Subject: ${contact.subject}`,
      '',
      contact.message,
    ].join('\n'),
    replyTo: contact.email,
  });
}

export async function sendContactReplyEmail(contact: {
  email: string;
  name: string;
  subject: string;
  reply: string;
}): Promise<{ sent: boolean; error?: string }> {
  const escapedReply = contact.reply
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return sendMail({
    to: contact.email,
    subject: `Re: ${contact.subject}`,
    text: `Hi ${contact.name},\n\n${contact.reply}\n\n— Fast Testers Support`,
    html: `<p>Hi ${contact.name},</p><p>${escapedReply}</p><p>— Fast Testers Support</p>`,
  });
}

export async function notifyAdminNewAppSubmission(submission: {
  name: string;
  email: string;
  whatsapp: string;
  appName: string;
  packageName: string;
  testingLink: string;
  planLabel?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const notifyEmail = await getAdminNotifyEmail();
  if (!notifyEmail) {
    return { sent: false, error: 'No admin notification email configured' };
  }

  return sendMail({
    to: notifyEmail,
    subject: `[Fast Testers] New app submission: ${submission.appName}`,
    text: [
      `Name: ${submission.name}`,
      `Email: ${submission.email}`,
      `WhatsApp: ${submission.whatsapp}`,
      `App: ${submission.appName}`,
      `Package: ${submission.packageName}`,
      `Plan: ${submission.planLabel || 'Not specified'}`,
      `Testing link: ${submission.testingLink}`,
    ].join('\n'),
    replyTo: submission.email,
  });
}

export async function sendNewsletterCampaign(options: {
  subject: string;
  text: string;
  html?: string;
  recipients: string[];
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const email of options.recipients) {
    const result = await sendMail({
      to: email,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (result.sent) {
      sent += 1;
    } else {
      failed += 1;
      if (result.error) errors.push(`${email}: ${result.error}`);
    }
  }

  return { sent, failed, errors };
}

export async function sendSmtpTestEmail(options: {
  config: SmtpCredentials & { fromName: string; fromEmail: string };
  to: string;
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const transporter = createSmtpTransport(options.config);
    await transporter.verify();
    await transporter.sendMail({
      from: `"${options.config.fromName}" <${options.config.fromEmail}>`,
      to: options.to,
      subject: 'Fast Testers SMTP test',
      text: 'This is a test email from your Fast Testers SMTP configuration. Sending and receiving are working.',
      html: '<p>This is a <strong>test email</strong> from your Fast Testers SMTP configuration.</p><p>Sending and receiving are working.</p>',
    });
    transporter.close();
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send test email';
    console.error('SMTP test email error:', error);
    return { sent: false, error: message };
  }
}
