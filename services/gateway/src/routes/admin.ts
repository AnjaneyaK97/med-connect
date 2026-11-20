import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/audit-logs', requireAuth, requireRole(['ADMIN']), AdminController.getAuditLogs);
router.get('/system-status', requireAuth, requireRole(['ADMIN']), AdminController.getSystemStatus);

export default router;
