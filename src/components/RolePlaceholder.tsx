import React from 'react';
import { ShieldCheck, UserCheck, ShieldAlert, HeartPulse } from 'lucide-react';
import type { UserRecord } from '../types';
import { tokens } from '../theme/tokens';

interface RolePlaceholderProps {
  currentUser: UserRecord;
}

export const RolePlaceholder: React.FC<RolePlaceholderProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className={`max-w-2xl mx-auto p-8 rounded-2xl border shadow-xs ${tokens.surfaces.card} ${tokens.borders.default} text-center space-y-4`}>
      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-border-default bg-surface-muted">
        {isAdmin ? (
          <ShieldCheck className="w-8 h-8 text-primary-base" />
        ) : (
          <HeartPulse className="w-8 h-8 text-role-patient-text" />
        )}
      </div>

      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${tokens.roles[currentUser.role]}`}>
            {currentUser.role} portal
          </span>
        </div>
        <h2 className={`text-xl font-bold ${tokens.text.title}`}>{currentUser.displayName}</h2>
        <p className={`text-sm mt-1 ${tokens.text.muted}`}>{currentUser.email}</p>
      </div>

      <div className={`p-4 rounded-xl border text-sm text-left ${tokens.surfaces.muted} ${tokens.borders.subtle} ${tokens.text.body}`}>
        {isAdmin ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-text-title">
              <ShieldAlert className="w-4 h-4 text-primary-base" />
              Administrative Boundary Enforced
            </div>
            <p className="text-xs text-text-muted">
              Per CarePlus v2 core policies, administrators manage accounts, organizations, and care team assignments, but do not have clinical chart access. Chart and patient panels are restricted strictly to active care team clinicians and nurses.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-text-title">
              <UserCheck className="w-4 h-4 text-role-patient-text" />
              Patient Relationship Portal
            </div>
            <p className="text-xs text-text-muted">
              Welcome, {currentUser.displayName}. Patient personal health summaries, wearable telemetry integrations, and care team views will arrive in subsequent tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
