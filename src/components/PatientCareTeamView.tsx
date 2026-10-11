import React, { useEffect, useState } from 'react';
import { Building2, Stethoscope, RefreshCw, UserCheck } from 'lucide-react';
import type { PatientOrgCareTeam, UserRecord } from '../types';
import { dataService } from '../services';
import { tokens } from '../theme/tokens';

interface PatientCareTeamViewProps {
  currentUser: UserRecord;
}

export const PatientCareTeamView: React.FC<PatientCareTeamViewProps> = ({ currentUser }) => {
  const [orgTeams, setOrgTeams] = useState<PatientOrgCareTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCareTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getMyCareTeams(currentUser.uid);
      setOrgTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your care teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCareTeams();
  }, [currentUser.uid]);

  const totalMembers = orgTeams.reduce((sum, ot) => sum + ot.members.length, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className={`p-6 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight ${tokens.text.title}`}>My Care Teams</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${tokens.roles.patient}`}>
              Patient Portal
            </span>
          </div>
          <p className={`text-sm mt-1 ${tokens.text.muted}`}>
            Active clinicians and nurses caring for {currentUser.displayName} across clinics.
          </p>
        </div>
        <button
          onClick={loadCareTeams}
          disabled={loading}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${tokens.surfaces.card} ${tokens.borders.default} ${tokens.surfaces.hover} ${tokens.text.body} disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={`p-4 rounded-xl border ${tokens.surfaces.error} ${tokens.borders.error} text-sm text-feedback-error-text`}>
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className={`p-6 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} animate-pulse space-y-3`}>
              <div className="h-5 w-48 bg-surface-muted rounded" />
              <div className="h-4 w-32 bg-surface-muted rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div className="h-16 bg-surface-muted rounded-lg" />
                <div className="h-16 bg-surface-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orgTeams.length === 0 && (
        <div className={`p-12 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-4`}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-border-default bg-surface-muted">
            <UserCheck className="w-8 h-8 text-text-muted" />
          </div>
          <div>
            <h3 className={`text-base font-semibold ${tokens.text.title}`}>No Care Teams Assigned</h3>
            <p className={`text-sm mt-1 max-w-md mx-auto ${tokens.text.muted}`}>
              You do not have any active care teams assigned at any participating clinic yet. When a clinic adds you as a patient and assigns staff, your teams will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Care Teams Grouped by Organization */}
      {!loading && !error && orgTeams.length > 0 && (
        <div className="space-y-6">
          {orgTeams.map((orgTeam) => (
            <div
              key={orgTeam.orgId}
              className={`rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs overflow-hidden`}
            >
              {/* Organization Header */}
              <div className={`p-5 border-b ${tokens.borders.subtle} ${tokens.surfaces.muted} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-card border border-border-default flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-base" />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold ${tokens.text.title}`}>{orgTeam.orgName}</h2>
                    <p className={`text-xs ${tokens.text.muted}`}>Organization ID: {orgTeam.orgId}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-text-muted">
                  {orgTeam.members.length} {orgTeam.members.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              {/* Members List */}
              <div className="p-5">
                {orgTeam.members.length === 0 ? (
                  <p className={`text-sm italic ${tokens.text.muted}`}>
                    No active care team members currently assigned at this clinic.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {orgTeam.members.map((member) => (
                      <div
                        key={member.userId}
                        className={`p-4 rounded-lg border ${tokens.surfaces.card} ${tokens.borders.default} flex items-start gap-3`}
                      >
                        <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center shrink-0 border border-border-default">
                          <Stethoscope className="w-4 h-4 text-text-body" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold truncate ${tokens.text.title}`}>
                            {member.displayName}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] uppercase font-semibold border ${tokens.roles[member.role]}`}
                            >
                              {member.role}
                            </span>
                            <span className="text-[11px] text-feedback-success-text flex items-center gap-1 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-feedback-success-base" />
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
