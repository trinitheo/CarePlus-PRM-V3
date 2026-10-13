import type {
  PatientRecord,
  UserRecord,
  PatientOrgCareTeam,
  CareTeamMemberRecord,
  ClinicalNote,
  VitalRecord,
  PrescriptionRecord
} from '../types';

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
}
