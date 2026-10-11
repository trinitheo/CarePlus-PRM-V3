import React from 'react';
import { UserCheck } from 'lucide-react';
import type { UserRecord } from '../types';
import { CANONICAL_SEED } from '../services/seed';
import { tokens } from '../theme/tokens';

interface DevUserSwitcherProps {
  currentUser: UserRecord | null;
  onSelectUser: (uid: string) => void;
}

export const DevUserSwitcher: React.FC<DevUserSwitcherProps> = ({
  currentUser,
  onSelectUser,
}) => {
  return (
    <div className={`p-4 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary-base" />
          <span className={`text-xs font-bold uppercase tracking-wider ${tokens.text.muted}`}>
            Dev Mode — Sign in as:
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-muted text-text-muted border border-border-default">
          Mock In-Memory
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {CANONICAL_SEED.users.map((user) => {
          const isSelected = currentUser?.uid === user.uid;
          return (
            <button
              key={user.uid}
              onClick={() => onSelectUser(user.uid)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isSelected
                  ? 'bg-primary-base text-text-inverted border-primary-hover shadow-xs ring-2 ring-primary-base/20'
                  : `${tokens.surfaces.card} ${tokens.borders.default} ${tokens.surfaces.hover} ${tokens.text.body}`
              }`}
            >
              <span>{user.displayName}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold border ${
                  isSelected ? 'bg-white/20 text-white border-white/30' : tokens.roles[user.role]
                }`}
              >
                {user.role}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
