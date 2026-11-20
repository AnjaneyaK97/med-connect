import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Public Authentication Endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Authenticated Endpoints
router.get('/me', requireAuth, AuthController.getMe);

// RBAC Guard Testing Endpoints
router.get('/patient-only', requireAuth, requireRole(['PATIENT', 'ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to Patient area.',
    userId: req.user?.userId,
  });
});

router.get('/doctor-only', requireAuth, requireRole(['DOCTOR', 'ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to Doctor clinical dashboard.',
    userId: req.user?.userId,
  });
});

router.get('/admin-only', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to Admin system panel.',
    userId: req.user?.userId,
  });
});

export default router;
