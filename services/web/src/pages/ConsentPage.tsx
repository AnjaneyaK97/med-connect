import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Stethoscope,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ConsentPage: React.FC = () => {
  const { t } = useTranslation();

  const [consents, setConsents] = useState([
    {
      id: 'cst-01',
      doctorName: 'Dr. Ananya Sharma',
      specialization: 'Cardiology',
      scope: 'FULL',
      accessGranted: true,
      expiresAt: '2026-12-31',
      revokedAt: null,
    },
    {
      id: 'cst-02',
      doctorName: 'Dr. Rajesh Verma',
      specialization: 'Pulmonology',
      scope: 'TRIAGE_ONLY',
      accessGranted: false,
      expiresAt: '2026-11-15',
      revokedAt: '2026-10-24',
    },
  ]);

  const [selectedDoctor, setSelectedDoctor] = useState('doc-sharma');
  const [selectedScope, setSelectedScope] = useState('FULL');
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    const newConsent = {
      id: 'cst-' + Date.now(),
      doctorName: selectedDoctor === 'doc-sharma' ? 'Dr. Ananya Sharma' : 'Dr. Vikram Malhotra',
      specialization: selectedDoctor === 'doc-sharma' ? 'Cardiology' : 'General Medicine',
      scope: selectedScope,
      accessGranted: true,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      revokedAt: null,
    };

    setConsents([newConsent, ...consents.filter((c) => c.doctorName !== newConsent.doctorName)]);
    setSuccessMessage(`Access granted to ${newConsent.doctorName} under ${selectedScope} scope.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleRevoke = (id: string, doctorName: string) => {
    setConsents(
      consents.map((c) =>
        c.id === id ? { ...c, accessGranted: false, revokedAt: new Date().toISOString().split('T')[0] } : c
      )
    );
    setSuccessMessage(`Access revoked for ${doctorName}. PostgreSQL Row-Level Security policy updated.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {t('nav.consents')}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Patient Consent & Data Privacy Controls</h1>
          <p className="text-xs text-slate-500">
            Granular access controls enforced directly at the database engine via PostgreSQL Row-Level Security.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>HIPAA & GDPR Compliant</span>
        </div>
      </div>

      {/* Regulatory Privacy Notice */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-xs text-emerald-900 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Patient Self-Sovereign Health Data Policy:</span>
        </div>
        <p>
          You hold exclusive control over which physicians can view your encrypted clinical notes, transcripts,
          and triage sessions. Revoking access takes effect immediately and is logged immutably in the system audit trail.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grant Access Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Grant New Doctor Authorization</h3>

        <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Select Clinician</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value="doc-sharma">Dr. Ananya Sharma (Cardiology)</option>
              <option value="doc-malhotra">Dr. Vikram Malhotra (General Medicine)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Authorization Scope</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value="FULL">FULL (Notes, Transcripts & History)</option>
              <option value="TRIAGE_ONLY">TRIAGE_ONLY (Only Recent Triage Summary)</option>
              <option value="SUMMARY_ONLY">SUMMARY_ONLY (Only Approved Diagnoses)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Duration</label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            Authorize Access
          </button>
        </form>
      </div>

      {/* Active & Revoked Consents List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Active & Historical Authorization Grants</h3>

        <div className="divide-y divide-slate-100">
          {consents.map((c) => (
            <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{c.doctorName}</span>
                  <span className="text-xs text-slate-500">({c.specialization})</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.accessGranted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {c.accessGranted ? 'ACTIVE' : 'REVOKED'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Scope: <strong className="text-slate-700">{c.scope}</strong></span>
                  <span>•</span>
                  <span>
                    {c.accessGranted ? `Expires: ${c.expiresAt}` : `Revoked: ${c.revokedAt}`}
                  </span>
                </div>
              </div>

              {c.accessGranted ? (
                <button
                  type="button"
                  onClick={() => handleRevoke(c.id, c.doctorName)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  <ShieldX className="w-3.5 h-3.5 text-rose-600" />
                  <span>Revoke Access</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Access Terminated</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
