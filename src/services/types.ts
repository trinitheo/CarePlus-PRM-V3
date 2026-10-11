import type { PatientRecord, UserRecord, CareTeamMemberRecord } from '../types';

export interface StaffPatientRow {
  patient: PatientRecord;
  memberRole: 'clinician' | 'nurse';
}

export type PatientLoadResult =
  | { status: 'fulfilled'; value: StaffPatientRow }
  | { status: 'rejected'; reason: string; patientId: string; memberRole: 'clinician' | 'nurse' };

export interface DataService {
  getStaffPatients(orgId: string, staffUid: string): Promise<PatientLoadResult[]>;
  getPatient(orgId: string, patientId: string): Promise<PatientRecord | null>;
  getUser(orgId: string, userId: string): Promise<UserRecord | null>;
}
