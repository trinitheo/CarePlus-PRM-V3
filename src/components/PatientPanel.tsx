import React, { useEffect, useState } from 'react';
import { Users, AlertCircle, FileText, RefreshCw, UserCheck } from 'lucide-react';
import type { PatientLoadResult } from '../services/types';
import type { UserRecord } from '../types';
import { dataService } from '../services';
import { tokens } from '../theme/tokens';

interface PatientPanelProps {
  currentUser: UserRecord;
}

export const PatientPanel: React.FC<PatientPanelProps> = ({ currentUser }) => {
  const [results, setResults] = useState<PatientLoadResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = 'clinic_a';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getStaffPatients(orgId, currentUser.uid);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.uid]);

  const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
  const rejectedCount = results.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className={`p-6 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight ${tokens.text.title}`}>Assigned Patients</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tokens.roles[currentUser.role as 'clinician' | 'nurse']}`}>
              {currentUser.role}
            </span>
          </div>
          <p className={`text-sm mt-1 ${tokens.text.muted}`}>
            Active care team assignments for {currentUser.displayName}. Access is granted solely through active care team membership.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${tokens.surfaces.card} ${tokens.borders.default} ${tokens.surfaces.hover} ${tokens.text.body} disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${tokens.status.danger}`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={`p-12 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-base mb-3" />
          <p className={`text-sm font-medium ${tokens.text.muted}`}>Loading assigned patient panel...</p>
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && (
        <>
          {results.length === 0 ? (
            /* Designed Empty State */
            <div className={`p-12 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4 border border-border-default">
                <Users className="w-6 h-6 text-text-muted" />
              </div>
              <h3 className={`text-lg font-semibold ${tokens.text.title}`}>No Active Patients Assigned</h3>
              <p className={`text-sm max-w-md mx-auto mt-1 ${tokens.text.muted}`}>
                You are not currently listed on any active care teams. Only an administrator can assign care team members to patients.
              </p>
            </div>
          ) : (
            <div className={`rounded-xl border overflow-hidden shadow-xs ${tokens.surfaces.card} ${tokens.borders.default}`}>
              {/* Table Summary Meta */}
              <div className={`px-6 py-3 border-b flex items-center justify-between text-xs ${tokens.surfaces.muted} ${tokens.borders.subtle} ${tokens.text.muted}`}>
                <span>Total Active Assignments: {results.length}</span>
                {rejectedCount > 0 && (
                  <span className="text-status-danger-text font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {rejectedCount} record(s) failed to load
                  </span>
                )}
              </div>

              {/* Patient Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${tokens.surfaces.muted} ${tokens.borders.subtle} ${tokens.text.muted}`}>
                    <tr>
                      <th className="px-6 py-3.5">Patient Name</th>
                      <th className="px-6 py-3.5">MRN</th>
                      <th className="px-6 py-3.5">DOB</th>
                      <th className="px-6 py-3.5">Care Team Role</th>
                      <th className="px-6 py-3.5 text-right">Chart Access</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${tokens.borders.subtle}`}>
                    {results.map((res, idx) => {
                      if (res.status === 'rejected') {
                        return (
                          <tr key={`rejected-${res.patientId}-${idx}`} className={tokens.status.danger}>
                            <td className="px-6 py-4 font-medium" colSpan={3}>
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-status-danger-text" />
                                <span>Unable to load patient record ({res.patientId})</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tokens.roles[res.memberRole]}`}>
                                {res.memberRole}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-status-danger-text">
                              Access Error
                            </td>
                          </tr>
                        );
                      }

                      const { patient, memberRole } = res.value;
                      return (
                        <tr key={patient.id} className={`${tokens.surfaces.hover} transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-subtle text-primary-text font-semibold flex items-center justify-center text-xs border border-primary-base/20">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </div>
                              <div>
                                <span className={`font-semibold ${tokens.text.title}`}>
                                  {patient.firstName} {patient.lastName}
                                </span>
                                <div className={`text-xs ${tokens.text.muted}`}>{patient.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-text-body border border-border-default">
                              {patient.mrn}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-xs ${tokens.text.body}`}>
                            {patient.dob}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${tokens.roles[memberRole]}`}>
                              {memberRole}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-status-active-bg text-status-active-text border border-status-active-border">
                              <UserCheck className="w-3.5 h-3.5" />
                              Active Member
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
