import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { wsService } from '../websocket/socketClient';
import { apiRequest } from '../api/client';
import { Mic, Square, RotateCcw, Upload, CheckCircle2, AlertCircle, Loader2, Radio } from 'lucide-react';

interface VoiceRecorderProps {
  sessionId: string;
  onTranscriptReady: (transcript: string, language: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  sessionId,
  onTranscriptReady,
}) => {
  const { t, i18n } = useTranslation();
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    audioUrl,
    error: micError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecorder();

  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit audio to Gateway
  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setErrorMessage(null);
    setJobProgress(5);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'triage_voice_recording.webm');
      formData.append('language', i18n.language.startsWith('hi') ? 'hi' : 'en');

      const token = localStorage.getItem('mediconnect_access_token');
      const response = await fetch(`/api/v1/triage/sessions/${sessionId}/audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success && data.data?.jobId) {
        setJobId(data.data.jobId);
        setJobStatus('QUEUED');
      } else {
        setErrorMessage(data.error?.message || 'Failed to submit voice recording.');
        setIsUploading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error uploading audio file.');
      setIsUploading(false);
    }
  };

  // Real-time WebSocket listener with HTTP polling fallback
  useEffect(() => {
    // 1. Subscribe to WebSocket progress events for this session
    const unsubscribe = wsService.subscribeToProgress(sessionId, (data) => {
      setJobProgress(data.progress);
      setJobStatus(data.status);
      if (data.status === 'COMPLETED' && data.result) {
        setIsUploading(false);
        onTranscriptReady(data.result.transcript, data.result.language || 'en');
      }
    });

    // 2. HTTP Polling fallback in case of firewall/WS disconnect
    let interval: any = null;
    if (jobId && jobStatus !== 'COMPLETED' && jobStatus !== 'FAILED') {
      interval = setInterval(async () => {
        const res = await apiRequest(`/triage/jobs/${jobId}`);
        if (res.success && res.data) {
          setJobProgress(res.data.progress || 0);
          setJobStatus(res.data.status);

          if (res.data.status === 'COMPLETED' && res.data.result) {
            setIsUploading(false);
            onTranscriptReady(res.data.result.transcript, res.data.result.language || 'en');
          } else if (res.data.status === 'FAILED') {
            setIsUploading(false);
            setErrorMessage(res.data.error || 'Whisper transcription failed.');
          }
        }
      }, 1500);
    }

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [sessionId, jobId, jobStatus, onTranscriptReady]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-center max-w-xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="font-bold text-slate-900 text-lg">Voice Symptom Intake</h3>
        <p className="text-xs text-slate-500">
          Speak clearly into your microphone in English or Hindi (auto-detected).
        </p>
      </div>

      {/* Error Notices */}
      {(micError || errorMessage) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{micError || errorMessage}</span>
        </div>
      )}

      {/* Microphone Record Control Button */}
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        {!audioBlob ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-8 ring-rose-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            <span className="text-[10px] font-bold uppercase mt-1">
              {isRecording ? 'Stop' : 'Record'}
            </span>
          </button>
        ) : (
          <div className="w-full space-y-4">
            <audio src={audioUrl || ''} controls className="w-full rounded-lg" />
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetRecording}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record</span>
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transcribing ({jobProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Process Audio via Whisper</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Timer Display */}
        {isRecording && (
          <div className="flex items-center gap-2 text-rose-600 font-mono font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span>{formatTime(recordingDuration)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar for Async Queue */}
      {isUploading && (
        <div className="space-y-2 pt-2 text-left">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Async Whisper STT Processing...</span>
            <span>{jobProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${jobProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Status: {jobStatus} • Running in background worker without blocking
          </p>
        </div>
      )}

      {/* Transcription Success Badge */}
      {jobStatus === 'COMPLETED' && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Multilingual Whisper Transcription Complete</span>
        </div>
      )}
    </div>
  );
};
