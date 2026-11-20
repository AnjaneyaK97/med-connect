import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import {
  Mic,
  Calendar,
  Clock,
  Shield,
  Activity,
  HeartPulse,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [recentTriages] = useState([
    {
      id: 'trg-101',
      date: '2026-10-25',
      chiefComplaint: 'Persistent dry cough and mild sore throat for 3 days',
      severity: 'LOW',
      isRedFlag: false,
      status: 'COMPLETED',
    },
    {
      id: 'trg-102',
      date: '2026-10-21',
      chiefComplaint: 'Mild headache and eye strain after monitor usage',
      severity: 'LOW',
      isRedFlag: false,
      status: 'COMPLETED',
    },
  ]);

  const [upcomingAppointments] = useState([
    {
      id: 'apt-301',
      doctor: 'Dr. Ananya Sharma',
      specialization: 'General Medicine',
      time: 'Tomorrow, 10:30 AM',
      status: 'SCHEDULED',
    },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {t('nav.patientDashboard')}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('patient.welcome')}, {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-slate-500">
            Secure, encrypted personal health record protected under PostgreSQL Row-Level Security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Blood Group: {user?.patient?.bloodGroup || 'O+'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>RLS Protected</span>
          </div>
        </div>
      </div>

      {/* Primary Action Card: Start AI Triage */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5" />
            <span>Voice & Text Ingestion (Whisper STT)</span>
          </div>
          <h2 className="text-2xl font-extrabold">{t('patient.quickTriage')}</h2>
          <p className="text-emerald-100 text-sm leading-relaxed">
            {t('patient.quickTriageDesc')}
          </p>
        </div>

        <button
          onClick={() => navigate('/triage')}
          className="flex items-center gap-2 px-6 py-3.5 bg-white text-emerald-800 font-bold text-sm rounded-xl shadow-lg hover:bg-emerald-50 transition-all hover:scale-105 flex-shrink-0"
        >
          <Mic className="w-5 h-5 text-emerald-600 animate-pulse" />
          <span>{t('patient.startTriageBtn')}</span>
        </button>
      </div>

      {/* Grid: Recent Triages & Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Triage History (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>{t('patient.recentSessions')}</span>
            </h3>
          </div>

          <div className="space-y-3">
            {recentTriages.map((triage) => (
              <div
                key={triage.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{triage.date}</span>
                    <span className="text-slate-300">•</span>
                    <span>ID: {triage.id}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {triage.status}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-800">
                  {triage.chiefComplaint}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>Severity:</span>
                    <span className="font-semibold text-slate-800">{triage.severity}</span>
                  </div>
                  <button
                    onClick={() => alert(`Reviewing consultation summary for ${triage.id}`)}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    View Summary & Notes →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments Column (1 Column) */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>{t('patient.upcomingAppointments')}</span>
          </h3>

          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                    {apt.status}
                  </span>
                  <span className="text-xs text-slate-500">{apt.time}</span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{apt.doctor}</h4>
                  <p className="text-xs text-slate-500">{apt.specialization}</p>
                </div>

                <button
                  onClick={() => alert(`Connecting to appointment room for ${apt.id}...`)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Join Telehealth Room
                </button>
              </div>
            ))}

            {/* Emergency Reminder Card */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Emergency Advisory</span>
              </div>
              <p className="leading-relaxed">
                MediConnect AI is for non-critical triage assistance. If experiencing severe chest pain, stroke
                symptoms, or difficulty breathing, dial local emergency services immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
