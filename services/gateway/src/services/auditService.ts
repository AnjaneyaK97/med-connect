import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma';

export interface AuditLogEntry {
  actorId?: string;
  actorRole?: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  detailsJson?: any;
}

export class AuditService {
  /**
   * Appends an immutable audit log entry into PostgreSQL.
   */
  public static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId || null,
          actorRole: entry.actorRole as any,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId || null,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          detailsJson: entry.detailsJson || null,
        },
      });
    } catch (err: any) {
      console.error('AuditLog persistence error:', err.message);
    }
  }

  /**
   * Express middleware interceptor that automatically records PHI read/write access
   */
  public static auditPhiAccess(action: string, resourceType: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const originalSend = res.send;

      res.send = function (body: any) {
        // Record audit after successful HTTP response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resourceId = req.params.sessionId || req.params.noteId || req.params.id;
          AuditService.log({
            actorId: req.user?.userId,
            actorRole: req.user?.role,
            action,
            resourceType,
            resourceId,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'] as string,
          });
        }
        return originalSend.call(this, body);
      };

      next();
    };
  }
}
