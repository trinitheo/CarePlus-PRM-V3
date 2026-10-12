import React, { useState } from 'react';
import { UserX, LogOut } from 'lucide-react';
import { sessionService } from '../services';
import { tokens } from '../theme/tokens';

export const AccountNotSetUpScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      if (sessionService.signOut) {
        await sessionService.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto my-12 p-8 rounded-2xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
      <div className="w-12 h-12 rounded-2xl bg-status-pending/20 text-status-pending flex items-center justify-center font-bold mx-auto mb-4">
        <UserX className="w-6 h-6" />
      </div>

      <h2 className={`text-xl font-bold ${tokens.text.title} mb-2`}>
        Your account isn't set up yet
      </h2>

      <p className={`text-sm ${tokens.text.muted} mb-6 leading-relaxed`}>
        Your login was authenticated, but no staff or patient profile is associated with this account. Please contact your clinic administrator.
      </p>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl border border-border-default hover:bg-surface-hover text-text-title font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        {loading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
};
