import { Router } from 'express';
import { NoteController } from '../controllers/noteController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', requireAuth, NoteController.listNotes);
router.post('/generate', requireAuth, NoteController.generateDraft);
router.get('/:noteId', requireAuth, NoteController.getNote);
router.put('/:noteId/approve', requireAuth, requireRole(['DOCTOR', 'ADMIN']), NoteController.approveNote);
router.get('/:noteId/diff', requireAuth, NoteController.getNoteDiff);

export default router;
