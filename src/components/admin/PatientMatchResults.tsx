import React, { useState } from 'react';
import { AlertOctagon, IdCard, UserCheck, UserPlus, Users } from 'lucide-react';
import type { IdType, PatientRecord } from '../../types';
import { ID_TYPE_LABELS, type PatientFileDecision } from '../../services/patientMatching';
import { tokens } from '../../theme/tokens';

interface PatientMatchResultsProps {
  decision: PatientFileDecision;
  busy: boolean;
  onUseFile: (patient: PatientRecord) => void;
  onCreate: () => void;
  onAddId: (patientId: string, idType: IdType, idNumber: string) => void;
}

const buttonBase = 'min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer';
const secondaryButton = `${buttonBase} border ${tokens.borders.default} ${tokens.surfaces.card} ${tokens.surfaces.hover} ${tokens.text.title}`;

function idLabel(p: PatientRecord): string {
  return p.idType && p.idNumber ? `${ID_TYPE_LABELS[p.idType]} ${p.idNumber}` : 'No ID on file';
}

const FileCard: React.FC<{ patient: PatientRecord; children?: React.ReactNode }> = ({ patient, children }) => (
  <div className={`p-4 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} space-y-3`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div className={`text-sm font-semibold ${tokens.text.title}`}>
        {patient.firstName} {patient.lastName}
      </div>
      <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md border ${tokens.surfaces.muted} ${tokens.borders.default} ${tokens.text.body}`}>
        {patient.mrn}
      </span>
    </div>
    <div className={`text-xs ${tokens.text.muted} flex flex-wrap gap-x-4 gap-y-1`}>
      <span>DOB {patient.dob}</span>
      <span className="font-mono">{idLabel(patient)}</span>
    </div>
    {children}
  </div>
);

const AddIdInline: React.FC<{ patientId: string; busy: boolean; onAddId: PatientMatchResultsProps['onAddId'] }> = ({ patientId, busy, onAddId }) => {
  const [idType, setIdType] = useState<IdType>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const field = `min-h-[44px] px-3 py-2 rounded-xl border text-sm ${tokens.borders.default} ${tokens.surfaces.canvas} ${tokens.text.body}`;
  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAddId(patientId, idType, idNumber);
      }}
    >
      <select aria-label="ID type" value={idType} onChange={(e) => setIdType(e.target.value as IdType)} className={field}>
        {(Object.keys(ID_TYPE_LABELS) as IdType[]).map((t) => (
          <option key={t} value={t}>{ID_TYPE_LABELS[t]}</option>
        ))}
      </select>
      <input aria-label="ID number" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={`${field} font-mono flex-1`} placeholder="Their ID number" />
      <button type="submit" disabled={busy} className={secondaryButton}>
        <IdCard className="w-4 h-4" /> Add ID to this file
      </button>
    </form>
  );
};

const Notice: React.FC<{ tone: string; icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({ tone, icon, title, children }) => (
  <div className={`p-4 rounded-xl border ${tone} space-y-1`}>
    <div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
    {children && <div className="text-xs">{children}</div>}
  </div>
);

export const PatientMatchResults: React.FC<PatientMatchResultsProps> = ({ decision, busy, onUseFile, onCreate, onAddId }) => {
  const useButton = (p: PatientRecord) => (
    <button type="button" disabled={busy} onClick={() => onUseFile(p)} className={secondaryButton}>
      <UserCheck className="w-4 h-4" /> Use this file
    </button>
  );

  if (decision.kind === 'reuse-by-id') {
    return (
      <div className="space-y-3">
        <Notice tone={tokens.status.active} icon={<UserCheck className="w-4 h-4" />} title="This ID is already on file">
          This person already has a patient file. Use it; do not create another.
        </Notice>
        <FileCard patient={decision.patient}>{useButton(decision.patient)}</FileCard>
      </div>
    );
  }

  if (decision.kind === 'blocked-existing-needs-id') {
    return (
      <div className="space-y-3">
        <Notice tone={tokens.status.danger} icon={<AlertOctagon className="w-4 h-4" />} title="Same name and date of birth, but no ID to compare">
          If this is the same person, use their file. If not, add the existing patient's ID first. Creating a new file stays blocked until then.
        </Notice>
        {decision.patients.map((p) => (
          <FileCard key={p.id} patient={p}>
            {useButton(p)}
            <AddIdInline patientId={p.id} busy={busy} onAddId={onAddId} />
          </FileCard>
        ))}
      </div>
    );
  }

  if (decision.kind === 'needs-new-id') {
    return (
      <div className="space-y-3">
        <Notice tone={tokens.primary.subtle} icon={<IdCard className="w-4 h-4" />} title="Same name and date of birth: ID needed">
          Enter this person's ID above, using the same type as the file below, then check again. If it's the same person, use their file.
        </Notice>
        {decision.patients.map((p) => (
          <FileCard key={p.id} patient={p}>{useButton(p)}</FileCard>
        ))}
      </div>
    );
  }

  const { possible, sameNameDifferentId } = decision;
  return (
    <div className="space-y-3">
      {sameNameDifferentId.length > 0 && (
        <Notice tone={tokens.status.removed} icon={<Users className="w-4 h-4" />} title="Same name and date of birth, different ID">
          These are different people. They keep their own files.
        </Notice>
      )}
      {sameNameDifferentId.map((p) => <FileCard key={p.id} patient={p} />)}

      {possible.length > 0 && (
        <Notice tone={tokens.status.removed} icon={<Users className="w-4 h-4" />} title="Possible matches: check these aren't the same person">
          Same date of birth, and part of the name matches.
        </Notice>
      )}
      {possible.map((p) => (
        <FileCard key={p.id} patient={p}>{useButton(p)}</FileCard>
      ))}

      {possible.length === 0 && sameNameDifferentId.length === 0 && (
        <Notice tone={tokens.status.active} icon={<UserPlus className="w-4 h-4" />} title="No existing file for this person" />
      )}
      <button type="button" disabled={busy} onClick={onCreate} className={`${buttonBase} w-full sm:w-auto ${tokens.primary.base}`}>
        <UserPlus className="w-4 h-4" />
        {possible.length > 0 ? 'None of these: create a new file' : 'Create patient file'}
      </button>
    </div>
  );
};
