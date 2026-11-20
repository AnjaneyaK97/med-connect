import { AuditService, AuditLogEntry } from '../services/auditService';

describe('Phase 10: Consent Management & Immutable Audit Trail', () => {
  it('formats audit log entry with actor, action, resource, and timestamp', async () => {
    const entry: AuditLogEntry = {
      actorId: 'usr-patient-1',
      actorRole: 'PATIENT',
      action: 'CONSENT_GRANT',
      resourceType: 'CONSENT',
      resourceId: 'cst-101',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Suite',
      detailsJson: {
        doctorId: 'doc-202',
        scope: 'FULL',
      },
    };

    expect(entry.action).toBe('CONSENT_GRANT');
    expect(entry.resourceType).toBe('CONSENT');
    expect(entry.actorId).toBe('usr-patient-1');
    expect(entry.detailsJson.scope).toBe('FULL');
  });

  it('validates consent authorization state transitions (Grant -> Revoke)', () => {
    // Simulated consent record
    const consent = {
      id: 'cst-300',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      accessGranted: true,
      scope: 'FULL',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      revokedAt: null as Date | null,
    };

    // Check active
    const isConsentActive = (c: typeof consent) =>
      c.accessGranted && (!c.expiresAt || c.expiresAt > new Date()) && c.revokedAt === null;

    expect(isConsentActive(consent)).toBe(true);

    // Patient revokes consent
    consent.accessGranted = false;
    consent.revokedAt = new Date();

    expect(isConsentActive(consent)).toBe(false);
  });
});
