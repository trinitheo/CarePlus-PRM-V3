export interface SeedEntry<T> {
  id: string;
  data: T;
}

export interface OrganizationSeedData {
  name: string;
  firstAdminUid: string;
  createdAt: string;
}

export interface StaffUserSeedData {
  displayName: string;
  email: string;
  phone: string;
  role: 'clinician' | 'nurse' | 'admin';
  orgId: string;
}

export interface PatientUserSeedData {
  displayName: string;
  email: string;
  phone: string;
  role: 'patient';
}

export interface PatientSeedData {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | 'undisclosed';
  email: string;
  phone: string;
  orgName: string;
  linkedUserId?: string;
  createdAt: string;
}

export interface CareTeamSeedData {
  patientId: string;
  userId: string;
  displayName: string;
  role: 'clinician' | 'nurse';
  status: 'active';
  createdAt: string;
}

export interface CareTeamUpdateSeedData {
  docId: string;
  orgId: string;
  data: {
    status: 'removed';
    removedAt: string;
  };
}

export interface VitalSeedItem {
  id: string;
  orgId: string;
  patientId: string;
  authorId: string;
  source: 'clinic' | 'patient';
  offsetMs: number;
  heartRate?: number;
  respRate?: number;
  systolic?: number;
  diastolic?: number;
  tempC?: number;
  spo2?: number;
  consciousness?: 'A' | 'C' | 'V' | 'P' | 'U';
  onOxygen?: boolean;
  glucoseMgDl?: number;
  glucoseContext?: 'fasting' | 'random' | 'postprandial';
  correctsId?: string;
}

export interface ClinicalNoteSeedItem {
  id: string;
  orgId: string;
  patientId: string;
  authorId: string;
  body: string;
  status: 'draft' | 'final';
  offsetMs: number;
  correctsId?: string;
}

export interface ClinicalPrescriptionSeedItem {
  id: string;
  orgId: string;
  patientId: string;
  authorId: string;
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  status: 'active' | 'discontinued';
  offsetMs: number;
  discontinuedBy?: string;
  discontinueOffsetMs?: number;
  correctsId?: string;
}

export interface CanonicalSeedData {
  organizations: SeedEntry<OrganizationSeedData>[];
  firstAdmins: SeedEntry<StaffUserSeedData>[];
  staffUsers: SeedEntry<StaffUserSeedData>[];
  patientUsers: SeedEntry<PatientUserSeedData>[];
  patients: { orgId: string; entry: SeedEntry<PatientSeedData> }[];
  careTeams: { orgId: string; entry: SeedEntry<CareTeamSeedData> }[];
  careTeamUpdates: CareTeamUpdateSeedData[];
  vitals: VitalSeedItem[];
  notes: ClinicalNoteSeedItem[];
  prescriptions: ClinicalPrescriptionSeedItem[];
}

