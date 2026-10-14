import React from 'react';
import type { PatientChartData } from '../../services/types';
import { latestVitals } from '../../clinical/chart';
import { tokens } from '../../theme/tokens';
import { Activity, Pill, FileText } from 'lucide-react';
import { ChartCareTeamCard } from './ChartCareTeamCard';

interface ChartOverviewTabProps {
  chart: PatientChartData;
}

export const ChartOverviewTab: React.FC<ChartOverviewTabProps> = ({ chart }) => {
  const latest = latestVitals(chart.vitals);
  const activePrescriptions = chart.prescriptions.filter((p) => p.status === 'active');
  const latestFinalNote = chart.finalNotes[0];

  const getFlagBadge = (flag: string) => {
    if (flag === 'high') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-danger-bg text-status-danger-text border border-status-danger-border">
          High
        </span>
      );
    }
    if (flag === 'low') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-role-clinician-bg text-role-clinician-text border border-role-clinician-border">
          Low
        </span>
      );
    }
    if (flag === 'normal') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-active-bg text-status-active-text border border-status-active-border">
          Normal
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-muted text-text-muted border border-border-default">
        Missing
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 2-3 Column Responsive Grid on Tablet / Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Column 1: Latest Vitals & Glucose */}
        <div className="space-y-6 lg:col-span-1">
          <div className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className={`text-base font-bold flex items-center gap-2 ${tokens.text.title}`}>
                <Activity className="w-5 h-5 text-primary-base" />
                Latest Vitals
              </h3>
              <span className="text-xs text-text-muted">Per Parameter</span>
            </div>

            <div className="space-y-3.5">
              {/* Blood Pressure */}
              <div className="p-3.5 rounded-lg bg-surface-muted border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-title">Blood Pressure</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagBadge(latest.bloodPressure.flagSystolic)}
                    {latest.bloodPressure.isStale && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-role-admin-bg text-role-admin-text border border-role-admin-border flex items-center gap-1">
                        Stale (&gt;24h)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-text-title">
                    {latest.bloodPressure.systolic !== null && latest.bloodPressure.diastolic !== null
                      ? `${latest.bloodPressure.systolic}/${latest.bloodPressure.diastolic}`
                      : '—'}
                  </span>
                  <span className="text-sm font-medium text-text-muted">{latest.bloodPressure.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                  <span>{latest.bloodPressure.ageText}</span>
                  {latest.bloodPressure.source === 'patient' && (
                    <span className="font-semibold text-role-patient-text">patient-reported</span>
                  )}
                </div>
              </div>

              {/* Heart Rate */}
              <div className="p-3.5 rounded-lg bg-surface-muted border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-title">Heart Rate</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagBadge(latest.heartRate.flag)}
                    {latest.heartRate.isStale && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-role-admin-bg text-role-admin-text border border-role-admin-border">
                        Stale (&gt;24h)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-text-title">
                    {latest.heartRate.value !== null ? latest.heartRate.value : '—'}
                  </span>
                  <span className="text-sm font-medium text-text-muted">{latest.heartRate.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                  <span>{latest.heartRate.ageText}</span>
                  {latest.heartRate.source === 'patient' && (
                    <span className="font-semibold text-role-patient-text">patient-reported</span>
                  )}
                </div>
              </div>

              {/* Respiratory Rate */}
              <div className="p-3.5 rounded-lg bg-surface-muted border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-title">Resp. Rate</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagBadge(latest.respRate.flag)}
                    {latest.respRate.isStale && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-role-admin-bg text-role-admin-text border border-role-admin-border">
                        Stale (&gt;24h)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-text-title">
                    {latest.respRate.value !== null ? latest.respRate.value : '—'}
                  </span>
                  <span className="text-sm font-medium text-text-muted">{latest.respRate.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                  <span>{latest.respRate.ageText}</span>
                </div>
              </div>

              {/* SpO2 */}
              <div className="p-3.5 rounded-lg bg-surface-muted border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-title">Oxygen Saturation</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagBadge(latest.spo2.flag)}
                    {latest.spo2.isStale && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-role-admin-bg text-role-admin-text border border-role-admin-border">
                        Stale (&gt;24h)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-text-title">
                    {latest.spo2.value !== null ? latest.spo2.value : '—'}
                  </span>
                  <span className="text-sm font-medium text-text-muted">{latest.spo2.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                  <span>{latest.spo2.ageText}</span>
                </div>
              </div>

              {/* Temperature */}
              <div className="p-3.5 rounded-lg bg-surface-muted border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-title">Temperature</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagBadge(latest.temperature.flag)}
                    {latest.temperature.isStale && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-role-admin-bg text-role-admin-text border border-role-admin-border">
                        Stale (&gt;24h)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-text-title">
                    {latest.temperature.value !== null ? latest.temperature.value : '—'}
                  </span>
                  <span className="text-sm font-medium text-text-muted">{latest.temperature.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                  <span>{latest.temperature.ageText}</span>
                </div>
              </div>

              {/* Glucose */}
              <div className="p-3.5 rounded-lg bg-surface-muted border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-title">Blood Glucose</span>
                  <div className="flex items-center gap-1.5">
                    {getFlagBadge(latest.glucose.flag)}
                    {latest.glucose.band && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-role-clinician-bg text-role-clinician-text border border-role-clinician-border">
                        {latest.glucose.band}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-text-title">
                    {latest.glucose.value !== null ? latest.glucose.value : '—'}
                  </span>
                  <span className="text-sm font-medium text-text-muted">{latest.glucose.unit}</span>
                  {latest.glucose.context && (
                    <span className="text-xs text-text-muted capitalize">({latest.glucose.context})</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                  <span>{latest.glucose.ageText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Active Medications & Latest Note */}
        <div className="space-y-6 lg:col-span-1">
          {/* Active Medications */}
          <div className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className={`text-base font-bold flex items-center gap-2 ${tokens.text.title}`}>
                <Pill className="w-5 h-5 text-primary-base" />
                Active Medications ({activePrescriptions.length})
              </h3>
            </div>
            {activePrescriptions.length === 0 ? (
              <p className="text-sm text-text-muted italic">No active prescriptions.</p>
            ) : (
              <div className="space-y-3">
                {activePrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3.5 rounded-lg border border-border-subtle bg-surface-muted space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text-title">{rx.medication}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-status-active-bg text-status-active-text border border-status-active-border">
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-text-body">
                      <span>Dose: {rx.dose}</span> • <span>Route: {rx.route}</span> • <span>Freq: {rx.frequency}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Final Clinical Note */}
          <div className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className={`text-base font-bold flex items-center gap-2 ${tokens.text.title}`}>
                <FileText className="w-5 h-5 text-primary-base" />
                Latest Final Note
              </h3>
            </div>
            {latestFinalNote ? (
              <div className="p-4 rounded-lg bg-surface-muted border border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Author: {latestFinalNote.authorId}</span>
                  <span className="px-2 py-0.5 rounded-full font-semibold bg-status-active-bg text-status-active-text border border-status-active-border">
                    Finalised
                  </span>
                </div>
                <p className="text-sm text-text-body whitespace-pre-line leading-relaxed">
                  {latestFinalNote.body}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">No finalized clinical notes.</p>
            )}
          </div>
        </div>

        {/* Column 3: Care Team Members */}
        <div className="space-y-6 lg:col-span-1">
          <ChartCareTeamCard careTeam={chart.careTeam} />
        </div>
      </div>
    </div>
  );
};
