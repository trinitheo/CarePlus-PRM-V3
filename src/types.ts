/**
 * CarePlus v2 - Core Types
 * Only 4 roles permitted in v1: clinician, nurse, patient, admin
 */

export type UserRole = 'clinician' | 'nurse' | 'patient' | 'admin';

export interface UserRecord {
  uid: string;
  role: UserRole;
  displayName: string;
  phone?: string;
  email?: string;
  orgId?: string;
  createdAt?: string;
}

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';

export interface PatientRecord {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  email: string;
  phone: string;
  orgName: string;
  linkedUserId?: string;
  createdAt: string;
}

export interface PatientCareTeamMember {
  userId: string;
  displayName: string;
  role: 'clinician' | 'nurse';
}

export interface PatientOrgCareTeam {
  orgId: string;
  orgName: string;
  patientId: string;
  members: PatientCareTeamMember[];
}

export type CareTeamStatus = 'active' | 'removed';

export interface CareTeamMemberRecord {
  id?: string;
  patientId: string;
  userId: string;
  role: 'clinician' | 'nurse';
  status: CareTeamStatus;
  joinedAt?: string;
  removedAt?: string;
}

export interface ClinicalNote {
  id?: string;
  patientId?: string;
  authorId: string;
  body: string;
  createdAt: string;
  correctsId?: string;
}

export type VitalSource = 'clinic' | 'patient';
export type GlucoseContext = 'fasting' | 'random' | 'postprandial';
export type ConsciousnessLevel = 'A' | 'C' | 'V' | 'P' | 'U';

export interface VitalRecord {
  id?: string;
  patientId?: string;
  authorId: string;
  source: VitalSource;
  recordedAt: string;
  createdAt: string;
  correctsId?: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  respRate?: number;
  tempC?: number;
  spo2?: number;
  weightKg?: number;
  glucoseMgDl?: number;
  glucoseContext?: GlucoseContext;
  consciousness?: ConsciousnessLevel;
  onOxygen?: boolean;
}

export interface PrescriptionRecord {
  id?: string;
  patientId?: string;
  authorId: string;
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  instructions?: string;
  status: 'active' | 'discontinued';
  createdAt: string;
  discontinuedAt?: string;
  discontinuedBy?: string;
  correctsId?: string;
}
