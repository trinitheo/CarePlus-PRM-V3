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
  linkedUserId?: string;
  createdAt: string;
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
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export type VitalSource = 'clinic' | 'patient';

export interface VitalRecord {
  id?: string;
  patientId?: string;
  authorId: string;
  source: VitalSource;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  spO2?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PrescriptionRecord {
  id?: string;
  patientId?: string;
  authorId: string;
  medication: string;
  dosage: string;
  instructions?: string;
  status?: 'active' | 'discontinued' | 'completed';
  createdAt: string;
  updatedAt?: string;
}
