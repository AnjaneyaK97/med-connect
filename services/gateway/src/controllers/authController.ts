import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { PasswordService } from '../services/passwordService';
import { TokenService } from '../services/tokenService';
import { registerSchema, loginSchema, refreshSchema } from '../validators/authValidator';
import { AppError } from '../middlewares/errorHandler';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return next(
          new AppError(
            'Validation failed',
            400,
            validation.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
          )
        );
      }

      const data = validation.data;

      // Check if email already registered
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        return next(new AppError('A user with this email address already exists.', 409));
      }

      // Check doctor license if registering as doctor
      if (data.role === 'DOCTOR' && data.licenseNumber) {
        const existingLicense = await prisma.doctor.findUnique({
          where: { licenseNumber: data.licenseNumber },
        });
        if (existingLicense) {
          return next(new AppError('A doctor with this license number already exists.', 409));
        }
      }

      // Hash password
      const passwordHash = await PasswordService.hash(data.password);

      // Create user and profile within transaction
      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash,
            role: data.role,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
          },
        });

        if (data.role === 'PATIENT') {
          await tx.patient.create({
            data: {
              userId: user.id,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
              gender: data.gender,
              bloodGroup: data.bloodGroup,
              emergencyContact: data.emergencyContact,
            },
          });
        } else if (data.role === 'DOCTOR') {
          await tx.doctor.create({
            data: {
              userId: user.id,
              specialization: data.specialization!,
              licenseNumber: data.licenseNumber!,
              consultationFee: data.consultationFee ?? 0.0,
              bio: data.bio,
            },
          });
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: user.role,
            action: 'AUTH_REGISTER',
            resourceType: 'USER',
            resourceId: user.id,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'] as string,
            detailsJson: { email: user.email, role: user.role },
          },
        });

        return user;
      });

      // Generate Tokens
      const accessToken = TokenService.signAccessToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role as any,
      });

      const refreshToken = TokenService.signRefreshToken({
        userId: newUser.id,
      });

      // Store hashed refresh token
      const tokenHash = TokenService.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.refreshToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phoneNumber: newUser.phoneNumber,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return next(
          new AppError(
            'Validation failed',
            400,
            validation.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
          )
        );
      }

      const { email, password } = validation.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          patient: true,
          doctor: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new AppError('Invalid email or password.', 401));
      }

      const isPasswordValid = await PasswordService.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return next(new AppError('Invalid email or password.', 401));
      }

      // Generate Tokens
      const accessToken = TokenService.signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role as any,
      });

      const refreshToken = TokenService.signRefreshToken({
        userId: user.id,
      });

      const tokenHash = TokenService.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: 'AUTH_LOGIN',
          resourceType: 'USER',
          resourceId: user.id,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'] as string,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            patient: user.patient,
            doctor: user.doctor,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = refreshSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new AppError('Refresh token is required.', 400));
      }

      const { refreshToken } = validation.data;

      let payload;
      try {
        payload = TokenService.verifyRefreshToken(refreshToken);
      } catch {
        return next(new AppError('Invalid or expired refresh token.', 401));
      }

      const tokenHash = TokenService.hashToken(refreshToken);

      const existingRecord = await prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          userId: payload.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!existingRecord || !existingRecord.user || !existingRecord.user.isActive) {
        return next(new AppError('Invalid or revoked refresh token.', 401));
      }

      // Refresh Token Rotation: Revoke previous token
      await prisma.refreshToken.update({
        where: { id: existingRecord.id },
        data: { revokedAt: new Date() },
      });

      // Issue new token pair
      const newAccessToken = TokenService.signAccessToken({
        userId: existingRecord.user.id,
        email: existingRecord.user.email,
        role: existingRecord.user.role as any,
      });

      const newRefreshToken = TokenService.signRefreshToken({
        userId: existingRecord.user.id,
      });

      const newTokenHash = TokenService.hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          userId: existingRecord.user.id,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const tokenHash = TokenService.hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      if (req.user) {
        await prisma.auditLog.create({
          data: {
            actorId: req.user.userId,
            actorRole: req.user.role,
            action: 'AUTH_LOGOUT',
            resourceType: 'USER',
            resourceId: req.user.userId,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'] as string,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(new AppError('Unauthorized', 401));
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          patient: true,
          doctor: true,
        },
      });

      if (!user) {
        return next(new AppError('User not found.', 404));
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
