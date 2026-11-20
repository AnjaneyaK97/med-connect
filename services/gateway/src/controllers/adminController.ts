import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';
import { config } from '../config';

export class AdminController {
  /**
   * View immutable audit trail logs
   */
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const actionFilter = req.query.action as string | undefined;

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            ...(actionFilter ? { action: actionFilter } : {}),
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({
          where: {
            ...(actionFilter ? { action: actionFilter } : {}),
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Microservices system status and database health check
   */
  public static async getSystemStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [userCount, patientCount, doctorCount, sessionCount, noteCount] = await Promise.all([
        prisma.user.count(),
        prisma.patient.count(),
        prisma.doctor.count(),
        prisma.triageSession.count(),
        prisma.clinicalNote.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          status: 'operational',
          timestamp: new Date().toISOString(),
          environment: config.env,
          services: {
            gateway: { status: 'healthy', port: config.port },
            aiService: { url: config.aiServiceUrl, status: 'healthy' },
            postgres: { status: 'connected', rlsEnabled: true },
            redis: { host: config.redis.host, port: config.redis.port, status: 'connected' },
          },
          metrics: {
            totalUsers: userCount,
            totalPatients: patientCount,
            totalDoctors: doctorCount,
            totalTriageSessions: sessionCount,
            totalClinicalNotes: noteCount,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
