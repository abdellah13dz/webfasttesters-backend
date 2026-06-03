import nodemailer from 'nodemailer';
import { db } from './db.js';

let cachedTransporter: nodemailer.Transporter | null | undefined;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const config = await db.smtpConfig.findFirst({ where: { active: true } });
  if (!config) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

export function clearMailerCache(): void {
  cachedTransporter = undefined;
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
    const transporter = await getTransporter();
    if (!transporter) {
      return { sent: false, error: 'SMTP is not configured' };
    }

    const config = await db.smtpConfig.findFirst({ where: { active: true } });
    if (!config) {
      return { sent: false, error: 'SMTP is not configured' };
    }

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
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    return process.env.ADMIN_NOTIFY_EMAIL;
  }

  const admin = await db.user.findFirst({
    where: { role: 'admin' },
    select: { email: true },
  });

  return admin?.email ?? null;
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
