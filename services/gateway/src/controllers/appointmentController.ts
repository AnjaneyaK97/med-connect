import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { AppError } from '../middlewares/errorHandler';

export class AppointmentController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Unauthorized', 401));

      const { doctorId, scheduledAt, reason } = req.body;

      if (!doctorId || !scheduledAt) {
        return next(new AppError('doctorId and scheduledAt are required.', 400));
      }

      // Resolve patient
      const patient = await prisma.patient.findUnique({
        where: { userId: user.userId },
      });

      if (!patient && user.role !== 'ADMIN') {
        return next(new AppError('Patient profile not found for user.', 404));
      }

      const patientId = patient ? patient.id : req.body.patientId;

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          scheduledAt: new Date(scheduledAt),
          reason: reason || 'Telehealth Consultation',
          meetingLink: `https://meet.mediconnect.org/room/${Math.random().toString(36).substring(2, 9)}`,
          status: 'SCHEDULED',
        },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: user.userId,
          actorRole: user.role,
          action: 'APPOINTMENT_CREATE',
          resourceType: 'APPOINTMENT',
          resourceId: appointment.id,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'] as string,
        },
      });

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Unauthorized', 401));

      let whereClause: any = {};

      if (user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({ where: { userId: user.userId } });
        if (patient) whereClause = { patientId: patient.id };
      } else if (user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({ where: { userId: user.userId } });
        if (doctor) whereClause = { doctorId: doctor.id };
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
      }

      const appointment = await prisma.appointment.update({
        where: { id },
        data: { status },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      });

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
}