export const CANONICAL_SEED: CanonicalSeedData = {
  organizations: [
    {
      id: 'clinic_a',
      data: {
        name: 'CarePlus Clinic',
        firstAdminUid: 'admin_1',
        createdAt: '2026-01-01T00:00:00Z',
      },
    },
    {
      id: 'clinic_b',
      data: {
        name: 'CarePlus West',
        firstAdminUid: 'admin_b',
        createdAt: '2026-01-01T00:00:00Z',
      },
    },
  ],
  firstAdmins: [
    {
      id: 'admin_1',
      data: {
        displayName: 'System Admin',
        email: 'admin@careplus.test',
        phone: '+15550000001',
        role: 'admin',
        orgId: 'clinic_a',
      },
    },
    {
      id: 'admin_b',
      data: {
        displayName: 'Admin West',
        email: 'admin_b@careplus.test',
        phone: '+15550000009',
        role: 'admin',
        orgId: 'clinic_b',
      },
    },
  ],
  staffUsers: [
    {
      id: 'dr_smith',
      data: {
        displayName: 'Dr. Sarah Smith',
        email: 'smith@careplus.test',
        phone: '+15550000002',
        role: 'clinician',
        orgId: 'clinic_a',
      },
    },
    {
      id: 'dr_jones',
      data: {
        displayName: 'Dr. Michael Jones',
        email: 'jones@careplus.test',
        phone: '+15550000003',
        role: 'clinician',
        orgId: 'clinic_a',
      },
    },
    {
      id: 'dr_unassigned',
      data: {
        displayName: 'Dr. Emily Clark',
        email: 'clark@careplus.test',
        phone: '+15550000004',
        role: 'clinician',
        orgId: 'clinic_a',
      },
    },
    {
      id: 'nurse_amy',
      data: {
        displayName: 'Nurse Amy Adams',
        email: 'amy@careplus.test',
        phone: '+15550000005',
        role: 'nurse',
        orgId: 'clinic_a',
      },
    },
    {
      id: 'dr_removed',
      data: {
        displayName: 'Dr. Removed Specialist',
        email: 'removed@careplus.test',
        phone: '+15550000006',
        role: 'clinician',
        orgId: 'clinic_a',
      },
    },
    {
      id: 'dr_clinic_b',
      data: {
        displayName: 'Dr. West Clinician',
        email: 'west_doc@careplus.test',
        phone: '+15550000007',
        role: 'clinician',
        orgId: 'clinic_b',
      },
    },
  ],
  patientUsers: [
    {
      id: 'alice',
      data: {
        displayName: 'Alice Smith',
        email: 'alice@careplus.test',
        phone: '+15550100001',
        role: 'patient',
      },
    },
    {
      id: 'bob',
      data: {
        displayName: 'Bob Johnson',
        email: 'bob@careplus.test',
        phone: '+15550100002',
        role: 'patient',
      },
    },
  ],
  patients: [
    // Clinic A patients
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_A',
        data: {
          id: 'patient_A',
          mrn: 'MRN-001',
          firstName: 'Alice',
          lastName: 'Smith',
          dob: '1985-05-12',
          gender: 'female',
          email: 'alice@careplus.test',
          phone: '+15550100001',
          orgName: 'CarePlus Clinic',
          linkedUserId: 'alice',
          createdAt: '2026-01-02T00:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_B',
        data: {
          id: 'patient_B',
          mrn: 'MRN-002',
          firstName: 'Bob',
          lastName: 'Johnson',
          dob: '1979-11-23',
          gender: 'male',
          email: 'bob@careplus.test',
          phone: '+15550100002',
          orgName: 'CarePlus Clinic',
          linkedUserId: 'bob',
          createdAt: '2026-01-02T00:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_C',
        data: {
          id: 'patient_C',
          mrn: 'MRN-003',
          firstName: 'Carol',
          lastName: 'White',
          dob: '1992-08-30',
          gender: 'female',
          email: 'carol@careplus.test',
          phone: '+15550100003',
          orgName: 'CarePlus Clinic',
          createdAt: '2026-01-02T00:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_D',
        data: {
          id: 'patient_D',
          mrn: 'MRN-004',
          firstName: 'David',
          lastName: 'Brown',
          dob: '1968-03-14',
          gender: 'male',
          email: 'david@careplus.test',
          phone: '+15550100004',
          orgName: 'CarePlus Clinic',
          createdAt: '2026-01-02T00:00:00Z',
        },
      },
    },
    // Clinic B patient linked to Alice
    {
      orgId: 'clinic_b',
      entry: {
        id: 'patient_alice_b',
        data: {
          id: 'patient_alice_b',
          mrn: 'MRN-B-001',
          firstName: 'Alice',
          lastName: 'Smith',
          dob: '1985-05-12',
          gender: 'female',
          email: 'alice@careplus.test',
          phone: '+15550100001',
          orgName: 'CarePlus West',
          linkedUserId: 'alice',
          createdAt: '2026-01-02T00:00:00Z',
        },
      },
    },
  ],
  careTeams: [
    // Patient A (Clinic A): Dr. Smith, Nurse Amy, Dr. Removed (initially active)
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_A_dr_smith',
        data: {
          patientId: 'patient_A',
          userId: 'dr_smith',
          displayName: 'Dr. Sarah Smith',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_A_nurse_amy',
        data: {
          patientId: 'patient_A',
          userId: 'nurse_amy',
          displayName: 'Nurse Amy Adams',
          role: 'nurse',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_A_dr_removed',
        data: {
          patientId: 'patient_A',
          userId: 'dr_removed',
          displayName: 'Dr. Removed Specialist',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    // Patient B (Clinic A): Dr. Smith, Nurse Amy
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_B_dr_smith',
        data: {
          patientId: 'patient_B',
          userId: 'dr_smith',
          displayName: 'Dr. Sarah Smith',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_B_nurse_amy',
        data: {
          patientId: 'patient_B',
          userId: 'nurse_amy',
          displayName: 'Nurse Amy Adams',
          role: 'nurse',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    // Patient C (Clinic A): Dr. Smith, Dr. Jones
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_C_dr_smith',
        data: {
          patientId: 'patient_C',
          userId: 'dr_smith',
          displayName: 'Dr. Sarah Smith',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_C_dr_jones',
        data: {
          patientId: 'patient_C',
          userId: 'dr_jones',
          displayName: 'Dr. Michael Jones',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    // Patient D (Clinic A): Dr. Jones
    {
      orgId: 'clinic_a',
      entry: {
        id: 'patient_D_dr_jones',
        data: {
          patientId: 'patient_D',
          userId: 'dr_jones',
          displayName: 'Dr. Michael Jones',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
    // Patient Alice B (Clinic B): Dr. West Clinician
    {
      orgId: 'clinic_b',
      entry: {
        id: 'patient_alice_b_dr_clinic_b',
        data: {
          patientId: 'patient_alice_b',
          userId: 'dr_clinic_b',
          displayName: 'Dr. West Clinician',
          role: 'clinician',
          status: 'active',
          createdAt: '2026-01-02T01:00:00Z',
        },
      },
    },
  ],
  careTeamUpdates: [
    {
      docId: 'patient_A_dr_removed',
      orgId: 'clinic_a',
      data: {
        status: 'removed',
        removedAt: '2026-02-01T00:00:00Z',
      },
    },
  ],
  vitals: [
    {
      id: 'vital_alice_normal_3d',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      source: 'clinic',
      offsetMs: 3 * 24 * 3600 * 1000,
      heartRate: 72,
      respRate: 14,
      systolic: 118,
      diastolic: 76,
      tempC: 36.8,
      spo2: 98,
      consciousness: 'A',
      onOxygen: false,
    },
    {
      id: 'vital_alice_abnormal_2h',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'nurse_amy',
      source: 'clinic',
      offsetMs: 2 * 3600 * 1000,
      heartRate: 112,
      respRate: 22,
      spo2: 94,
      systolic: 98,
      diastolic: 60,
      tempC: 38.4,
      consciousness: 'A',
      onOxygen: false,
    },
    {
      id: 'vital_alice_patient_bp',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'alice',
      source: 'patient',
      offsetMs: 24 * 3600 * 1000,
      systolic: 124,
      diastolic: 82,
    },
    {
      id: 'vital_alice_glucose',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'nurse_amy',
      source: 'clinic',
      offsetMs: 4 * 3600 * 1000,
      glucoseMgDl: 142,
      glucoseContext: 'random',
    },
    {
      id: 'vital_alice_smith_orig',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      source: 'clinic',
      offsetMs: 5 * 3600 * 1000,
      heartRate: 140,
    },
    {
      id: 'vital_alice_smith_corr',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      source: 'clinic',
      offsetMs: 4.5 * 3600 * 1000,
      heartRate: 78,
      correctsId: 'vital_alice_smith_orig',
    },
  ],
  notes: [
    {
      id: 'note_alice_final_1',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      body: 'Routine checkup. Patient reports mild fatigue. Vital signs reviewed and stable.',
      status: 'final',
      offsetMs: 2 * 24 * 3600 * 1000,
    },
    {
      id: 'note_alice_final_2',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      body: 'Follow-up consultation. Labs reviewed with patient. Continue current medication regimen.',
      status: 'final',
      offsetMs: 1 * 24 * 3600 * 1000,
    },
    {
      id: 'note_alice_draft_smith',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      body: 'Dr Smith draft note on treatment plan and pending lab review.',
      status: 'draft',
      offsetMs: 3 * 3600 * 1000,
    },
    {
      id: 'note_alice_draft_amy',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'nurse_amy',
      body: 'Nurse Amy triage draft assessment. Patient arrived on time.',
      status: 'draft',
      offsetMs: 2 * 3600 * 1000,
    },
    {
      id: 'note_alice_corr_orig',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      body: 'Initial note with medication dosage typo recorded during afternoon round.',
      status: 'final',
      offsetMs: 3 * 24 * 3600 * 1000,
    },
    {
      id: 'note_alice_corr_final',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      body: 'Corrected note: dosage was 250mg, not 500mg. Corrected after pharmacy review.',
      status: 'final',
      offsetMs: 2.5 * 24 * 3600 * 1000,
      correctsId: 'note_alice_corr_orig',
    },
  ],
  prescriptions: [
    {
      id: 'rx_alice_active_1',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      medication: 'Lisinopril 10mg',
      dose: '10mg',
      route: 'oral',
      frequency: 'daily',
      status: 'active',
      offsetMs: 7 * 24 * 3600 * 1000,
    },
    {
      id: 'rx_alice_active_2',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      medication: 'Metformin 500mg',
      dose: '500mg',
      route: 'oral',
      frequency: 'BID',
      status: 'active',
      offsetMs: 5 * 24 * 3600 * 1000,
    },
    {
      id: 'rx_alice_discontinued',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      medication: 'Amlodipine 5mg',
      dose: '5mg',
      route: 'oral',
      frequency: 'daily',
      status: 'discontinued',
      discontinuedBy: 'dr_smith',
      offsetMs: 14 * 24 * 3600 * 1000,
    },
    {
      id: 'rx_alice_corr_orig',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      medication: 'Amoxicillin 500mg',
      dose: '500mg',
      route: 'oral',
      frequency: 'TID',
      status: 'discontinued',
      discontinuedBy: 'dr_smith',
      offsetMs: 4 * 24 * 3600 * 1000,
    },
    {
      id: 'rx_alice_corr_new',
      orgId: 'clinic_a',
      patientId: 'patient_A',
      authorId: 'dr_smith',
      medication: 'Amoxicillin 250mg',
      dose: '250mg',
      route: 'oral',
      frequency: 'TID',
      status: 'active',
      correctsId: 'rx_alice_corr_orig',
      offsetMs: 2 * 24 * 3600 * 1000,
    },
  ],
};
