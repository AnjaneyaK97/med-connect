import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { HeartPulse, Globe, LogOut, User as UserIcon, Shield, Stethoscope } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('hi') ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('mediconnect_lang', nextLang);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'DOCTOR') return '/doctor';
    if (user.role === 'ADMIN') return '/admin';
    return '/patient';
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2 rounded-lg shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">MediConnect</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              AI Telehealth
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-emerald-600 transition-colors">
            {t('nav.home')}
          </Link>

          {isAuthenticated && user?.role === 'PATIENT' && (
            <>
              <Link to="/patient" className="hover:text-emerald-600 transition-colors">
                {t('nav.patientDashboard')}
              </Link>
              <Link to="/consents" className="hover:text-emerald-600 transition-colors">
                {t('nav.consents')}
              </Link>
            </>
          )}

          {isAuthenticated && user?.role === 'DOCTOR' && (
            <Link to="/doctor" className="hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              {t('nav.doctorDashboard')}
            </Link>
          )}

          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link to="/admin" className="hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              {t('nav.adminPanel')}
            </Link>
          )}
        </nav>

        {/* Right Section: Language Toggle & Auth Controls */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{i18n.language.startsWith('hi') ? 'English' : 'हिन्दी'}</span>
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                to={getDashboardLink()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>
                  {user.firstName} ({user.role})
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title={t('common.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                {t('common.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
