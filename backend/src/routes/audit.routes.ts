// FILE: backend/src/routes/audit.routes.ts

import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);
router.use(authorize(UserRole.HOD, UserRole.DEAN, UserRole.EXAMINATION_OFFICER));

/**
 * GET /api/audit?limit=50&offset=0
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { actor: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  res.json({ success: true, data: entries, meta: { total, limit, offset } });
});

/**
 * GET /api/audit/:entityType/:entityId
 */
router.get('/:entityType/:entityId', async (req: AuthRequest, res: Response) => {
  const entries = await prisma.auditLog.findMany({
    where: { entityType: req.params.entityType, entityId: req.params.entityId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { firstName: true, lastName: true, role: true } } },
  });

  res.json({ success: true, data: entries });
});

export default router;
