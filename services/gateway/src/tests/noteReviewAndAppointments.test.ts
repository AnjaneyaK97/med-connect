import { DiffService } from '../services/diffService';

describe('Phase 9: Human-in-the-Loop Note Review & Appointments', () => {
  describe('DiffService', () => {
    it('detects modifications and generates clinical diff summary', () => {
      const originalAiDraft = {
        subjective: 'Patient reports cough for 3 days.',
        objective: 'Vitals stable.',
        assessment: 'Acute Bronchitis.',
        plan: 'Supportive care.',
      };

      const clinicianEdited = {
        subjective: 'Patient reports cough for 3 days, accompanied by low-grade fever and mild pleuritic pain.',
        objective: 'Vitals: BP 120/80, SpO2 98%. Chest clear to auscultation.',
        assessment: 'Acute Viral Bronchitis. Low suspicion for pneumonia.',
        plan: 'Supportive care. Prescribed benzonatate 100mg TID. Return precautions given.',
      };

      const diff = DiffService.calculateSoapDiff(originalAiDraft, clinicianEdited);

      expect(diff.subjectiveChanged).toBe(true);
      expect(diff.objectiveChanged).toBe(true);
      expect(diff.assessmentChanged).toBe(true);
      expect(diff.planChanged).toBe(true);
      expect(diff.totalWordsModified).toBeGreaterThan(0);
      expect(diff.changesSummary).toContain('Clinician modified sections: Subjective, Objective, Assessment, Plan');
    });

    it('reports no modifications when clinician accepts original AI draft directly', () => {
      const draft = {
        subjective: 'Chest tightness for 2 hours.',
        objective: 'Target vitals pending.',
        assessment: 'Suspected ACS.',
        plan: 'Aspirin and ECG.',
      };

      const diff = DiffService.calculateSoapDiff(draft, draft);

      expect(diff.subjectiveChanged).toBe(false);
      expect(diff.objectiveChanged).toBe(false);
      expect(diff.assessmentChanged).toBe(false);
      expect(diff.planChanged).toBe(false);
      expect(diff.totalWordsModified).toBe(0);
      expect(diff.changesSummary).toContain('no textual modifications');
    });
  });
});
