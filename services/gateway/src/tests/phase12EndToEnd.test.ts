import { createApp } from '../app';
import request from 'supertest';
import { EncryptionService } from '../services/encryptionService';
import { DiffService } from '../services/diffService';
import { CacheService } from '../services/cacheService';
import { MetricsService } from '../services/metricsService';

describe('Phase 12: End-to-End System & OpenAPI Verification', () => {
  const app = createApp();

  describe('OpenAPI Documentation & Telemetry Endpoints', () => {
    it('serves valid OpenAPI 3.0.3 specification at /openapi.json', async () => {
      const res = await request(app).get('/openapi.json');

      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toContain('MediConnect Gateway API');
      expect(res.body.paths['/api/v1/auth/login']).toBeDefined();
      expect(res.body.paths['/api/v1/triage/audio']).toBeDefined();
      expect(res.body.paths['/api/v1/notes/draft']).toBeDefined();
      expect(res.body.paths['/api/v1/consents']).toBeDefined();
    });

    it('serves Prometheus plaintext metrics with custom counters at /metrics', async () => {
      MetricsService.recordRequest('POST', '/api/v1/triage/analyze', 200, 35);
      MetricsService.incrementRedFlag();

      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('mediconnect_http_requests_total');
      expect(res.text).toContain('mediconnect_red_flag_alerts_total');
    });

    it('returns 200 on health and readiness probes', async () => {
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.status).toBe('healthy');

      const readyRes = await request(app).get('/ready');
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.status).toBe('ready');
    });
  });

  describe('Clinical Workflow Integrity: Encryption, Diff Tracking & Audit', () => {
    it('executes full envelope encryption roundtrip on sensitive PHI', () => {
      const sensitiveNote = 'Patient reports severe substernal chest pressure radiating to left jaw.';
      const encrypted = EncryptionService.encrypt(sensitiveNote);

      expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(encrypted).not.toContain(sensitiveNote);

      const decrypted = EncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveNote);
    });

    it('calculates diff and tracks clinician modifications over AI generated drafts', () => {
      const aiDraft = {
        subjective: 'Patient reports mild chest discomfort for 1 hour.',
        objective: 'Vitals pending in-person evaluation.',
        assessment: '1. Suspected chest wall pain.',
        plan: '1. Rest and observe.',
      };

      const physicianApproved = {
        subjective: 'Patient reports severe crushing retrosternal chest pain radiating to left arm.',
        objective: 'BP 145/92 mmHg, HR 102 bpm, ECG shows ST elevations in leads V1-V3.',
        assessment: '1. Acute ST-Elevation Myocardial Infarction (STEMI). Requires emergency PCI.',
        plan: '1. Immediate catheterization lab activation. Chewable aspirin 324 mg given.',
      };

      const diffResult = DiffService.calculateDiff(aiDraft, physicianApproved);

      expect(diffResult.hasModifications).toBe(true);
      expect(diffResult.totalWordsModified).toBeGreaterThan(10);
      expect(diffResult.sectionChanges.subjective.status).toBe('MODIFIED');
      expect(diffResult.sectionChanges.assessment.status).toBe('MODIFIED');
      expect(diffResult.summary).toContain('Subjective, Objective, Assessment, Plan');
    });

    it('manages high-performance Redis caching with pattern invalidation', async () => {
      const cacheKey = 'patient:p-999:profile';
      const patientData = { id: 'p-999', name: 'Alice Walker', condition: 'Stable' };

      await CacheService.set(cacheKey, patientData, 60);
      const cached = await CacheService.get<typeof patientData>(cacheKey);
      expect(cached).toEqual(patientData);

      await CacheService.invalidatePattern('patient:p-999');
      const cleared = await CacheService.get(cacheKey);
      expect(cleared).toBeNull();
    });
  });
});
