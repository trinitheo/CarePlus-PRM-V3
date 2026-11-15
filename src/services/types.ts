import type {
  PatientRecord,
  UserRecord,
  PatientOrgCareTeam,
  CareTeamMemberRecord,
  ClinicalNote,
  VitalRecord,
  PrescriptionRecord,
  IdType
} from '../types';
import type { PatientFileDecision, PatientIdentityInput, NewPatientInput } from './patientMatching';

export type { PatientFileDecision, PatientIdentityInput, NewPatientInput } from './patientMatching';

export interface StaffPatientRow {
  patient: PatientRecord;
  memberRole: 'clinician' | 'nurse';
}

export type PatientLoadResult =
  | { status: 'fulfilled'; value: StaffPatientRow }
  | { status: 'rejected'; reason: string; patientId: string; memberRole: 'clinician' | 'nurse' };

export interface PatientChartData {
  patient: PatientRecord;
  careTeam: CareTeamMemberRecord[];
  vitals: VitalRecord[];
  finalNotes: ClinicalNote[];
  myDrafts: ClinicalNote[];
  prescriptions: PrescriptionRecord[];
}

export interface DataService {
  getStaffPatients(orgId: string, staffUid: string): Promise<PatientLoadResult[]>;
  getPatient(orgId: string, patientId: string): Promise<PatientRecord | null>;
  getUser(userId: string): Promise<UserRecord | null>;
  getMyCareTeams(patientUid: string): Promise<PatientOrgCareTeam[]>;
  getPatientChart(orgId: string, patientId: string, uid: string): Promise<PatientChartData>;
  /** Task 8 (admin): search by ID, then name + DOB. Must run before any file is created. */
  searchPatientFiles(orgId: string, input: PatientIdentityInput): Promise<PatientFileDecision>;
  /** Task 8 (admin): re-runs the search and creates the file only if it allows creation. */
  createPatientFile(orgId: string, input: NewPatientInput): Promise<PatientRecord>;
  /** Task 8 (admin): adds an identity document to a file that has none. */
  addPatientId(orgId: string, patientId: string, idType: IdType, idNumber: string): Promise<PatientRecord>;
}
