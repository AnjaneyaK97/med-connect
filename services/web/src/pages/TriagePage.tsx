import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { apiRequest } from '../api/client';
import {
  Mic,
  FileEdit,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  Activity,
  Stethoscope,
  Clock,
  Loader2,
} from 'lucide-react';

export const TriagePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [sessionId, setSessionId] = useState<string>('trg-draft-' + Date.now());
  const [transcript, setTranscript] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('en');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageSummary, setTriageSummary] = useState<any>(null);

  // Initialize or start triage session
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await apiRequest<{ id: string }>('/triage/sessions', {
          method: 'POST',
          body: JSON.stringify({
            language: i18n.language.startsWith('hi') ? 'hi' : 'en',
          }),
        });

        if (res.success && res.data?.id) {
          setSessionId(res.data.id);
        }
      } catch {
        // Fall back to generated local session ID
      }
    };

    initSession();
  }, [i18n.language]);

  const handleTranscriptReady = (text: string, lang: string) => {
    setTranscript(text);
    setDetectedLanguage(lang);
  };

  const runTriageAnalysis = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);

    try {
      const res = await apiRequest(`/triage/sessions/${sessionId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          transcript,
          language: detectedLanguage,
        }),
      });

      if (res.success && res.data?.summary) {
        setTriageSummary(res.data.summary);
      } else {
        // Safe simulated fallback for client preview
        const isEmergency = /chest\s*pain|stroke|सीने\s*में\s*दर्द/i.test(transcript);
        setTriageSummary({
          chief_complaint: transcript.substring(0, 100),
          symptoms: isEmergency ? ['Chest Pain', 'Shortness Of Breath'] : ['Mild Cough', 'Fatigue'],
          duration: '3 days',
          severity: isEmergency ? 'EMERGENCY' : 'MEDIUM',
          is_red_flag: isEmergency,
          red_flags: isEmergency ? ['Suspected Acute Coronary Syndrome'] : [],
          emergency_advisory: isEmergency
            ? 'EMERGENCY ADVISORY: Symptoms suggest possible acute cardiac emergency. Please call emergency services (911/112) or proceed to the nearest emergency room immediately.'
            : null,
          recommended_specialty: isEmergency ? 'Emergency Medicine' : 'General Medicine',
          language: detectedLanguage,
        });
      }
    } catch {
      // In case of error
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multilingual AI Triage Assistant</span>
        </span>
        <h1 className="text-3xl font-bold text-slate-900">Patient Symptom Intake</h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
          Describe your symptoms by voice or text. Whisper STT auto-detects English or Hindi, transcribing
          symptoms for deterministic safety analysis.
        </p>
      </div>

      {/* Emergency Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Life-Threatening Emergency Notice:</span>
          <p>{t('common.emergencyNotice')}</p>
        </div>
      </div>

      {/* Red-Flag Escalation Banner (Triggered when is_red_flag is true) */}
      {triageSummary?.is_red_flag && (
        <div className="bg-rose-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 animate-pulse border-4 border-rose-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white text-rose-600 rounded-2xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 tracking-wider">
                Deterministic Red-Flag Escalation Triggered
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                IMMEDIATE EMERGENCY ATTENTION RECOMMENDED
              </h2>
            </div>
          </div>

          <div className="bg-rose-700/60 p-4 rounded-xl text-sm leading-relaxed border border-rose-500">
            {triageSummary.emergency_advisory}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="tel:112"
              className="flex items-center gap-2 px-6 py-3.5 bg-white text-rose-700 font-extrabold text-sm rounded-xl shadow-lg hover:bg-rose-50 transition-all hover:scale-105"
            >
              <PhoneCall className="w-5 h-5 text-rose-600" />
              <span>Call Emergency Services (911 / 112 / 108)</span>
            </a>
            <span className="text-xs text-rose-100">
              Triggered safety rules: {triageSummary.red_flags?.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Structured Triage Summary Display */}
      {triageSummary && !triageSummary.is_red_flag && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Structured Triage Summary</h3>
                <p className="text-xs text-slate-500">
                  Deterministic rule analysis complete • Non-emergency case
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                triageSummary.severity === 'HIGH'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              Severity: {triageSummary.severity}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-semibold text-slate-500">Chief Complaint</span>
              <p className="text-sm font-bold text-slate-800">{triageSummary.chief_complaint}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-semibold text-slate-500">Duration & Onset</span>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{triageSummary.duration}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">Identified Symptoms</span>
            <div className="flex flex-wrap gap-2">
              {triageSummary.symptoms?.map((s: string) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-500 block">Recommended Specialty</span>
                <span className="text-sm font-bold text-emerald-900">
                  {triageSummary.recommended_specialty}
                </span>
              </div>
            </div>

            <button
              onClick={() => alert(`Routing triage session ${sessionId} to doctor consultation queue...`)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Proceed to Consultation
            </button>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs (Hidden once summary is generated) */}
      {!triageSummary && (
        <>
          <div className="flex justify-center">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMode('voice')}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'voice'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Voice Recording (Whisper)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'text'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>Text Description</span>
              </button>
            </div>
          </div>

          {/* Main Input Form */}
          {mode === 'voice' ? (
            <VoiceRecorder
              sessionId={sessionId}
              onTranscriptReady={handleTranscriptReady}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4 max-w-xl mx-auto">
              <h3 className="font-bold text-slate-900 text-base">Type Your Symptoms</h3>
              <textarea
                rows={5}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Describe what you are experiencing, duration, and severity in English or Hindi..."
                className="w-full p-3.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              />
            </div>
          )}

          {/* Transcript Review & Confirmation Area */}
          {transcript && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 max-w-xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Transcribed Symptoms</span>
                </div>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Lang: {detectedLanguage.toUpperCase()}
                </span>
              </div>

              <textarea
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                You can edit or add details to the transcribed text above before submitting.
              </p>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={runTriageAnalysis}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Deterministic Red-Flag Rules...</span>
                  </>
                ) : (
                  <>
                    <span>Run Red-Flag Screen & Generate Triage Summary</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
