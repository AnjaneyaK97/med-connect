import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { NoteReviewEditor } from '../components/NoteReviewEditor';
import {
  AlertTriangle,
  FileCheck2,
  Stethoscope,
  Calendar,
  ShieldCheck,
  CheckCircle,
  Eye,
  Edit3,
  Video,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Urgent red-flag queue (always sorted to top)
  const [urgentCases] = useState([
    {
      id: 'trg-901',
      noteId: 'cn-901',
      patientName: 'Ramesh Patel',
      age: 58,
      chiefComplaint: 'Acute substernal chest pressure radiating to left shoulder, diaphoresis',
      redFlagTrigger: 'Myocardial Infarction / Acute Coronary Syndrome Rule Triggered',
      timestamp: '12 mins ago',
      severity: 'EMERGENCY',
      hasDraftNote: true,
    },
  ]);

  // General triage and draft review queue
  const [regularCases] = useState([
    {
      id: 'trg-802',
      noteId: 'cn-802',
      patientName: 'Emily Watson',
      age: 34,
      chiefComplaint: 'Productive cough with yellowish sputum, low-grade fever for 4 days',
      redFlagTrigger: null,
      timestamp: '45 mins ago',
      severity: 'MEDIUM',
      hasDraftNote: true,
      ragCitationsCount: 3,
    },
    {
      id: 'trg-803',
      noteId: 'cn-803',
      patientName: 'Carlos Gomez',
      age: 28,
      chiefComplaint: 'Right ankle swelling and pain following soccer match',
      redFlagTrigger: null,
      timestamp: '2 hours ago',
      severity: 'LOW',
      hasDraftNote: true,
      ragCitationsCount: 2,
    },
  ]);

  // Upcoming appointments
  const [appointments] = useState([
    {
      id: 'apt-01',
      patientName: 'Emily Watson',
      time: 'Today, 4:00 PM',
      reason: 'Follow-up for respiratory symptoms',
      status: 'SCHEDULED',
      meetingLink: 'https://meet.mediconnect.org/room/emily-w',
    },
    {
      id: 'apt-02',
      patientName: 'Carlos Gomez',
      time: 'Tomorrow, 11:00 AM',
      reason: 'Orthopedic ankle assessment',
      status: 'SCHEDULED',
      meetingLink: 'https://meet.mediconnect.org/room/carlos-g',
    },
  ]);

  if (selectedNoteId) {
    return (
      <NoteReviewEditor
        noteId={selectedNoteId}
        onBack={() => setSelectedNoteId(null)}
        onApproved={() => setSelectedNoteId(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Clinician Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              {t('nav.doctorDashboard')}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verified Clinician
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dr. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-slate-500">
            {user?.doctor?.specialization || 'Cardiology & Internal Medicine'} • License: {user?.doctor?.licenseNumber || 'MD-99214'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="block text-xl font-bold text-rose-600">{urgentCases.length}</span>
            <span className="text-[11px] font-semibold text-slate-500">Urgent Red-Flags</span>
          </div>
          <div className="text-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="block text-xl font-bold text-emerald-600">{regularCases.length}</span>
            <span className="text-[11px] font-semibold text-slate-500">Pending Review</span>
          </div>
        </div>
      </div>

      {/* 1. Urgent Queue (Red-Flag Escalation - Section 5.2 requirement) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-rose-900">{t('doctor.urgentCases')}</h2>
            <p className="text-xs text-rose-700">
              Deterministic rule-based emergency triggers. Prioritize immediate physician review.
            </p>
          </div>
        </div>

        {urgentCases.map((c) => (
          <div
            key={c.id}
            className="bg-rose-50/70 border-2 border-rose-300 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white tracking-wide animate-pulse">
                  CRITICAL / EMERGENCY
                </span>
                <span className="font-bold text-slate-900 text-base">
                  {c.patientName} ({c.age} yrs)
                </span>
                <span className="text-xs text-slate-500">• {c.timestamp}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedNoteId(c.noteId)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Review Urgent SOAP Note</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs space-y-1">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Triggered Safety Rule: {c.redFlagTrigger}</span>
              </div>
              <p className="text-slate-700 font-medium">Chief Complaint: {c.chiefComplaint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Standard Triage Queue & AI Draft Note Review (Section 5.1 Human-in-the-Loop) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('doctor.pendingNotes')}</h2>
              <p className="text-xs text-slate-500">
                RAG-synthesized SOAP drafts with verified medical source citations awaiting clinician approval.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {regularCases.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.severity === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Severity: {item.severity}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{item.patientName}</span>
                  <span className="text-xs text-slate-500">({item.age} yrs)</span>
                  <span className="text-xs text-slate-400">• {item.timestamp}</span>
                </div>

                <p className="text-xs text-slate-700 font-medium">{item.chiefComplaint}</p>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    AI SOAP Draft Ready
                  </span>
                  <span>•</span>
                  <span>{item.ragCitationsCount} Medical Guidelines Grounded</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setSelectedNoteId(item.noteId)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit & Approve Note</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Appointment Management */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upcoming Consultations</h2>
            <p className="text-xs text-slate-500">Telehealth patient visits scheduled today and tomorrow.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{apt.patientName}</span>
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                    {apt.time}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{apt.reason}</p>
              </div>

              <a
                href={apt.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex-shrink-0"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Join Room</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
