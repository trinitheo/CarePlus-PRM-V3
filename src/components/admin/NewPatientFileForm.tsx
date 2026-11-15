import React from 'react';
import { Search } from 'lucide-react';
import type { Gender, IdType } from '../../types';
import { ID_TYPE_LABELS, type NewPatientInput } from '../../services/patientMatching';
import { tokens } from '../../theme/tokens';

export interface PatientFileFormValue {
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  email: string;
  phone: string;
  idType: IdType | '';
  idNumber: string;
}

export const EMPTY_PATIENT_FORM: PatientFileFormValue = {
  firstName: '',
  lastName: '',
  dob: '',
  gender: 'undisclosed',
  email: '',
  phone: '',
  idType: '',
  idNumber: '',
};

export function toNewPatientInput(value: PatientFileFormValue): NewPatientInput {
  const { idType, idNumber, ...rest } = value;
  return idType ? { ...rest, idType, idNumber } : { ...rest };
}

interface NewPatientFileFormProps {
  value: PatientFileFormValue;
  onChange: (value: PatientFileFormValue) => void;
  onSearch: () => void;
  busy: boolean;
  /** Highlights the ID fields when the search needs an ID from this person. */
  idRequested: boolean;
}

const inputClass = `w-full px-3 py-2.5 min-h-[44px] rounded-xl border ${tokens.borders.default} text-sm ${tokens.surfaces.canvas} ${tokens.text.body} focus:outline-none focus:ring-2 focus:ring-primary-base`;
const labelClass = `block text-xs font-semibold ${tokens.text.title} mb-1.5`;

export const NewPatientFileForm: React.FC<NewPatientFileFormProps> = ({ value, onChange, onSearch, busy, idRequested }) => {
  const set = <K extends keyof PatientFileFormValue>(key: K, v: PatientFileFormValue[K]) => onChange({ ...value, [key]: v });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-first" className={labelClass}>First name</label>
          <input id="pf-first" required value={value.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="pf-last" className={labelClass}>Last name</label>
          <input id="pf-last" required value={value.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="pf-dob" className={labelClass}>Date of birth</label>
          <input id="pf-dob" type="date" required value={value.dob} onChange={(e) => set('dob', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pf-gender" className={labelClass}>Sex</label>
          <select id="pf-gender" value={value.gender} onChange={(e) => set('gender', e.target.value as Gender)} className={inputClass}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="undisclosed">Not stated</option>
          </select>
        </div>
        <div>
          <label htmlFor="pf-phone" className={labelClass}>Phone</label>
          <input id="pf-phone" type="tel" value={value.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pf-email" className={labelClass}>Email</label>
          <input id="pf-email" type="email" value={value.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
        </div>
      </div>

      <fieldset
        className={`p-4 rounded-xl border space-y-3 ${idRequested ? tokens.primary.subtle : `${tokens.surfaces.muted} ${tokens.borders.subtle}`}`}
      >
        <legend className={`px-1 text-xs font-semibold ${tokens.text.title}`}>Identity document</legend>
        <p className={`text-xs ${tokens.text.muted}`}>
          {idRequested
            ? 'Needed: someone with the same name and date of birth is already on file.'
            : 'Optional, unless someone with the same name and date of birth is already on file.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-idtype" className={labelClass}>ID type</label>
            <select id="pf-idtype" value={value.idType} onChange={(e) => set('idType', e.target.value as IdType | '')} className={inputClass}>
              <option value="">None</option>
              {(Object.keys(ID_TYPE_LABELS) as IdType[]).map((t) => (
                <option key={t} value={t}>{ID_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-idnumber" className={labelClass}>ID number</label>
            <input
              id="pf-idnumber"
              value={value.idNumber}
              onChange={(e) => set('idNumber', e.target.value)}
              disabled={!value.idType}
              className={`${inputClass} font-mono disabled:opacity-50`}
              autoComplete="off"
            />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy}
        className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${tokens.primary.base}`}
      >
        <Search className="w-4 h-4" />
        {busy ? 'Checking…' : 'Check for existing files'}
      </button>
    </form>
  );
};
