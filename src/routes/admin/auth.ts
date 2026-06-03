import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signAdminToken } from '../../lib/auth.js';
import { db } from '../../lib/db.js';
import { writeAuditLog } from '../../middleware/auditAdmin.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    }

    const token = signAdminToken({
      sub: user.id,
      email: user.email ?? email,
      role: user.role,
      name: user.name,
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });

    void writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? email,
      action: 'login',
      entity: 'auth',
      ip: typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : req.ip || null,
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
