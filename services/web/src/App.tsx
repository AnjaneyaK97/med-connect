import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Navbar } from './components/Navbar';
import { MedicalDisclaimer } from './components/MedicalDisclaimer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { TriagePage } from './pages/TriagePage';
import { ConsentPage } from './pages/ConsentPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
        <div>
          {/* Medical Disclaimer Banner */}
          <MedicalDisclaimer />

          {/* Navigation Bar */}
          <Navbar />

          {/* Primary View Routing */}
          <main className="pb-16">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Patient Portal */}
              <Route
                path="/patient"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Patient AI Triage Flow */}
              <Route
                path="/triage"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <TriagePage />
                  </ProtectedRoute>
                }
              />

              {/* Patient Consent & Privacy Settings */}
              <Route
                path="/consents"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <ConsentPage />
                  </ProtectedRoute>
                }
              />

              {/* Doctor Clinical Queue */}
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 py-6 px-4 bg-white text-center text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">
            MediConnect Telemedicine Platform • Human-in-the-Loop AI Decision Support
          </p>
          <p className="text-[11px] text-slate-400">
            Protected under HIPAA principles, AES-256 Envelope Encryption, and PostgreSQL Row-Level Security.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
