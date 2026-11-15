/**
 * Task 8: Patient identity matching.
 *
 * Pure logic shared by the Firestore and mock services. Decides whether a new
 * patient file may be created, or whether an existing file must be reused.
 *
 * Rules (one person, one MRN within an organisation):
 * - An identity document already on file → that file is the person. Reuse it.
 * - Same name and DOB as an existing file → the identity document decides.
 *   - The existing file has no ID → blocked until its ID is added.
 *   - The new person has not given the same type of ID → they must give it.
 *   - Different ID of the same type → different person, may create.
 * - Same DOB and a partly matching name → shown as a possible match.
 */
import type { IdType, PatientRecord, Gender } from '../types';

export const ID_TYPE_LABELS: Record<IdType, string> = {
  national_id: 'National ID',
  drivers_permit: "Driver's permit",
};

export interface PatientIdentityInput {
  firstName: string;
  lastName: string;
  dob: string;
  idType?: IdType;
  idNumber?: string;
}

export interface NewPatientInput extends PatientIdentityInput {
  gender: Gender;
  email: string;
  phone: string;
}

export type MatchKind = 'exact' | 'possible';

export interface ClassifiedMatch {
  patient: PatientRecord;
  kind: MatchKind;
}

export type PatientFileDecision =
  /** The identity document entered is already on this file. */
  | { kind: 'reuse-by-id'; patient: PatientRecord }
  /** Same name and DOB, and these files have no ID to compare against. */
  | { kind: 'blocked-existing-needs-id'; patients: PatientRecord[] }
  /** Same name and DOB; the new person must give the same type of ID as each file. */
  | { kind: 'needs-new-id'; patients: PatientRecord[] }
  /** Safe to create. Possible matches are shown for the admin to rule out. */
  | { kind: 'can-create'; possible: PatientRecord[]; sameNameDifferentId: PatientRecord[] };

export class PatientFileError extends Error {
  constructor(message: string, public readonly decision?: PatientFileDecision) {
    super(message);
    this.name = 'PatientFileError';
  }
}

/** Lowercase, strip accents, drop apostrophes, treat hyphens/dots as spaces. */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/** Capitals and digits only: "ab 123-456" → "AB123456". */
export function normaliseIdNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidIdNumber(value: string): boolean {
  return /^[A-Z0-9]{3,30}$/.test(value);
}

export function idRegistryKey(idType: IdType, idNumber: string): string {
  return `${idType}_${idNumber}`;
}

export function formatMrn(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid MRN sequence: ${sequence}`);
  }
  return `MRN-${String(sequence).padStart(6, '0')}`;
}

function isValidDob(dob: string, today: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const parsed = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== dob) return false; // rejects 2026-02-30
  return parsed.getTime() <= today.getTime() && parsed.getUTCFullYear() >= 1900;
}

/** Returns a list of problems; empty means valid. ID fields are normalised first. */
export function validateIdentityInput(input: PatientIdentityInput, today: Date = new Date()): string[] {
  const errors: string[] = [];
  if (!normaliseName(input.firstName)) errors.push('First name is required.');
  if (!normaliseName(input.lastName)) errors.push('Last name is required.');
  if (!isValidDob(input.dob, today)) errors.push('Date of birth must be a real date, not in the future.');
  const hasType = Boolean(input.idType);
  const number = input.idNumber ? normaliseIdNumber(input.idNumber) : '';
  if (hasType && !number) errors.push('Enter the ID number, or clear the ID type.');
  if (!hasType && number) errors.push('Choose the ID type for this number.');
  if (hasType && number && !isValidIdNumber(number)) errors.push('ID number must be 3–30 letters or digits.');
  return errors;
}

/** Trims names and normalises the ID number; drops empty ID fields. */
export function cleanIdentityInput<T extends PatientIdentityInput>(input: T): T {
  const number = input.idNumber ? normaliseIdNumber(input.idNumber) : '';
  const cleaned = {
    ...input,
    firstName: input.firstName.trim().replace(/\s+/g, ' '),
    lastName: input.lastName.trim().replace(/\s+/g, ' '),
  };
  if (input.idType && number) {
    cleaned.idType = input.idType;
    cleaned.idNumber = number;
  } else {
    delete cleaned.idType;
    delete cleaned.idNumber;
  }
  return cleaned;
}

/** Classifies candidates that share the input's DOB. Non-matches are dropped. */
export function classifyNameMatches(
  candidates: PatientRecord[],
  input: PatientIdentityInput
): ClassifiedMatch[] {
  const first = normaliseName(input.firstName);
  const last = normaliseName(input.lastName);
  const result: ClassifiedMatch[] = [];
  for (const patient of candidates) {
    if (patient.dob !== input.dob) continue;
    const pFirst = normaliseName(patient.firstName);
    const pLast = normaliseName(patient.lastName);
    if (pFirst === first && pLast === last) {
      result.push({ patient, kind: 'exact' });
    } else if (pFirst === first || pLast === last || (pFirst === last && pLast === first)) {
      result.push({ patient, kind: 'possible' });
    }
  }
  return result;
}

export function decidePatientFile(
  input: PatientIdentityInput,
  idHolder: PatientRecord | null,
  matches: ClassifiedMatch[]
): PatientFileDecision {
  if (idHolder) return { kind: 'reuse-by-id', patient: idHolder };

  const exact = matches.filter((m) => m.kind === 'exact').map((m) => m.patient);
  const possible = matches.filter((m) => m.kind === 'possible').map((m) => m.patient);

  const withoutId = exact.filter((p) => !p.idNumber);
  if (withoutId.length > 0) return { kind: 'blocked-existing-needs-id', patients: withoutId };

  const notCompared = exact.filter((p) => !input.idNumber || p.idType !== input.idType);
  if (notCompared.length > 0) return { kind: 'needs-new-id', patients: notCompared };

  return { kind: 'can-create', possible, sameNameDifferentId: exact };
}
