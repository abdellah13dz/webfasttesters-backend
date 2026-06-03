import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const admin = await db.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    res.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      image: admin.image,
      createdAt: admin.createdAt,
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const admin = await db.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }

      if (admin.password) {
        const isValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });
      }

      data.password = await bcrypt.hash(newPassword, 12);
    }

    const updated = await db.user.update({ where: { id: admin.id }, data });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      image: updated.image,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
