import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { AuditService } from '../services/auditService';
import { AppError } from '../middlewares/errorHandler';

export class ConsentController {
  /**
   * Patient grants clinical data access to a specific doctor
   */
  public static async grantConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Unauthorized', 401));

      const { doctorId, scope, expiresInDays } = req.body;

      if (!doctorId) {
        return next(new AppError('doctorId is required.', 400));
      }

      // Resolve patient profile
      const patient = await prisma.patient.findUnique({
        where: { userId: user.userId },
      });

      if (!patient && user.role !== 'ADMIN') {
        return next(new AppError('Patient profile not found for user.', 404));
      }

      const patientId = patient ? patient.id : req.body.patientId;

      // Check doctor exists
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { user: true },
      });

      if (!doctor) {
        return next(new AppError('Doctor not found.', 404));
      }

      const validScopes = ['FULL', 'TRIAGE_ONLY', 'SUMMARY_ONLY'];
      const consentScope = validScopes.includes(scope) ? scope : 'FULL';

      const days = expiresInDays && expiresInDays > 0 ? Number(expiresInDays) : 90;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Upsert Consent record
      const consent = await prisma.consent.upsert({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId,
          },
        },
        create: {
          patientId,
          doctorId,
          accessGranted: true,
          scope: consentScope as any,
          expiresAt,
          revokedAt: null,
        },
        update: {
          accessGranted: true,
          scope: consentScope as any,
          expiresAt,
          revokedAt: null,
        },
        include: {
          doctor: { include: { user: true } },
        },
      });

      // Immutable Audit Log
      await AuditService.log({
        actorId: user.userId,
        actorRole: user.role,
        action: 'CONSENT_GRANT',
        resourceType: 'CONSENT',
        resourceId: consent.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] as string,
        detailsJson: {
          doctorId,
          doctorName: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
          scope: consentScope,
          expiresAt: expiresAt.toISOString(),
        },
      });

      res.status(200).json({
        success: true,
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Patient revokes clinical data access from a doctor
   */
  public static async revokeConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Unauthorized', 401));

      const { doctorId } = req.body;
      if (!doctorId) {
        return next(new AppError('doctorId is required.', 400));
      }

      const patient = await prisma.patient.findUnique({
        where: { userId: user.userId },
      });

      if (!patient && user.role !== 'ADMIN') {
        return next(new AppError('Patient profile not found for user.', 404));
      }

      const patientId = patient ? patient.id : req.body.patientId;

      const consent = await prisma.consent.update({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId,
          },
        },
        data: {
          accessGranted: false,
          revokedAt: new Date(),
        },
        include: {
          doctor: { include: { user: true } },
        },
      });

      // Immutable Audit Log
      await AuditService.log({
        actorId: user.userId,
        actorRole: user.role,
        action: 'CONSENT_REVOKE',
        resourceType: 'CONSENT',
        resourceId: consent.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] as string,
        detailsJson: {
          doctorId,
          doctorName: `Dr. ${consent.doctor.user.firstName} ${consent.doctor.user.lastName}`,
          revokedAt: new Date().toISOString(),
        },
      });

      res.status(200).json({
        success: true,
        data: consent,
        message: 'Doctor access revoked successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List consents for current user
   */
  public static async listConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Unauthorized', 401));

      let consents: any[] = [];

      if (user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({ where: { userId: user.userId } });
        if (patient) {
          consents = await prisma.consent.findMany({
            where: { patientId: patient.id },
            include: { doctor: { include: { user: true } } },
            orderBy: { createdAt: 'desc' },
          });
        }
      } else if (user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({ where: { userId: user.userId } });
        if (doctor) {
          consents = await prisma.consent.findMany({
            where: { doctorId: doctor.id, accessGranted: true },
            include: { patient: { include: { user: true } } },
            orderBy: { createdAt: 'desc' },
          });
        }
      } else {
        consents = await prisma.consent.findMany({
          include: {
            doctor: { include: { user: true } },
            patient: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      res.status(200).json({
        success: true,
        data: consents,
      });
    } catch (error) {
      next(error);
    }
  }
}
