import type { PatientRecord, UserRecord, CareTeamMemberRecord } from '../types';

export interface SeedOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface CanonicalSeedData {
  organization: SeedOrganization;
  users: UserRecord[];
  patients: PatientRecord[];
  careTeams: CareTeamMemberRecord[];
}

export const CANONICAL_SEED: CanonicalSeedData = {
  organization: {
    id: 'clinic_a',
    name: 'CarePlus Clinic',
    slug: 'clinic-a',
  },
  users: [
    {
      uid: 'admin_1',
      role: 'admin',
      displayName: 'System Admin',
      email: 'admin@careplus.test',
      phone: '+15550000001',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'dr_smith',
      role: 'clinician',
      displayName: 'Dr. Sarah Smith',
      email: 'smith@careplus.test',
      phone: '+15550000002',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'dr_jones',
      role: 'clinician',
      displayName: 'Dr. Michael Jones',
      email: 'jones@careplus.test',
      phone: '+15550000003',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'dr_unassigned',
      role: 'clinician',
      displayName: 'Dr. Emily Clark',
      email: 'clark@careplus.test',
      phone: '+15550000004',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      uid: 'nurse_amy',
      role: 'nurse',
      displayName: 'Nurse Amy Adams',
      email: 'amy@careplus.test',
      phone: '+15550000005',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  patients: [
    {
      id: 'patient_A',
      mrn: 'MRN-001',
      firstName: 'Alice',
      lastName: 'Smith',
      dob: '1985-05-12',
      gender: 'female',
      email: 'alice@example.com',
      phone: '+15550100001',
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'patient_B',
      mrn: 'MRN-002',
      firstName: 'Bob',
      lastName: 'Johnson',
      dob: '1979-11-23',
      gender: 'male',
      email: 'bob@example.com',
      phone: '+15550100002',
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'patient_C',
      mrn: 'MRN-003',
      firstName: 'Carol',
      lastName: 'White',
      dob: '1992-08-30',
      gender: 'female',
      email: 'carol@example.com',
      phone: '+15550100003',
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'patient_D',
      mrn: 'MRN-004',
      firstName: 'David',
      lastName: 'Brown',
      dob: '1968-03-14',
      gender: 'male',
      email: 'david@example.com',
      phone: '+15550100004',
      createdAt: '2026-01-02T00:00:00Z',
    },
  ],
  careTeams: [
    // Patient A: Dr. Smith (clinician), Nurse Amy (nurse)
    {
      id: 'ct_A_smith',
      patientId: 'patient_A',
      userId: 'dr_smith',
      role: 'clinician',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
    {
      id: 'ct_A_amy',
      patientId: 'patient_A',
      userId: 'nurse_amy',
      role: 'nurse',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
    // Patient B: Dr. Smith (clinician), Nurse Amy (nurse)
    {
      id: 'ct_B_smith',
      patientId: 'patient_B',
      userId: 'dr_smith',
      role: 'clinician',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
    {
      id: 'ct_B_amy',
      patientId: 'patient_B',
      userId: 'nurse_amy',
      role: 'nurse',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
    // Patient C: Dr. Smith (clinician), Dr. Jones (clinician), Nurse Amy (removed)
    {
      id: 'ct_C_smith',
      patientId: 'patient_C',
      userId: 'dr_smith',
      role: 'clinician',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
    {
      id: 'ct_C_jones',
      patientId: 'patient_C',
      userId: 'dr_jones',
      role: 'clinician',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
    {
      id: 'ct_C_amy',
      patientId: 'patient_C',
      userId: 'nurse_amy',
      role: 'nurse',
      status: 'removed',
      joinedAt: '2026-01-02T01:00:00Z',
      removedAt: '2026-01-15T00:00:00Z',
    },
    // Patient D: Dr. Jones (clinician)
    {
      id: 'ct_D_jones',
      patientId: 'patient_D',
      userId: 'dr_jones',
      role: 'clinician',
      status: 'active',
      joinedAt: '2026-01-02T01:00:00Z',
    },
  ],
};
