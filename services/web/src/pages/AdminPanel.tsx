import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Server, Database, Activity, CheckCircle, Clock } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { t } = useTranslation();

  const [auditLogs] = useState([
    {
      id: 'aud-001',
      actor: 'dr.sharma@mediconnect.org',
      role: 'DOCTOR',
      action: 'NOTE_APPROVE',
      resource: 'CLINICAL_NOTE:cn-801',
      ip: '192.168.1.42',
      time: '10 mins ago',
    },
    {
      id: 'aud-002',
      actor: 'patient@mediconnect.org',
      role: 'PATIENT',
      action: 'CONSENT_GRANT',
      resource: 'CONSENT:cs-109',
      ip: '192.168.1.18',
      time: '25 mins ago',
    },
    {
      id: 'aud-003',
      actor: 'system_gateway',
      role: 'ADMIN',
      action: 'RED_FLAG_ESCALATE',
      resource: 'TRIAGE_SESSION:trg-901',
      ip: '127.0.0.1',
      time: '32 mins ago',
    },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            {t('nav.adminPanel')}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
          <p className="text-xs text-slate-500">
            Security audit logging, clinician verification, and microservice observability.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-800">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Security Admin Privilege</span>
        </div>
      </div>

      {/* Services Health Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { name: 'Gateway API', status: 'Healthy', port: '4000', icon: Server },
          { name: 'FastAPI AI', status: 'Healthy', port: '8000', icon: Activity },
          { name: 'PostgreSQL RLS', status: 'Healthy', port: '5432', icon: Database },
          { name: 'Redis Pub/Sub', status: 'Healthy', port: '6379', icon: Server },
          { name: 'ChromaDB', status: 'Healthy', port: '8001', icon: Database },
          { name: 'Ollama (Llama-3)', status: 'Connected', port: '11434', icon: Activity },
        ].map((svc) => (
          <div key={svc.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <svc.icon className="w-4 h-4 text-slate-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs">{svc.name}</h4>
            <p className="text-[11px] text-slate-500">Port {svc.port}</p>
          </div>
        ))}
      </div>

      {/* Immutable PHI Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">{t('admin.auditTrail')}</h3>
          </div>
          <span className="text-xs text-slate-500">Append-Only Immutability Verified</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Log ID</th>
                <th className="py-2.5 px-3 font-semibold">Actor / User</th>
                <th className="py-2.5 px-3 font-semibold">Role</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Resource</th>
                <th className="py-2.5 px-3 font-semibold">IP Address</th>
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-slate-500">{log.id}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{log.actor}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-sans font-bold text-slate-700">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.resource}</td>
                  <td className="py-2.5 px-3 text-slate-500">{log.ip}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-sans">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
