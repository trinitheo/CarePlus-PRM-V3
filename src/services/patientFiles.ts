/**
 * Task 8: Admin patient files against Firestore.
 *
 * Exported as plain functions (like getStaffPatients) so the emulator tests
 * run the real code through the real security rules.
 */
export { PatientFileError } from './patientMatching';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { IdType, PatientRecord } from '../types';
import {
  classifyNameMatches,
  cleanIdentityInput,
  decidePatientFile,
  formatMrn,
  idRegistryKey,
  isValidIdNumber,
  normaliseIdNumber,
  PatientFileError,
  validateIdentityInput,
  type NewPatientInput,
  type PatientFileDecision,
  type PatientIdentityInput,
} from './patientMatching';

function orgPath(orgId: string, ...rest: string[]): [string, ...string[]] {
  return ['organizations', orgId, ...rest];
}

async function findIdHolder(
  db: Firestore,
  orgId: string,
  idType: IdType,
  idNumber: string
): Promise<PatientRecord | null> {
  const regSnap = await getDoc(doc(db, ...orgPath(orgId, 'id_registry', idRegistryKey(idType, idNumber))));
  if (!regSnap.exists()) return null;
  const patientId = regSnap.data().patientId as string;
  const pSnap = await getDoc(doc(db, ...orgPath(orgId, 'patients', patientId)));
  return pSnap.exists() ? ({ ...(pSnap.data() as PatientRecord), id: pSnap.id }) : null;
}

export async function searchPatientFiles(
  db: Firestore,
  orgId: string,
  rawInput: PatientIdentityInput
): Promise<PatientFileDecision> {
  const errors = validateIdentityInput(rawInput);
  if (errors.length > 0) throw new PatientFileError(errors.join(' '));
  const input = cleanIdentityInput(rawInput);

  const idHolder =
    input.idType && input.idNumber ? await findIdHolder(db, orgId, input.idType, input.idNumber) : null;

  const sameDob = await getDocs(
    query(collection(db, ...orgPath(orgId, 'patients')), where('dob', '==', input.dob))
  );
  const candidates = sameDob.docs.map((d) => ({ ...(d.data() as PatientRecord), id: d.id }));
  return decidePatientFile(input, idHolder, classifyNameMatches(candidates, input));
}

export async function createPatientFile(
  db: Firestore,
  orgId: string,
  rawInput: NewPatientInput,
  now: Date = new Date()
): Promise<PatientRecord> {
  const input = cleanIdentityInput(rawInput);
  const decision = await searchPatientFiles(db, orgId, input);
  if (decision.kind !== 'can-create') {
    throw new PatientFileError('A patient file cannot be created until the match is resolved.', decision);
  }

  const orgSnap = await getDoc(doc(db, ...orgPath(orgId)));
  if (!orgSnap.exists()) throw new PatientFileError(`Organisation ${orgId} not found.`);
  const orgName = orgSnap.data().name as string;

  const patientRef = doc(collection(db, ...orgPath(orgId, 'patients')));
  const counterRef = doc(db, ...orgPath(orgId, 'counters', 'mrn'));
  const idRef =
    input.idType && input.idNumber
      ? doc(db, ...orgPath(orgId, 'id_registry', idRegistryKey(input.idType, input.idNumber)))
      : null;
  const createdAt = now.toISOString();

  return runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = counterSnap.exists() ? (counterSnap.data().last as number) + 1 : 1;
    const mrn = formatMrn(next);
    const mrnRef = doc(db, ...orgPath(orgId, 'mrn_registry', mrn));

    const mrnSnap = await tx.get(mrnRef);
    if (mrnSnap.exists()) throw new PatientFileError(`${mrn} is already registered; the MRN counter is out of step.`);
    if (idRef && (await tx.get(idRef)).exists()) {
      throw new PatientFileError('This ID is already on another patient file. Search again.');
    }

    const record: PatientRecord = {
      id: patientRef.id,
      mrn,
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      gender: input.gender,
      email: input.email.trim(),
      phone: input.phone.trim(),
      orgName,
      createdAt,
      ...(input.idType && input.idNumber ? { idType: input.idType, idNumber: input.idNumber } : {}),
    };

    tx.set(counterRef, { last: next });
    tx.set(patientRef, record);
    tx.set(mrnRef, { patientId: patientRef.id, createdAt });
    if (idRef) tx.set(idRef, { patientId: patientRef.id, createdAt });
    return record;
  });
}

export async function addPatientId(
  db: Firestore,
  orgId: string,
  patientId: string,
  idType: IdType,
  rawIdNumber: string,
  now: Date = new Date()
): Promise<PatientRecord> {
  const idNumber = normaliseIdNumber(rawIdNumber);
  if (!isValidIdNumber(idNumber)) throw new PatientFileError('ID number must be 3–30 letters or digits.');

  const patientRef = doc(db, ...orgPath(orgId, 'patients', patientId));
  const idRef = doc(db, ...orgPath(orgId, 'id_registry', idRegistryKey(idType, idNumber)));
  const createdAt = now.toISOString();

  return runTransaction(db, async (tx) => {
    const pSnap = await tx.get(patientRef);
    if (!pSnap.exists()) throw new PatientFileError('Patient file not found.');
    const patient = { ...(pSnap.data() as PatientRecord), id: pSnap.id };
    if (patient.idNumber) throw new PatientFileError('This file already has an ID, and it cannot be changed.');
    if ((await tx.get(idRef)).exists()) {
      throw new PatientFileError('This ID is already on another patient file.');
    }
    tx.update(patientRef, { idType, idNumber });
    tx.set(idRef, { patientId, createdAt });
    return { ...patient, idType, idNumber };
  });
}
