import { Router } from 'express';
import { AppointmentController } from '../controllers/appointmentController';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', requireAuth, AppointmentController.create);
router.get('/', requireAuth, AppointmentController.list);
router.patch('/:id/status', requireAuth, AppointmentController.updateStatus);

export default router;
