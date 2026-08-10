import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config.js';
import { AppError } from '../lib/errors.js';
import { audit } from '../services/audit.service.js';
import { authenticate } from '../middleware/auth.js';
export const authRoutes = Router();
authRoutes.post('/login', async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, 'E-mail ou senha inválidos');
  const token = jwt.sign({ role: user.role, name: user.name, email: user.email }, env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
  await audit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ip: req.ip });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
authRoutes.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
