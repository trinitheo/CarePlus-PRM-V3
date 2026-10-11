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

export interface CanonicalSeedData {
  organizations: SeedEntry<OrganizationSeedData>[];
  firstAdmins: SeedEntry<StaffUserSeedData>[];
  staffUsers: SeedEntry<StaffUserSeedData>[];
  patientUsers: SeedEntry<PatientUserSeedData>[];
  patients: { orgId: string; entry: SeedEntry<PatientSeedData> }[];
  careTeams: { orgId: string; entry: SeedEntry<CareTeamSeedData> }[];
  careTeamUpdates: CareTeamUpdateSeedData[];
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
};
