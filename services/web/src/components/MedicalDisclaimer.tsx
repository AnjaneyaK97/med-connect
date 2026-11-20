import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export const MedicalDisclaimer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <aside aria-label="Clinical Decision Support Notice" className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-900">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{t('common.disclaimer')}</span>
        </div>
      </div>
    </aside>
  );
};
