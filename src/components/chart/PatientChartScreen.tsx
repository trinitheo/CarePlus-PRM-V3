import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, ShieldAlert, Activity, FileText, Pill, LayoutDashboard, Clock } from 'lucide-react';
import type { PatientChartData } from '../../services/types';
import type { UserRecord } from '../../types';
import { dataService } from '../../services';
import { getChartNEWS2HeaderInfo, formatAge } from '../../clinical/chart';
import { tokens } from '../../theme/tokens';
import { ChartOverviewTab } from './ChartOverviewTab';
import { ChartNotesTab } from './ChartNotesTab';
import { ChartVitalsTab } from './ChartVitalsTab';
import { ChartMedsTab } from './ChartMedsTab';

interface PatientChartScreenProps {
  currentUser: UserRecord;
}

type ChartTab = 'overview' | 'notes' | 'vitals' | 'meds';

function calculateAge(dobStr?: string): string {
  if (!dobStr) return '—';
  const birth = new Date(dobStr);
  if (Number.isNaN(birth.getTime())) return '—';
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  return `${years}y`;
}

export const PatientChartScreen: React.FC<PatientChartScreenProps> = ({ currentUser }) => {
  const { orgId, patientId } = useParams<{ orgId: string; patientId: string }>();
  const [chart, setChart] = useState<PatientChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDenied, setIsDenied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ChartTab>('overview');

  const loadChart = async () => {
    if (!orgId || !patientId) return;
    setLoading(true);
    setError(null);
    setIsDenied(false);

    try {
      const data = await dataService.getPatientChart(orgId, patientId, currentUser.uid);
      setChart(data);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('permission') ||
        msg.includes('Permission') ||
        msg.includes('denied') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes("not on this patient's care team")
      ) {
        setIsDenied(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
  }, [orgId, patientId, currentUser.uid]);

  // Loading state
  if (loading) {
    return (
      <div className={`p-12 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
        <p className={`text-base font-medium ${tokens.text.muted}`}>Loading patient chart...</p>
      </div>
    );
  }

  // Denied / No-Access state
  if (isDenied) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-status-danger-border bg-status-danger-bg text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-card border border-status-danger-border flex items-center justify-center mx-auto text-status-danger-text">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-status-danger-text">
          You’re not on this patient’s care team.
        </h2>
        <p className="text-base text-text-body">
          Chart access is restricted exclusively to active care team members assigned to this patient.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-base font-semibold bg-surface-card border border-border-default hover:bg-surface-hover text-text-title min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Patient Panel
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !chart) {
    return (
      <div className={`p-8 rounded-xl border text-center space-y-4 ${tokens.status.danger}`}>
        <AlertCircle className="w-8 h-8 mx-auto text-status-danger-text" />
        <h2 className="text-lg font-bold text-status-danger-text">Failed to Load Patient Chart</h2>
        <p className="text-base text-text-body">{error || 'Unknown error occurred.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium bg-surface-card border border-border-default hover:bg-surface-hover text-text-title min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Safety
        </Link>
      </div>
    );
  }

  const { patient } = chart;
  const news2Info = getChartNEWS2HeaderInfo(chart.vitals);

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-text-muted hover:text-text-title hover:bg-surface-hover transition-colors min-h-[44px]`}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assigned Patients
        </Link>
      </div>

      {/* Sticky Patient Banner & NEWS2 Summary */}
      <section className={`p-6 rounded-2xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs sticky top-16 z-20`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Patient Core Demographics */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-subtle text-primary-text font-bold flex items-center justify-center text-xl border border-primary-base/20 shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className={`text-2xl font-bold tracking-tight ${tokens.text.title}`}>
                  {patient.firstName} {patient.lastName}
                </h1>
                <span className="font-mono text-sm font-semibold px-2.5 py-0.5 rounded-md bg-surface-muted text-text-body border border-border-default">
                  MRN: {patient.mrn}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-base text-text-muted">
                <span>Age: <strong className="text-text-title">{calculateAge(patient.dob)}</strong></span>
                <span>•</span>
                <span className="capitalize">Sex: <strong className="text-text-title">{patient.gender || '—'}</strong></span>
                <span>•</span>
                <span>Org: <strong className="text-text-title">{patient.orgName}</strong></span>
              </div>
            </div>
          </div>

          {/* NEWS2 Status Box */}
          <div className="p-4 rounded-xl bg-surface-muted border border-border-subtle shrink-0 max-w-md w-full lg:w-auto">
            <div className="text-xs uppercase font-semibold text-text-muted flex items-center justify-between gap-4 pb-1">
              <span>NEWS2 Score</span>
              {news2Info.latestReading && (
                <span className="text-text-muted">{news2Info.latestReading.ageText}</span>
              )}
            </div>

            {news2Info.latestReading && news2Info.latestReading.result.complete ? (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold text-text-title">
                  {news2Info.latestReading.result.total}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    news2Info.latestReading.result.band === 'high'
                      ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                      : news2Info.latestReading.result.band === 'medium'
                      ? 'bg-role-admin-bg text-role-admin-text border-role-admin-border'
                      : news2Info.latestReading.result.band === 'lowMedium'
                      ? 'bg-role-clinician-bg text-role-clinician-text border-role-clinician-border'
                      : 'bg-status-active-bg text-status-active-text border-status-active-border'
                  }`}
                >
                  Band: {news2Info.latestReading.result.band}
                </span>
                {news2Info.latestReading.result.band === 'lowMedium' && news2Info.latestReading.result.redParameters.length > 0 && (
                  <span className="text-xs text-status-danger-text font-medium">
                    (Red parameter: {news2Info.latestReading.result.redParameters.join(', ')})
                  </span>
                )}
              </div>
            ) : news2Info.latestReading && !news2Info.latestReading.result.complete ? (
              <div className="space-y-1.5 mt-1">
                <div className="text-sm font-semibold text-status-danger-text flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Latest reading incomplete: missing {news2Info.latestReading.result.missingInputs.join(', ')}
                </div>
                {news2Info.latestCompleteReading ? (
                  <div className="text-xs text-text-body bg-surface-card px-2.5 py-1.5 rounded border border-border-default">
                    Last complete: Score <strong>{news2Info.latestCompleteReading.total}</strong> ({news2Info.latestCompleteReading.band}) • {news2Info.latestCompleteReading.ageText}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted">No prior complete NEWS2 reading</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-text-muted mt-1 italic">No vitals on file</div>
            )}
          </div>
        </div>

        {/* Tab Navigation (min 44px tap target, >=16px text) */}
        <div className="flex border-b border-border-subtle mt-6 -mb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'notes', label: `Clinical Notes (${chart.finalNotes.length + chart.myDrafts.length})`, icon: FileText },
            { id: 'vitals', label: `Vitals (${chart.vitals.length})`, icon: Activity },
            { id: 'meds', label: `Prescriptions (${chart.prescriptions.length})`, icon: Pill },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ChartTab)}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-base transition-colors whitespace-nowrap min-h-[44px] cursor-pointer ${
                  isSelected
                    ? 'border-primary-base text-primary-base font-bold'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-border-default'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && <ChartOverviewTab chart={chart} />}
        {activeTab === 'notes' && <ChartNotesTab chart={chart} />}
        {activeTab === 'vitals' && <ChartVitalsTab chart={chart} />}
        {activeTab === 'meds' && <ChartMedsTab chart={chart} />}
      </div>
    </div>
  );
};
