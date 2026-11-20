import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  ShieldAlert,
  FileText,
  Lock,
  ArrowRight,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Multilingual Voice AI + RAG-Grounded Clinical Documentation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Next-Generation Telemedicine with{' '}
          <span className="text-emerald-600">Human-in-the-Loop AI</span>
        </h1>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
          Patients describe symptoms naturally by voice or text. Whisper STT transcribes in real-time, our
          deterministic Red-Flag Engine screens for emergency conditions, and doctors receive cited SOAP
          drafts synthesized from clinical guidelines via ChromaDB and Llama-3.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-md hover:bg-emerald-700 transition-all hover:scale-105"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="px-6 py-3.5 bg-white text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm hover:bg-slate-50 transition-all"
          >
            Clinical Provider Login
          </Link>
        </div>
      </section>

      {/* 4 Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1: Multilingual Voice Triage */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Voice-to-Triage (Whisper)</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Record symptoms in English or Hindi. Audio streams to OpenAI Whisper with automatic language
              detection, producing structured clinical summaries.
            </p>
          </div>

          {/* Pillar 2: Red Flag Safety Engine */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Deterministic Red-Flags</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Independent symptom rules screen for acute stroke, myocardial infarction, and severe hemorrhage,
              immediately escalating cases ahead of the LLM.
            </p>
          </div>

          {/* Pillar 3: RAG Clinical Notes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Citations & SOAP Drafts</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Retrieval-Augmented Generation grounds Llama-3 in verified medical protocols via ChromaDB. Clinicians
              review and edit every note with tracked diffs.
            </p>
          </div>

          {/* Pillar 4: Zero-Trust Security */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">AES-256 & Postgres RLS</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Envelope encryption protects transcripts and notes. Database Row-Level Security guarantees cross-tenant
              isolation backed by patient consent logs.
            </p>
          </div>
        </div>
      </section>

      {/* Safety & Compliance Guarantees */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Safety & Regulatory Principles Baked into Code
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Built adhering strictly to medical decision support boundaries and data privacy standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Human-in-the-Loop Always
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                AI outputs are permanently labeled draft until a certified physician inspects, modifies, and
                signs off.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Pre-LLM PII Sanitization
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Names, phone numbers, and identifying details are tokenized before model inference and rehydrated
                locally.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Immutable PHI Audit Trail
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every sensitive data read, write, and export is recorded immutably with actor, IP, and timestamp.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
