import { PasswordService } from '../services/passwordService';
import { TokenService } from '../services/tokenService';
import { registerSchema, loginSchema } from '../validators/authValidator';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { Request, Response, NextFunction } from 'express';

describe('Auth Services & Security Layer', () => {
  describe('PasswordService', () => {
    it('hashes passwords securely using bcrypt', async () => {
      const password = 'StrongPassword123!';
      const hash = await PasswordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await PasswordService.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await PasswordService.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('TokenService', () => {
    const samplePayload = {
      userId: 'usr-12345',
      email: 'doctor@mediconnect.org',
      role: 'DOCTOR' as const,
    };

    it('signs and verifies JWT access tokens', () => {
      const token = TokenService.signAccessToken(samplePayload);
      expect(typeof token).toBe('string');

      const decoded = TokenService.verifyAccessToken(token);
      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.email).toBe(samplePayload.email);
      expect(decoded.role).toBe(samplePayload.role);
    });

    it('signs and verifies JWT refresh tokens', () => {
      const refreshToken = TokenService.signRefreshToken({ userId: 'usr-12345' });
      expect(typeof refreshToken).toBe('string');

      const decoded = TokenService.verifyRefreshToken(refreshToken);
      expect(decoded.userId).toBe('usr-12345');
    });

    it('hashes tokens deterministically with SHA-256 for secure DB persistence', () => {
      const token = 'sample-refresh-token-string';
      const hash1 = TokenService.hashToken(token);
      const hash2 = TokenService.hashToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Auth Validation Schemas', () => {
    it('validates a valid patient registration', () => {
      const patientInput = {
        email: 'patient@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'PATIENT',
        phoneNumber: '+1234567890',
      };

      const result = registerSchema.safeParse(patientInput);
      expect(result.success).toBe(true);
    });

    it('validates a valid doctor registration with required license and specialization', () => {
      const doctorInput = {
        email: 'doc.smith@mediconnect.org',
        password: 'DocPassword123',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'DOCTOR',
        specialization: 'Cardiology',
        licenseNumber: 'MD-883921',
        consultationFee: 75.0,
      };

      const result = registerSchema.safeParse(doctorInput);
      expect(result.success).toBe(true);
    });

    it('rejects doctor registration without licenseNumber', () => {
      const invalidDoctorInput = {
        email: 'doc.invalid@mediconnect.org',
        password: 'DocPassword123',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'DOCTOR',
        specialization: 'Cardiology',
      };

      const result = registerSchema.safeParse(invalidDoctorInput);
      expect(result.success).toBe(false);
    });

    it('rejects weak password with fewer than 8 characters or missing digits/uppercase', () => {
      const weakPasswordInput = {
        email: 'user@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
        role: 'PATIENT',
      };

      const result = registerSchema.safeParse(weakPasswordInput);
      expect(result.success).toBe(false);
    });

    it('validates login credentials schema', () => {
      const validLogin = { email: 'patient@example.com', password: 'Password123' };
      expect(loginSchema.safeParse(validLogin).success).toBe(true);

      const invalidLogin = { email: 'not-an-email', password: '' };
      expect(loginSchema.safeParse(invalidLogin).success).toBe(false);
    });
  });

  describe('RBAC Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      mockReq = { headers: {} };
      mockRes = {};
      next = jest.fn();
    });

    it('blocks unauthenticated requests without Bearer token', () => {
      requireAuth(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: expect.stringContaining('Authentication required'),
        })
      );
    });

    it('authenticates valid access token and sets req.user', () => {
      const validToken = TokenService.signAccessToken({
        userId: 'usr-999',
        email: 'patient@example.com',
        role: 'PATIENT',
      });

      mockReq.headers = { authorization: `Bearer ${validToken}` };
      requireAuth(mockReq as Request, mockRes as Response, next);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.role).toBe('PATIENT');
      expect(next).toHaveBeenCalledWith();
    });

    it('requireRole allows permitted role', () => {
      mockReq.user = { userId: 'doc-1', email: 'doc@example.com', role: 'DOCTOR' };
      const guard = requireRole(['DOCTOR', 'ADMIN']);

      guard(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('requireRole blocks unauthorized role with 403 Forbidden', () => {
      mockReq.user = { userId: 'patient-1', email: 'patient@example.com', role: 'PATIENT' };
      const guard = requireRole(['DOCTOR', 'ADMIN']);

      guard(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('lacks permission'),
        })
      );
    });
  });
});
