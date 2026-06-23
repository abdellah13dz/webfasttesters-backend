import { Router } from 'express';
import { db } from '../../lib/db.js';
import {
  clearMailerCache,
  createSmtpTransport,
  MASKED_SMTP_PASSWORD,
  sendSmtpTestEmail,
} from '../../lib/mailer.js';
import { resolveSmtpConfig } from '../../lib/smtp-config.js';

const router = Router();

function serializeConfig(config: {
  id?: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
  notifyEmail: string | null;
  active: boolean;
  source?: 'database' | 'environment';
}) {
  return {
    id: config.id,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: MASKED_SMTP_PASSWORD,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    notifyEmail: config.notifyEmail || '',
    active: config.active,
    source: config.source || 'database',
  };
}

function shouldUpdatePassword(pass: unknown): pass is string {
  return typeof pass === 'string' && pass.trim().length > 0 && pass !== MASKED_SMTP_PASSWORD;
}

router.get('/', async (_req, res) => {
  try {
    const config = await resolveSmtpConfig();
    if (!config) return res.json({ config: null });

    res.json({ config: serializeConfig(config) });
  } catch (error) {
    console.error('Get SMTP config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body;

    if (body.action === 'test') {
      const useSaved = body.useSaved === true;
      const testEmail = typeof body.testEmail === 'string' ? body.testEmail.trim() : '';

      let credentials: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        fromName: string;
        fromEmail: string;
      };

      if (useSaved) {
        const saved = await resolveSmtpConfig();
        if (!saved) {
          return res.status(400).json({ error: 'No saved SMTP configuration found' });
        }
        credentials = saved;
      } else {
        const { host, port, secure, user, pass, fromName, fromEmail } = body;
        if (!host || !port || !user) {
          return res.status(400).json({ error: 'host, port, and user are required for testing' });
        }

        let resolvedPass = pass;
        if (!shouldUpdatePassword(resolvedPass)) {
          const saved = await resolveSmtpConfig();
          if (!saved) {
            return res.status(400).json({ error: 'Password is required to test the connection' });
          }
          resolvedPass = saved.pass;
        }

        credentials = {
          host: String(host),
          port: Number(port),
          secure: Boolean(secure),
          user: String(user),
          pass: String(resolvedPass),
          fromName: fromName || 'Fast Testers',
          fromEmail: fromEmail || 'support@fasttesters.com',
        };
      }

      if (testEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(testEmail)) {
          return res.status(400).json({ error: 'Invalid test email address' });
        }

        const result = await sendSmtpTestEmail({
          config: credentials,
          to: testEmail,
        });

        if (!result.sent) {
          return res.status(400).json({ success: false, error: result.error || 'Failed to send test email' });
        }

        return res.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
        });
      }

      const transporter = createSmtpTransport(credentials);
      try {
        await transporter.verify();
        res.json({ success: true, message: 'SMTP connection successful' });
      } catch (verifyError) {
        const message = verifyError instanceof Error ? verifyError.message : 'SMTP connection failed';
        res.status(400).json({ success: false, error: message });
      } finally {
        transporter.close();
      }
      return;
    }

    const { host, port, secure, user, pass, fromName, fromEmail, notifyEmail } = body;
    if (!host || !port || !user) {
      return res.status(400).json({ error: 'host, port, and user are required' });
    }

    const existing = await db.smtpConfig.findFirst({ where: { active: true } });

    if (!existing && !shouldUpdatePassword(pass)) {
      return res.status(400).json({ error: 'Password is required when creating SMTP configuration' });
    }

    const data = {
      host: String(host).trim(),
      port: Number(port),
      secure: Boolean(secure),
      user: String(user).trim(),
      fromName: (fromName || 'Fast Testers').trim(),
      fromEmail: (fromEmail || 'support@fasttesters.com').trim(),
      notifyEmail: notifyEmail ? String(notifyEmail).trim() : null,
    };

    let config;
    if (existing) {
      const updateData: Record<string, unknown> = { ...data };
      if (shouldUpdatePassword(pass)) {
        updateData.pass = String(pass);
      }
      config = await db.smtpConfig.update({ where: { id: existing.id }, data: updateData });
    } else {
      config = await db.smtpConfig.create({
        data: {
          ...data,
          pass: String(pass),
        },
      });
    }

    clearMailerCache();

    res.json({ config: serializeConfig(config) });
  } catch (error) {
    console.error('SMTP config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
