import React from 'react';
import type { PatientChartData } from '../../services/types';
import { supersededIds, formatAge } from '../../clinical/chart';
import { tokens } from '../../theme/tokens';
import { Pill, CheckCircle2, XCircle, CornerDownRight, Clock } from 'lucide-react';

interface ChartMedsTabProps {
  chart: PatientChartData;
}

export const ChartMedsTab: React.FC<ChartMedsTabProps> = ({ chart }) => {
  const superseded = supersededIds(chart.prescriptions);
  const activeMeds = chart.prescriptions.filter((p) => p.status === 'active');
  const discontinuedMeds = chart.prescriptions.filter((p) => p.status === 'discontinued');

  return (
    <div className="space-y-8">
      {/* Active Medications Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-default">
          <CheckCircle2 className="w-5 h-5 text-status-active-text" />
          <h3 className={`text-lg font-bold ${tokens.text.title}`}>Active Prescriptions ({activeMeds.length})</h3>
        </div>

        {activeMeds.length === 0 ? (
          <div className={`p-6 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <p className="text-base text-text-muted">No active prescriptions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMeds.map((rx) => (
              <div
                key={rx.id}
                className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-text-title">{rx.medication}</h4>
                    <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1">
                      <span>Prescribed by {rx.authorId}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatAge(rx.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-active-bg text-status-active-text border border-status-active-border">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-muted text-sm space-y-1">
                  <div><span className="font-semibold text-text-title">Dose:</span> {rx.dose}</div>
                  <div><span className="font-semibold text-text-title">Route:</span> {rx.route}</div>
                  <div><span className="font-semibold text-text-title">Frequency:</span> {rx.frequency}</div>
                </div>

                {rx.correctsId && (
                  <div className="text-xs text-role-clinician-text font-medium bg-role-clinician-bg/50 px-2.5 py-1 rounded border border-role-clinician-border/50 flex items-center gap-1">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    Correction for prior prescription {rx.correctsId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discontinued Medications Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-default">
          <XCircle className="w-5 h-5 text-status-danger-text" />
          <h3 className={`text-lg font-bold ${tokens.text.title}`}>Discontinued Prescriptions ({discontinuedMeds.length})</h3>
        </div>

        {discontinuedMeds.length === 0 ? (
          <div className={`p-6 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <p className="text-base text-text-muted">No discontinued prescriptions on record.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discontinuedMeds.map((rx) => {
              const isSuperseded = Boolean(rx.id && superseded.has(rx.id));
              return (
                <div
                  key={rx.id}
                  className={`p-5 rounded-xl border shadow-xs space-y-3 ${
                    isSuperseded
                      ? 'bg-surface-muted/60 border-border-subtle opacity-75'
                      : `${tokens.surfaces.card} ${tokens.borders.default}`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-text-title">{rx.medication}</h4>
                      <div className="text-xs text-text-muted flex items-center gap-1.5 mt-1">
                        <span>Prescribed by {rx.authorId}</span>
                        <span>•</span>
                        <span>Created {formatAge(rx.createdAt)}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-danger-bg text-status-danger-text border border-status-danger-border">
                      Discontinued
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-muted text-sm space-y-1">
                    <div><span className="font-semibold text-text-title">Dose:</span> {rx.dose}</div>
                    <div><span className="font-semibold text-text-title">Route:</span> {rx.route}</div>
                    <div><span className="font-semibold text-text-title">Frequency:</span> {rx.frequency}</div>
                  </div>

                  <div className="text-xs text-text-muted pt-1 border-t border-border-subtle flex flex-wrap items-center justify-between gap-1">
                    <span>Discontinued by {rx.discontinuedBy || 'clinician'}</span>
                    <span>{formatAge(rx.discontinuedAt)}</span>
                  </div>

                  {isSuperseded && (
                    <div className="text-xs text-status-danger-text font-medium bg-status-danger-bg/40 px-2.5 py-1 rounded border border-status-danger-border/40">
                      Discontinued & replaced by subsequent correction
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
