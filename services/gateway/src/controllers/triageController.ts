import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { prisma } from '../services/prisma';
import { JobQueue } from '../services/jobQueue';
import { EncryptionService } from '../services/encryptionService';
import { EventBroker } from '../services/eventBroker';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';

export class TriageController {
  /**
   * Start a new triage session
   */
  public static async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Unauthorized', 401));

      // Resolve patient ID
      const patient = await prisma.patient.findUnique({
        where: { userId: user.userId },
      });

      if (!patient && user.role !== 'ADMIN') {
        return next(new AppError('Patient profile not found for user.', 404));
      }

      const patientId = patient ? patient.id : req.body.patientId;
      if (!patientId) {
        return next(new AppError('patientId is required.', 400));
      }

      const session = await prisma.triageSession.create({
        data: {
          patientId,
          status: 'STARTED',
          language: req.body.language || 'en',
        },
      });

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload audio for an existing triage session.
   * Enqueues an asynchronous background job and immediately returns 202 Accepted.
   */
  public static async uploadAudio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const file = req.file;

      if (!file) {
        return next(new AppError('No audio file provided in request.', 400));
      }

      const session = await prisma.triageSession.findUnique({
        where: { id: sessionId },
        include: { patient: true },
      });

      if (!session) {
        return next(new AppError('Triage session not found.', 404));
      }

      // Check ownership if user is a PATIENT
      if (req.user?.role === 'PATIENT' && session.patient.userId !== req.user.userId) {
        return next(new AppError('Forbidden: Access to another patient triage session is denied.', 403));
      }

      // Create Async Job
      const job = await JobQueue.createJob('TRANSCRIPTION', {
        sessionId,
        patientId: session.patientId,
        filename: file.originalname,
        filesize: file.size,
        mimetype: file.mimetype,
      });

      // Dispatch non-blocking background task
      JobQueue.dispatchTranscription(job.id, {
        sessionId,
        patientId: session.patientId,
        audioBuffer: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
        language: req.body.language || session.language,
      });

      // Immediately return 202 Accepted
      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          sessionId,
          message: 'Audio queued for Whisper transcription. Poll /triage/jobs/:jobId for real-time progress.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Poll asynchronous job status
   */
  public static async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await JobQueue.getJob(jobId);

      if (!job) {
        return next(new AppError('Job not found.', 404));
      }

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get triage session details with decrypted transcript
   */
  public static async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await prisma.triageSession.findUnique({
        where: { id: sessionId },
        include: {
          transcript: true,
          clinicalNotes: true,
          patient: true,
        },
      });

      if (!session) {
        return next(new AppError('Triage session not found.', 404));
      }

      // Decrypt transcript if present
      let decryptedText = null;
      if (session.transcript?.encryptedTranscript) {
        try {
          decryptedText = EncryptionService.decrypt(session.transcript.encryptedTranscript);
        } catch {
          decryptedText = '[Unable to decrypt transcript]';
        }
      }

      res.status(200).json({
        success: true,
        data: {
          ...session,
          transcript: session.transcript
            ? {
                ...session.transcript,
                text: decryptedText,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run structured triage analysis and deterministic Red-Flag screening
   */
  public static async analyzeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      let transcriptText = req.body.transcript;
      const language = req.body.language || 'en';

      const session = await prisma.triageSession.findUnique({
        where: { id: sessionId },
        include: { transcript: true, patient: { include: { user: true } } },
      });

      if (!session) {
        return next(new AppError('Triage session not found.', 404));
      }

      // If transcript text not in request body, decrypt from session transcript
      if (!transcriptText && session.transcript?.encryptedTranscript) {
        transcriptText = EncryptionService.decrypt(session.transcript.encryptedTranscript);
      }

      if (!transcriptText || !transcriptText.trim()) {
        return next(new AppError('No symptom text available for analysis.', 400));
      }

      // Call AI Service triage analysis endpoint
      let triageSummary: any;
      try {
        const aiRes = await axios.post(
          `${config.aiServiceUrl}/api/v1/triage/analyze`,
          {
            transcript: transcriptText,
            language: language || session.language,
          },
          { timeout: 15000 }
        );
        triageSummary = aiRes.data.data;
      } catch {
        // Safe fallback rule evaluator in Gateway if AI service is offline
        const isEmergency = /chest\s*pain|stroke|droop|bleed|cannot\s*breathe|सीने\s*में\s*दर्द/i.test(transcriptText);
        triageSummary = {
          chief_complaint: transcriptText.substring(0, 100),
          symptoms: isEmergency ? ['Chest Pain / Acute Emergency'] : ['Mild Symptoms'],
          duration: 'Unspecified',
          severity: isEmergency ? 'EMERGENCY' : 'MEDIUM',
          is_red_flag: isEmergency,
          red_flags: isEmergency ? ['Acute Clinical Alert Triggered'] : [],
          emergency_advisory: isEmergency ? 'EMERGENCY ADVISORY: Seek immediate emergency care.' : null,
          recommended_specialty: isEmergency ? 'Emergency Medicine' : 'General Medicine',
          language,
        };
      }

      // Update TriageSession in Database
      const updatedSession = await prisma.triageSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          severity: triageSummary.severity as any,
          isRedFlag: triageSummary.is_red_flag,
          chiefComplaint: triageSummary.chief_complaint,
          summaryJson: triageSummary,
        },
      });

      // If Red-Flag triggered, trigger immediate multi-channel escalation
      if (triageSummary.is_red_flag) {
        // 1. Emit urgent_flag over WebSocket to all doctors
        await EventBroker.publish(
          'urgent_flag',
          {
            sessionId,
            patientId: session.patientId,
            patientName: `${session.patient.user.firstName} ${session.patient.user.lastName}`,
            chiefComplaint: triageSummary.chief_complaint,
            redFlags: triageSummary.red_flags,
            emergencyAdvisory: triageSummary.emergency_advisory,
            timestamp: new Date().toISOString(),
          },
          'role:DOCTOR'
        );

        // 2. Emit urgent_flag to the patient's private session room
        await EventBroker.publish(
          'urgent_flag',
          {
            sessionId,
            emergencyAdvisory: triageSummary.emergency_advisory,
            isRedFlag: true,
          },
          `session:${sessionId}`
        );

        // 3. Record emergency notification in database
        await prisma.notification.create({
          data: {
            userId: session.patient.userId,
            title: 'EMERGENCY ADVISORY: Critical Symptoms Detected',
            message: triageSummary.emergency_advisory || 'Please call emergency medical services immediately.',
            type: 'URGENT_FLAG',
            metadataJson: { sessionId, redFlags: triageSummary.red_flags },
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          session: updatedSession,
          summary: triageSummary,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
