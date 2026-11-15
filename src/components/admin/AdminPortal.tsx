import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FilePlus2, RotateCcw, ShieldAlert } from 'lucide-react';
import type { IdType, PatientRecord, UserRecord } from '../../types';
import { dataService, type PatientFileDecision } from '../../services';
import { ID_TYPE_LABELS } from '../../services/patientMatching';
import { tokens } from '../../theme/tokens';
import { EMPTY_PATIENT_FORM, NewPatientFileForm, toNewPatientInput, type PatientFileFormValue } from './NewPatientFileForm';
import { PatientMatchResults } from './PatientMatchResults';

interface AdminPortalProps {
  currentUser: UserRecord;
}

type Outcome = { kind: 'created' | 'reused'; patient: PatientRecord };

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser }) => {
  const orgId = currentUser.orgId;
  const [form, setForm] = useState<PatientFileFormValue>(EMPTY_PATIENT_FORM);
  const [decision, setDecision] = useState<PatientFileDecision | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!orgId) {
    return (
      <div className={`max-w-xl mx-auto p-6 rounded-2xl border ${tokens.status.danger}`}>
        This admin account is not linked to an organisation.
      </div>
    );
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const search = () =>
    run(async () => {
      setDecision(await dataService.searchPatientFiles(orgId, toNewPatientInput(form)));
    });

  const create = () =>
    run(async () => {
      const patient = await dataService.createPatientFile(orgId, toNewPatientInput(form));
      setOutcome({ kind: 'created', patient });
    });

  const addId = (patientId: string, idType: IdType, idNumber: string) =>
    run(async () => {
      await dataService.addPatientId(orgId, patientId, idType, idNumber);
      setDecision(await dataService.searchPatientFiles(orgId, toNewPatientInput(form)));
    });

  const startOver = () => {
    setForm(EMPTY_PATIENT_FORM);
    setDecision(null);
    setOutcome(null);
    setError(null);
  };

  // Any edit invalidates the last search, so Create always reflects what is on screen.
  const editForm = (value: PatientFileFormValue) => {
    setForm(value);
    setDecision(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${tokens.primary.subtle}`}>
          <FilePlus2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${tokens.text.title}`}>New patient file</h1>
          <p className={`text-sm ${tokens.text.muted}`}>
            Every person gets one file and one MRN. Existing files are checked first.
          </p>
        </div>
      </div>

      {outcome ? (
        <section className={`p-6 rounded-2xl border space-y-4 ${tokens.surfaces.card} ${tokens.borders.default}`}>
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${tokens.status.active}`}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-sm font-semibold">
              {outcome.kind === 'created' ? 'Patient file created' : 'Using the existing patient file'}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className={tokens.text.muted}>Name</dt>
            <dd className={`font-semibold ${tokens.text.title}`}>{outcome.patient.firstName} {outcome.patient.lastName}</dd>
            <dt className={tokens.text.muted}>MRN</dt>
            <dd className={`font-mono font-semibold ${tokens.text.title}`}>{outcome.patient.mrn}</dd>
            <dt className={tokens.text.muted}>Date of birth</dt>
            <dd className={tokens.text.body}>{outcome.patient.dob}</dd>
            <dt className={tokens.text.muted}>ID</dt>
            <dd className={`font-mono ${tokens.text.body}`}>
              {outcome.patient.idType && outcome.patient.idNumber
                ? `${ID_TYPE_LABELS[outcome.patient.idType]} ${outcome.patient.idNumber}`
                : 'None on file'}
            </dd>
          </dl>
          <button
            type="button"
            onClick={startOver}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 cursor-pointer ${tokens.borders.default} ${tokens.surfaces.hover} ${tokens.text.title}`}
          >
            <RotateCcw className="w-4 h-4" /> Start another
          </button>
        </section>
      ) : (
        <>
          <section className={`p-6 rounded-2xl border ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <NewPatientFileForm
              value={form}
              onChange={editForm}
              onSearch={search}
              busy={busy}
              idRequested={decision?.kind === 'needs-new-id'}
            />
          </section>

          {error && (
            <div role="alert" className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${tokens.status.danger}`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {decision && (
            <section aria-live="polite">
              <PatientMatchResults
                decision={decision}
                busy={busy}
                onUseFile={(patient) => setOutcome({ kind: 'reused', patient })}
                onCreate={create}
                onAddId={addId}
              />
            </section>
          )}
        </>
      )}

      <div className={`p-4 rounded-xl border text-xs flex items-start gap-2 ${tokens.surfaces.muted} ${tokens.borders.subtle} ${tokens.text.muted}`}>
        <ShieldAlert className="w-4 h-4 shrink-0" />
        Admins manage files and accounts but do not have chart access. Clinical records are visible only to the patient's active care team.
      </div>
    </div>
  );
};
