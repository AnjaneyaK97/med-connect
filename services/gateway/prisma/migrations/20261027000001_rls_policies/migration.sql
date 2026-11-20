-- ==============================================================================
-- MediConnect Row-Level Security (RLS) Policies Migration
-- HIPAA-compliant tenant isolation at PostgreSQL engine level
-- ==============================================================================

-- 1. Patient Table RLS
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_self_access" ON "Patient"
    FOR ALL
    USING (
        "userId" = NULLIF(current_setting('app.current_user_id', true), '')
        OR current_setting('app.current_user_role', true) = 'ADMIN'
    )
    WITH CHECK (
        "userId" = NULLIF(current_setting('app.current_user_id', true), '')
        OR current_setting('app.current_user_role', true) = 'ADMIN'
    );

CREATE POLICY "patient_doctor_access" ON "Patient"
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'DOCTOR'
        AND EXISTS (
            SELECT 1 FROM "Consent" c
            JOIN "Doctor" d ON d."id" = c."doctorId"
            WHERE c."patientId" = "Patient"."id"
              AND d."userId" = NULLIF(current_setting('app.current_user_id', true), '')
              AND c."accessGranted" = true
              AND (c."expiresAt" IS NULL OR c."expiresAt" > CURRENT_TIMESTAMP)
              AND c."revokedAt" IS NULL
        )
    );

-- 2. TriageSession Table RLS
ALTER TABLE "TriageSession" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "triage_patient_access" ON "TriageSession"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Patient" p
            WHERE p."id" = "TriageSession"."patientId"
              AND (
                  p."userId" = NULLIF(current_setting('app.current_user_id', true), '')
                  OR current_setting('app.current_user_role', true) = 'ADMIN'
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Patient" p
            WHERE p."id" = "TriageSession"."patientId"
              AND (
                  p."userId" = NULLIF(current_setting('app.current_user_id', true), '')
                  OR current_setting('app.current_user_role', true) = 'ADMIN'
              )
        )
    );

CREATE POLICY "triage_doctor_access" ON "TriageSession"
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'DOCTOR'
        AND EXISTS (
            SELECT 1 FROM "Consent" c
            JOIN "Doctor" d ON d."id" = c."doctorId"
            WHERE c."patientId" = "TriageSession"."patientId"
              AND d."userId" = NULLIF(current_setting('app.current_user_id', true), '')
              AND c."accessGranted" = true
              AND (c."expiresAt" IS NULL OR c."expiresAt" > CURRENT_TIMESTAMP)
              AND c."revokedAt" IS NULL
        )
    );

-- 3. Transcript Table RLS
ALTER TABLE "Transcript" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcript_access" ON "Transcript"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "TriageSession" ts
            JOIN "Patient" p ON p."id" = ts."patientId"
            WHERE ts."id" = "Transcript"."triageSessionId"
              AND (
                  p."userId" = NULLIF(current_setting('app.current_user_id', true), '')
                  OR current_setting('app.current_user_role', true) = 'ADMIN'
              )
        )
    );

CREATE POLICY "transcript_doctor_access" ON "Transcript"
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'DOCTOR'
        AND EXISTS (
            SELECT 1 FROM "TriageSession" ts
            JOIN "Consent" c ON c."patientId" = ts."patientId"
            JOIN "Doctor" d ON d."id" = c."doctorId"
            WHERE ts."id" = "Transcript"."triageSessionId"
              AND d."userId" = NULLIF(current_setting('app.current_user_id', true), '')
              AND c."accessGranted" = true
              AND (c."expiresAt" IS NULL OR c."expiresAt" > CURRENT_TIMESTAMP)
              AND c."revokedAt" IS NULL
        )
    );

-- 4. ClinicalNote Table RLS
ALTER TABLE "ClinicalNote" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_note_patient_access" ON "ClinicalNote"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Patient" p
            WHERE p."id" = "ClinicalNote"."patientId"
              AND (
                  p."userId" = NULLIF(current_setting('app.current_user_id', true), '')
                  OR current_setting('app.current_user_role', true) = 'ADMIN'
              )
        )
    );

CREATE POLICY "clinical_note_doctor_access" ON "ClinicalNote"
    FOR ALL
    USING (
        current_setting('app.current_user_role', true) = 'DOCTOR'
        AND EXISTS (
            SELECT 1 FROM "Doctor" d
            WHERE d."id" = "ClinicalNote"."doctorId"
              AND d."userId" = NULLIF(current_setting('app.current_user_id', true), '')
        )
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'DOCTOR'
        AND EXISTS (
            SELECT 1 FROM "Doctor" d
            WHERE d."id" = "ClinicalNote"."doctorId"
              AND d."userId" = NULLIF(current_setting('app.current_user_id', true), '')
        )
    );

-- 5. Consent Table RLS
ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_patient_access" ON "Consent"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Patient" p
            WHERE p."id" = "Consent"."patientId"
              AND (
                  p."userId" = NULLIF(current_setting('app.current_user_id', true), '')
                  OR current_setting('app.current_user_role', true) = 'ADMIN'
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Patient" p
            WHERE p."id" = "Consent"."patientId"
              AND (
                  p."userId" = NULLIF(current_setting('app.current_user_id', true), '')
                  OR current_setting('app.current_user_role', true) = 'ADMIN'
              )
        )
    );

CREATE POLICY "consent_doctor_access" ON "Consent"
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'DOCTOR'
        AND EXISTS (
            SELECT 1 FROM "Doctor" d
            WHERE d."id" = "Consent"."doctorId"
              AND d."userId" = NULLIF(current_setting('app.current_user_id', true), '')
        )
    );
