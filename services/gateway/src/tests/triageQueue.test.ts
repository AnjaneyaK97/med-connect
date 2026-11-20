import { JobQueue } from '../services/jobQueue';

describe('Phase 5: Async AI Job Pipeline', () => {
  it('creates an async transcription job in QUEUED status with progress 0', async () => {
    const job = await JobQueue.createJob('TRANSCRIPTION', {
      sessionId: 'sess-100',
      patientId: 'pat-100',
      filename: 'symptoms.webm',
    });

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.type).toBe('TRANSCRIPTION');
    expect(job.status).toBe('QUEUED');
    expect(job.progress).toBe(0);

    const fetchedJob = await JobQueue.getJob(job.id);
    expect(fetchedJob).not.toBeNull();
    expect(fetchedJob?.id).toBe(job.id);
  });

  it('updates job progress and marks as COMPLETED', async () => {
    const job = await JobQueue.createJob('TRANSCRIPTION', {
      sessionId: 'sess-101',
    });

    const updatedProcessing = await JobQueue.updateJob(job.id, {
      status: 'PROCESSING',
      progress: 50,
    });

    expect(updatedProcessing?.status).toBe('PROCESSING');
    expect(updatedProcessing?.progress).toBe(50);

    const updatedComplete = await JobQueue.updateJob(job.id, {
      status: 'COMPLETED',
      progress: 100,
      result: {
        transcript: 'Patient has headache and mild fever.',
        language: 'en',
      },
    });

    expect(updatedComplete?.status).toBe('COMPLETED');
    expect(updatedComplete?.progress).toBe(100);
    expect(updatedComplete?.result.transcript).toContain('headache');
  });

  it('handles job failure state gracefully', async () => {
    const job = await JobQueue.createJob('TRANSCRIPTION', {
      sessionId: 'sess-err',
    });

    const failedJob = await JobQueue.updateJob(job.id, {
      status: 'FAILED',
      error: 'Audio corrupted or unrecognized format',
    });

    expect(failedJob?.status).toBe('FAILED');
    expect(failedJob?.error).toBe('Audio corrupted or unrecognized format');
  });
});
