import { Router } from 'express';
import nodemailer from 'nodemailer';
import { db } from '../../lib/db.js';
import { clearMailerCache } from '../../lib/mailer.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const config = await db.smtpConfig.findFirst({ where: { active: true } });
    if (!config) return res.json({ config: null });

    res.json({
      config: {
        id: config.id,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: '••••••••',
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        active: config.active,
      },
    });
  } catch (error) {
    console.error('Get SMTP config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body;

    if (body.action === 'test') {
      const { host, port, secure, user, pass } = body;
      if (!host || !port || !user || !pass) {
        return res.status(400).json({ error: 'host, port, user, and pass are required for testing' });
      }

      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Boolean(secure),
        auth: { user, pass },
      });

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

    const { host, port, secure, user, pass, fromName, fromEmail } = body;
    if (!host || !port || !user || !pass) {
      return res.status(400).json({ error: 'host, port, user, and pass are required' });
    }

    const existing = await db.smtpConfig.findFirst({ where: { active: true } });

    let config;
    if (existing) {
      const updateData: Record<string, unknown> = {
        host,
        port: Number(port),
        secure: Boolean(secure),
        user,
        fromName: fromName || 'Fast Testers',
        fromEmail: fromEmail || 'support@fasttesters.com',
      };
      if (pass !== '••••••••') updateData.pass = pass;
      config = await db.smtpConfig.update({ where: { id: existing.id }, data: updateData });
    } else {
      config = await db.smtpConfig.create({
        data: {
          host,
          port: Number(port),
          secure: Boolean(secure),
          user,
          pass,
          fromName: fromName || 'Fast Testers',
          fromEmail: fromEmail || 'support@fasttesters.com',
        },
      });
    }

    clearMailerCache();

    res.json({
      config: {
        id: config.id,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        pass: '••••••••',
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        active: config.active,
      },
    });
  } catch (error) {
    console.error('SMTP config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
