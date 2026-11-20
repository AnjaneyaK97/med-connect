import { PrismaClient, Role, AppointmentStatus, TriageStatus, TriageSeverity, NoteStatus, ConsentScope } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Envelope encryption helper for seed data
const MASTER_KEY_HEX = process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, 'hex');

function encryptEnvelope(plaintext: string): string {
  const dek = crypto.randomBytes(32);
  const kekIv = crypto.randomBytes(12);
  const kekCipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, kekIv);
  const encDek = Buffer.concat([kekCipher.update(dek), kekCipher.final()]);
  const kekAuthTag = kekCipher.getAuthTag();
  const packedEncDek = Buffer.concat([kekIv, kekAuthTag, encDek]);

  const dataIv = crypto.randomBytes(12);
  const dataCipher = crypto.createCipheriv('aes-256-gcm', dek, dataIv);
  const ciphertext = Buffer.concat([dataCipher.update(plaintext, 'utf8'), dataCipher.final()]);
  const dataAuthTag = dataCipher.getAuthTag();

  return `v1:${packedEncDek.toString('base64')}:${dataIv.toString('base64')}:${dataAuthTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

async function main() {
  console.log('Seeding MediConnect database with synthetic clinical records...');

  const passwordHash = await bcrypt.hash('SecurePassword123!', 12);

  // 1. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mediconnect.local' },
    update: {},
    create: {
      email: 'admin@mediconnect.local',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'Clinical',
      lastName: 'Administrator',
      phoneNumber: '+1-555-010-0001',
    },
  });

  // 2. Doctor 1: Dr. Rajesh Sharma (Cardiology)
  const drSharmaUser = await prisma.user.upsert({
    where: { email: 'dr.sharma@mediconnect.local' },
    update: {},
    create: {
      email: 'dr.sharma@mediconnect.local',
      passwordHash,
      role: Role.DOCTOR,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      phoneNumber: '+1-555-010-1001',
      doctor: {
        create: {
          specialization: 'Cardiology',
          licenseNumber: 'MED-CARD-883921',
          isVerified: true,
          consultationFee: 150.0,
          bio: 'Senior Interventional Cardiologist with 16 years experience in acute coronary syndromes and preventive heart health.',
        },
      },
    },
    include: { doctor: true },
  });

  // Doctor 2: Dr. Ananya Patel (Pulmonology)
  const drPatelUser = await prisma.user.upsert({
    where: { email: 'dr.patel@mediconnect.local' },
    update: {},
    create: {
      email: 'dr.patel@mediconnect.local',
      passwordHash,
      role: Role.DOCTOR,
      firstName: 'Ananya',
      lastName: 'Patel',
      phoneNumber: '+1-555-010-1002',
      doctor: {
        create: {
          specialization: 'Pulmonology',
          licenseNumber: 'MED-PULM-774912',
          isVerified: true,
          consultationFee: 130.0,
          bio: 'Consultant Pulmonologist specializing in asthma, chronic obstructive pulmonary diseases, and acute respiratory infections.',
        },
      },
    },
    include: { doctor: true },
  });

  // Doctor 3: Dr. Elena Wong (Neurology)
  const drWongUser = await prisma.user.upsert({
    where: { email: 'dr.wong@mediconnect.local' },
    update: {},
    create: {
      email: 'dr.wong@mediconnect.local',
      passwordHash,
      role: Role.DOCTOR,
      firstName: 'Elena',
      lastName: 'Wong',
      phoneNumber: '+1-555-010-1003',
      doctor: {
        create: {
          specialization: 'Neurology',
          licenseNumber: 'MED-NEUR-552910',
          isVerified: true,
          consultationFee: 160.0,
          bio: 'Neurologist with focus on stroke prevention, chronic migraine management, and neurological rehabilitation.',
        },
      },
    },
    include: { doctor: true },
  });

  // 3. Patient 1: John Doe
  const patientJohnUser = await prisma.user.upsert({
    where: { email: 'patient.john@mediconnect.local' },
    update: {},
    create: {
      email: 'patient.john@mediconnect.local',
      passwordHash,
      role: Role.PATIENT,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1-555-010-2001',
      patient: {
        create: {
          dateOfBirth: new Date('1985-06-15'),
          gender: 'Male',
          bloodGroup: 'O+',
          emergencyContact: '+1-555-010-2099 (Wife: Jane Doe)',
          medicalHistorySummary: encryptEnvelope('Hypertension diagnosed 2021; mild hyperlipidemia. Well controlled on amlodipine.'),
          allergies: encryptEnvelope('Penicillin (mild rash); No known food allergies.'),
        },
      },
    },
    include: { patient: true },
  });

  // Patient 2: Priya Singh
  const patientPriyaUser = await prisma.user.upsert({
    where: { email: 'patient.priya@mediconnect.local' },
    update: {},
    create: {
      email: 'patient.priya@mediconnect.local',
      passwordHash,
      role: Role.PATIENT,
      firstName: 'Priya',
      lastName: 'Singh',
      phoneNumber: '+1-555-010-2002',
      patient: {
        create: {
          dateOfBirth: new Date('1994-03-22'),
          gender: 'Female',
          bloodGroup: 'B+',
          emergencyContact: '+1-555-010-2098 (Brother: Aman Singh)',
          medicalHistorySummary: encryptEnvelope('Seasonal allergic rhinitis; no major chronic illnesses.'),
          allergies: encryptEnvelope('Sulfa drugs; Seasonal pollen.'),
        },
      },
    },
    include: { patient: true },
  });

  const patientJohnId = patientJohnUser.patient!.id;
  const patientPriyaId = patientPriyaUser.patient!.id;
  const drSharmaId = drSharmaUser.doctor!.id;
  const drPatelId = drPatelUser.doctor!.id;

  // 4. Consents
  await prisma.consent.upsert({
    where: { patientId_doctorId: { patientId: patientJohnId, doctorId: drSharmaId } },
    update: {},
    create: {
      patientId: patientJohnId,
      doctorId: drSharmaId,
      accessGranted: true,
      scope: ConsentScope.FULL,
    },
  });

  await prisma.consent.upsert({
    where: { patientId_doctorId: { patientId: patientPriyaId, doctorId: drPatelId } },
    update: {},
    create: {
      patientId: patientPriyaId,
      doctorId: drPatelId,
      accessGranted: true,
      scope: ConsentScope.FULL,
    },
  });

  // 5. Triage Session 1: John Doe (Cardiology Red-Flag Case)
  const triage1 = await prisma.triageSession.create({
    data: {
      patientId: patientJohnId,
      status: TriageStatus.COMPLETED,
      language: 'en',
      chiefComplaint: 'Crushing chest pain radiating down left arm with cold sweats',
      severity: TriageSeverity.EMERGENCY,
      isRedFlag: true,
      summaryJson: {
        chief_complaint: 'Crushing chest pain radiating down left arm with cold sweats',
        symptoms: ['Chest Pain', 'Shortness Of Breath', 'Nausea / Diaphoresis'],
        duration: '45 minutes',
        severity: 'EMERGENCY',
        is_red_flag: true,
        red_flags: ['Acute Coronary Syndrome / Suspected Myocardial Infarction'],
        emergency_advisory: 'EMERGENCY ADVISORY: Symptoms suggest possible acute cardiac emergency. Please call emergency services (911/112).',
        recommended_specialty: 'Emergency Medicine / Cardiology',
      },
      transcript: {
        create: {
          rawAudioUrl: 'https://storage.mediconnect.local/audio/triage-john-001.webm',
          encryptedTranscript: encryptEnvelope('I have sudden crushing chest pain radiating to my left arm, sweating heavily, started 45 minutes ago.'),
          scrubbedTranscript: 'Patient [PATIENT_NAME] has sudden crushing chest pain radiating to left arm, sweating heavily, started 45 minutes ago.',
          language: 'en',
          durationSeconds: 18,
        },
      },
    },
  });

  // Clinical Note for John Doe (Reviewed & Approved by Dr. Sharma)
  const subjectiveContent = 'Patient John Doe presented with sudden retrosternal crushing chest pain radiating down left arm for 45 minutes. Associated with diaphoresis and nausea. Denies prior MI.';
  const objectiveContent = 'Alert, diaphoretic. BP: 144/88 mmHg, HR: 96 bpm, SpO2: 98% on RA. Immediate 12-lead ECG demonstrated sinus rhythm with ST elevation in leads V2-V4.';
  const assessmentContent = '1. Acute Anterior ST-Elevation Myocardial Infarction (STEMI, ICD-10 I21.03).\n2. Hypertensive urgency.';
  const planContent = '1. Immediate cath lab activation for primary percutaneous coronary intervention (PCI).\n2. Administer chewable aspirin 324 mg and ticagrelor 180 mg loading dose.\n3. Heparin bolus per hospital protocol.\n4. Telemetry bed in Cardiac Intensive Care Unit post-procedure.';

  await prisma.clinicalNote.create({
    data: {
      triageSessionId: triage1.id,
      patientId: patientJohnId,
      doctorId: drSharmaId,
      status: NoteStatus.APPROVED,
      subjectiveEncrypted: encryptEnvelope(subjectiveContent),
      objectiveEncrypted: encryptEnvelope(objectiveContent),
      assessmentEncrypted: encryptEnvelope(assessmentContent),
      planEncrypted: encryptEnvelope(planContent),
      aiGeneratedDraftJson: {
        subjective: subjectiveContent,
        objective: 'Vitals pending in-person triage. Appearance: Alert, mild distress.',
        assessment: '1. Suspected Acute Coronary Syndrome.\n2. Rule out STEMI.',
        plan: '1. 12-lead ECG.\n2. Cardiac troponin series.\n3. Aspirin 324 mg chewed.',
        citations: [
          {
            guideline_id: 'GL-CARD-001',
            title: 'AHA/ACC Clinical Practice Guideline for Evaluation and Diagnosis of Chest Pain',
            category: 'Cardiology',
            section: 'Evaluation & Risk Stratification',
            relevance_score: 0.95,
          },
        ],
      },
      finalContentJson: {
        subjective: subjectiveContent,
        objective: objectiveContent,
        assessment: assessmentContent,
        plan: planContent,
      },
      diffSummary: 'Physician added emergency 12-lead ECG findings (ST elevation V2-V4), updated primary diagnosis to acute STEMI, activated cath lab, and ordered loading dose ticagrelor.',
      approvedAt: new Date(),
      version: 2,
    },
  });

  // 6. Triage Session 2: Priya Singh (Pulmonology / Bronchitis Draft Case)
  const triage2 = await prisma.triageSession.create({
    data: {
      patientId: patientPriyaId,
      status: TriageStatus.COMPLETED,
      language: 'en',
      chiefComplaint: 'Productive cough and mild throat irritation for 4 days',
      severity: TriageSeverity.LOW,
      isRedFlag: false,
      summaryJson: {
        chief_complaint: 'Productive cough and mild throat irritation for 4 days',
        symptoms: ['Cough', 'Sore Throat', 'Fatigue'],
        duration: '4 days',
        severity: 'LOW',
        is_red_flag: false,
        red_flags: [],
        recommended_specialty: 'Pulmonology',
      },
      transcript: {
        create: {
          rawAudioUrl: 'https://storage.mediconnect.local/audio/triage-priya-002.webm',
          encryptedTranscript: encryptEnvelope('I have been coughing for 4 days with mild sore throat and clear phlegm. No chest pain or trouble breathing.'),
          scrubbedTranscript: 'Patient [PATIENT_NAME] has been coughing for 4 days with mild sore throat and clear phlegm. No chest pain or trouble breathing.',
          language: 'en',
          durationSeconds: 14,
        },
      },
    },
  });

  // Clinical Note for Priya Singh (Pending Review Draft)
  await prisma.clinicalNote.create({
    data: {
      triageSessionId: triage2.id,
      patientId: patientPriyaId,
      doctorId: drPatelId,
      status: NoteStatus.DRAFT,
      subjectiveEncrypted: encryptEnvelope('Patient Priya Singh reports 4 days of persistent cough with clear sputum and mild sore throat. Denies fever >38C, hemoptysis, or shortness of breath.'),
      objectiveEncrypted: encryptEnvelope('Non-toxic appearance. Target Vitals: Temp < 38.0C, RR 16/min, SpO2 > 97%.'),
      assessmentEncrypted: encryptEnvelope('1. Acute Viral Bronchitis (ICD-10 J20.9)\n2. Differential: Viral upper respiratory infection.'),
      planEncrypted: encryptEnvelope('1. Supportive symptomatic hydration and honey/dextromethorphan.\n2. Per ATS/CDC guidelines, antibiotics are not indicated.\n3. Return if dyspnea or high fever occurs.'),
      aiGeneratedDraftJson: {
        subjective: 'Patient Priya Singh reports 4 days of persistent cough with clear sputum and mild sore throat.',
        objective: 'Non-toxic appearance. Vitals normal on room air.',
        assessment: '1. Acute Viral Bronchitis (ICD-10 J20.9)',
        plan: '1. Oral hydration and OTC dextromethorphan.\n2. Avoid routine antibiotics per ATS/CDC guidelines.',
        citations: [
          {
            guideline_id: 'GL-PULM-002',
            title: 'ATS/CDC Practice Guidelines for Acute Bronchitis and Lower Respiratory Symptoms',
            category: 'Pulmonology',
            section: 'Diagnostic Criteria and Management',
            relevance_score: 0.88,
          },
        ],
      },
    },
  });

  // 7. Appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 30, 0, 0);

  await prisma.appointment.create({
    data: {
      patientId: patientPriyaId,
      doctorId: drPatelId,
      scheduledAt: tomorrow,
      status: AppointmentStatus.SCHEDULED,
      reason: 'Telehealth follow-up for persistent acute cough',
      meetingLink: 'https://meet.mediconnect.local/room/pulm-consult-9912',
    },
  });

  // 8. Immutable Audit Trail Entries
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: drSharmaUser.id,
        actorRole: Role.DOCTOR,
        action: 'NOTE_APPROVE',
        resourceType: 'CLINICAL_NOTE',
        resourceId: triage1.id,
        ipAddress: '10.0.4.15',
        userAgent: 'MediConnect-DoctorPortal/1.0',
        detailsJson: {
          action: 'NOTE_SIGNED',
          physician: 'Dr. Rajesh Sharma',
          patient: 'John Doe',
          editsMade: true,
        },
      },
      {
        actorId: patientJohnUser.id,
        actorRole: Role.PATIENT,
        action: 'CONSENT_GRANT',
        resourceType: 'CONSENT',
        resourceId: drSharmaId,
        ipAddress: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)',
        detailsJson: {
          scope: 'FULL',
          doctorLicense: 'MED-CARD-883921',
        },
      },
    ],
  });

  console.log('✅ MediConnect synthetic database seed completed successfully!');
  console.log('Synthetic Credentials:');
  console.log('  Admin:   admin@mediconnect.local       / SecurePassword123!');
  console.log('  Doctor:  dr.sharma@mediconnect.local   / SecurePassword123! (Cardiology)');
  console.log('  Doctor:  dr.patel@mediconnect.local    / SecurePassword123! (Pulmonology)');
  console.log('  Doctor:  dr.wong@mediconnect.local     / SecurePassword123! (Neurology)');
  console.log('  Patient: patient.john@mediconnect.local / SecurePassword123!');
  console.log('  Patient: patient.priya@mediconnect.local/ SecurePassword123!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
