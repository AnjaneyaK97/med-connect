import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { HeartPulse, Lock, Mail, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login({ email, password });
    if (success) {
      const user = useAuthStore.getState().user;
      if (user?.role === 'DOCTOR') navigate('/doctor');
      else if (user?.role === 'ADMIN') navigate('/admin');
      else navigate('/patient');
    }
  };

  const fillDemo = (role: 'patient' | 'doctor' | 'admin') => {
    if (role === 'patient') {
      setEmail('patient@mediconnect.org');
      setPassword('PatientPass123');
    } else if (role === 'doctor') {
      setEmail('dr.sharma@mediconnect.org');
      setPassword('DoctorPass123');
    } else {
      setEmail('admin@mediconnect.org');
      setPassword('AdminPass123');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex bg-emerald-100 text-emerald-700 p-3 rounded-2xl">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t('auth.loginTitle')}</h2>
          <p className="text-xs text-slate-500">{t('auth.loginSubtitle')}</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('common.login')
            )}
          </button>
        </form>

        {/* Demo Fast Fills */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] font-medium text-slate-400 text-center mb-2">Quick Demo Pre-fills</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemo('patient')}
              className="flex-1 py-1 px-2 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => fillDemo('doctor')}
              className="flex-1 py-1 px-2 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="flex-1 py-1 px-2 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-emerald-600 hover:underline font-semibold">
            {t('auth.registerNow')}
          </Link>
        </div>
      </div>
    </div>
  );
};
