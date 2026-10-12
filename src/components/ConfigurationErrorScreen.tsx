import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { tokens } from '../theme/tokens';

export const ConfigurationErrorScreen: React.FC<{ errorMessage?: string }> = ({ errorMessage }) => {
  return (
    <div className={`max-w-md mx-auto my-12 p-8 rounded-2xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
      <div className="w-12 h-12 rounded-2xl bg-status-error/10 text-status-error flex items-center justify-center font-bold mx-auto mb-4">
        <AlertOctagon className="w-6 h-6" />
      </div>

      <h2 className={`text-xl font-bold ${tokens.text.title} mb-2`}>
        Configuration Error
      </h2>

      <p className={`text-sm ${tokens.text.muted} mb-4 leading-relaxed`}>
        {errorMessage || 'Firebase configuration is missing or invalid. Please configure client options in src/services/firebaseConfig.ts.'}
      </p>

      <div className="p-3 rounded-xl bg-surface-canvas border border-border-default text-xs font-mono text-text-muted text-left">
        Status: configError (Fail Closed)
      </div>
    </div>
  );
};
