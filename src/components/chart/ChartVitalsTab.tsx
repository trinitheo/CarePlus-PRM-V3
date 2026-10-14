import React from 'react';
import type { PatientChartData } from '../../services/types';
import { supersededIds, formatAge, isStale } from '../../clinical/chart';
import { calculateNEWS2, getReferenceFlags, getGlucoseBand } from '../../clinical/vitals';
import { tokens } from '../../theme/tokens';
import { Activity, AlertTriangle, CornerDownRight, CheckCircle2, Clock } from 'lucide-react';

interface ChartVitalsTabProps {
  chart: PatientChartData;
}

export const ChartVitalsTab: React.FC<ChartVitalsTabProps> = ({ chart }) => {
  const superseded = supersededIds(chart.vitals);
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const recentVitals = chart.vitals.filter((v) => {
    const t = v.recordedAt ? Date.parse(v.recordedAt) : 0;
    return t ? now - t <= twentyFourHoursMs : true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border-default">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${tokens.text.title}`}>
          <Activity className="w-5 h-5 text-primary-base" />
          Vitals History (Last 24 Hours: {recentVitals.length})
        </h3>
        <span className="text-xs text-text-muted">Newest First</span>
      </div>

      {recentVitals.length === 0 ? (
        <div className={`p-8 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
          <p className="text-base text-text-muted">No vital signs recorded in the last 24 hours.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentVitals.map((v) => {
            const isSuperseded = Boolean(v.id && superseded.has(v.id));
            const news2 = calculateNEWS2({
              respRate: v.respRate,
              spo2: v.spo2,
              onOxygen: v.onOxygen,
              systolic: v.systolic,
              heartRate: v.heartRate,
              consciousness: v.consciousness,
              tempC: v.tempC,
            });
            const flags = getReferenceFlags({
              heartRate: v.heartRate,
              respRate: v.respRate,
              systolic: v.systolic,
              diastolic: v.diastolic,
              tempC: v.tempC,
              spo2: v.spo2,
              glucoseMgDl: v.glucoseMgDl,
            });
            const glucoseBand = v.glucoseMgDl !== undefined && v.glucoseMgDl !== null
              ? getGlucoseBand(v.glucoseMgDl)
              : null;
            const stale = isStale(v.recordedAt);

            return (
              <div
                key={v.id}
                id={`vital-${v.id}`}
                className={`p-5 rounded-xl border shadow-xs transition-colors space-y-4 ${
                  isSuperseded
                    ? 'bg-surface-muted/60 border-border-subtle opacity-75'
                    : `${tokens.surfaces.card} ${tokens.borders.default}`
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-title text-sm">Author: {v.authorId}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {formatAge(v.recordedAt)}
                    </span>
                    {v.source === 'patient' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-role-patient-bg text-role-patient-text border border-role-patient-border">
                        patient-reported
                      </span>
                    )}
                    {stale && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-role-admin-bg text-role-admin-text border border-role-admin-border flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Stale (&gt;24h)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isSuperseded && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-danger-bg text-status-danger-text border border-status-danger-border">
                        Superseded by Correction
                      </span>
                    )}
                    {v.correctsId && (
                      <a
                        href={`#vital-${v.correctsId}`}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-role-clinician-bg text-role-clinician-text border border-role-clinician-border hover:underline flex items-center gap-1"
                      >
                        <CornerDownRight className="w-3 h-3" /> Corrects {v.correctsId}
                      </a>
                    )}
                  </div>
                </div>

                {/* Measurements Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {/* BP */}
                  <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle space-y-1">
                    <div className="text-xs font-semibold text-text-muted">BP (mmHg)</div>
                    <div className="text-base font-bold text-text-title">
                      {v.systolic !== undefined && v.diastolic !== undefined
                        ? `${v.systolic}/${v.diastolic}`
                        : '—'}
                    </div>
                  </div>

                  {/* HR */}
                  <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle space-y-1">
                    <div className="text-xs font-semibold text-text-muted">HR (bpm)</div>
                    <div className="text-base font-bold text-text-title">
                      {v.heartRate !== undefined && v.heartRate !== null ? v.heartRate : '—'}
                    </div>
                  </div>

                  {/* RR */}
                  <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle space-y-1">
                    <div className="text-xs font-semibold text-text-muted">RR (/min)</div>
                    <div className="text-base font-bold text-text-title">
                      {v.respRate !== undefined && v.respRate !== null ? v.respRate : '—'}
                    </div>
                  </div>

                  {/* SpO2 */}
                  <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle space-y-1">
                    <div className="text-xs font-semibold text-text-muted">SpO₂ (%)</div>
                    <div className="text-base font-bold text-text-title">
                      {v.spo2 !== undefined && v.spo2 !== null ? v.spo2 : '—'}
                    </div>
                  </div>

                  {/* Temp */}
                  <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle space-y-1">
                    <div className="text-xs font-semibold text-text-muted">Temp (°C)</div>
                    <div className="text-base font-bold text-text-title">
                      {v.tempC !== undefined && v.tempC !== null ? v.tempC : '—'}
                    </div>
                  </div>

                  {/* Glucose */}
                  <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle space-y-1">
                    <div className="text-xs font-semibold text-text-muted">Glucose (mg/dL)</div>
                    <div className="text-base font-bold text-text-title">
                      {v.glucoseMgDl !== undefined && v.glucoseMgDl !== null ? v.glucoseMgDl : '—'}
                    </div>
                    {glucoseBand && (
                      <span className="text-[10px] font-semibold text-role-clinician-text block">
                        {glucoseBand}
                      </span>
                    )}
                  </div>
                </div>

                {/* Discrete NEWS2 Evaluation for this Reading */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-title">NEWS2 for this reading:</span>
                    {news2.complete ? (
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-title">Score: {news2.total}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold border ${
                            news2.band === 'high'
                              ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                              : news2.band === 'medium'
                              ? 'bg-role-admin-bg text-role-admin-text border-role-admin-border'
                              : news2.band === 'lowMedium'
                              ? 'bg-role-clinician-bg text-role-clinician-text border-role-clinician-border'
                              : 'bg-status-active-bg text-status-active-text border-status-active-border'
                          }`}
                        >
                          Band: {news2.band}
                        </span>
                        {news2.redParameters.length > 0 && (
                          <span className="text-status-danger-text font-medium">
                            (Red zone: {news2.redParameters.join(', ')})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-text-muted italic">
                        Incomplete (missing {news2.missingInputs.join(', ')})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
