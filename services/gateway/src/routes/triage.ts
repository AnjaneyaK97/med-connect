import { Router } from 'express';
import multer from 'multer';
import { TriageController } from '../controllers/triageController';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

// Configure Multer for in-memory audio buffering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max audio size
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.webm') || file.originalname.endsWith('.wav')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload an audio file (WebM, WAV, MP3).'));
    }
  },
});

// Triage session routes
router.post('/sessions', requireAuth, TriageController.createSession);
router.post('/sessions/:sessionId/audio', requireAuth, upload.single('audio'), TriageController.uploadAudio);
router.post('/sessions/:sessionId/analyze', requireAuth, TriageController.analyzeSession);
router.get('/jobs/:jobId', requireAuth, TriageController.getJobStatus);
router.get('/sessions/:sessionId', requireAuth, TriageController.getSession);

export default router;
