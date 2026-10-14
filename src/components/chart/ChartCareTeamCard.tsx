import React from 'react';
import { tokens } from '../../theme/tokens';
import { Users } from 'lucide-react';
import type { PatientCareTeamMember } from '../../types';

interface ChartCareTeamCardProps {
  careTeam: PatientCareTeamMember[];
}

export const ChartCareTeamCard: React.FC<ChartCareTeamCardProps> = ({ careTeam }) => {
  return (
    <div className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-4`}>
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <h3 className={`text-base font-bold flex items-center gap-2 ${tokens.text.title}`}>
          <Users className="w-5 h-5 text-primary-base" />
          Care Team ({careTeam.length})
        </h3>
      </div>
      <div className="space-y-3">
        {careTeam.map((m) => (
          <div
            key={m.userId}
            className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-muted"
          >
            <div>
              <div className="text-sm font-semibold text-text-title">{m.displayName || m.userId}</div>
              <div className="text-xs text-text-muted capitalize">{m.role}</div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tokens.roles[m.role]}`}>
              {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
