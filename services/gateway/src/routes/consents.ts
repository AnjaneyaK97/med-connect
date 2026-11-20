import { Router } from 'express';
import { ConsentController } from '../controllers/consentController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/grant', requireAuth, requireRole(['PATIENT', 'ADMIN']), ConsentController.grantConsent);
router.post('/revoke', requireAuth, requireRole(['PATIENT', 'ADMIN']), ConsentController.revokeConsent);
router.get('/', requireAuth, ConsentController.listConsents);

export default router;
