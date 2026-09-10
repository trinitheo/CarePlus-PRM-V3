import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs
} from 'firebase/firestore';

const PROJECT_ID = 'careplus-v2-test';

describe('CarePlus v2 Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();

      // Seed setup data via admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // 1. Users
        await setDoc(doc(db, 'users/admin_1'), { role: 'admin', displayName: 'Admin User', phone: '111-111-1111' });
        await setDoc(doc(db, 'users/dr_smith'), { role: 'clinician', displayName: 'Dr. Smith', phone: '222-222-2222' });
        await setDoc(doc(db, 'users/dr_jones'), { role: 'clinician', displayName: 'Dr. Jones', phone: '333-333-3333' });
        await setDoc(doc(db, 'users/nurse_amy'), { role: 'nurse', displayName: 'Nurse Amy', phone: '444-444-4444' });
        await setDoc(doc(db, 'users/nurse_bob'), { role: 'nurse', displayName: 'Nurse Bob', phone: '555-555-5555' });
        await setDoc(doc(db, 'users/dr_removed'), { role: 'clinician', displayName: 'Dr. Removed', phone: '666-666-6666' });
        await setDoc(doc(db, 'users/patient_user_a'), { role: 'patient', displayName: 'Alice Patient', phone: '777-777-7777' });
        await setDoc(doc(db, 'users/patient_user_b'), { role: 'patient', displayName: 'Bob Patient', phone: '888-888-8888' });
        await setDoc(doc(db, 'users/unassigned_staff'), { role: 'clinician', displayName: 'Dr. Unassigned', phone: '999-999-9999' });

        // 2. Patients
        await setDoc(doc(db, 'patients/patient_A'), {
          id: 'patient_A',
          mrn: 'MRN-001',
          firstName: 'Alice',
          lastName: 'Smith',
          dob: '1985-05-15',
          gender: 'female',
          email: 'alice@example.com',
          phone: '777-777-7777',
          linkedUserId: 'patient_user_a',
          createdAt: '2026-01-01T00:00:00Z'
        });

        await setDoc(doc(db, 'patients/patient_B'), {
          id: 'patient_B',
          mrn: 'MRN-002',
          firstName: 'Bob',
          lastName: 'Jones',
          dob: '1990-08-20',
          gender: 'male',
          email: 'bob@example.com',
          phone: '888-888-8888',
          linkedUserId: 'patient_user_b',
          createdAt: '2026-01-02T00:00:00Z'
        });

        // 3. Care Teams (Deterministic IDs: patientId_userId)
        // Patient A care team: dr_smith (active), nurse_amy (active), dr_removed (removed)
        await setDoc(doc(db, 'care_teams/patient_A_dr_smith'), {
          patientId: 'patient_A',
          userId: 'dr_smith',
          role: 'clinician',
          status: 'active'
        });
        await setDoc(doc(db, 'care_teams/patient_A_nurse_amy'), {
          patientId: 'patient_A',
          userId: 'nurse_amy',
          role: 'nurse',
          status: 'active'
        });
        await setDoc(doc(db, 'care_teams/patient_A_dr_removed'), {
          patientId: 'patient_A',
          userId: 'dr_removed',
          role: 'clinician',
          status: 'removed',
          removedAt: '2026-02-01T00:00:00Z'
        });

        // Patient B care team: dr_jones (active), nurse_bob (active)
        await setDoc(doc(db, 'care_teams/patient_B_dr_jones'), {
          patientId: 'patient_B',
          userId: 'dr_jones',
          role: 'clinician',
          status: 'active'
        });
        await setDoc(doc(db, 'care_teams/patient_B_nurse_bob'), {
          patientId: 'patient_B',
          userId: 'nurse_bob',
          role: 'nurse',
          status: 'active'
        });

        // 4. Existing Clinical Records on Patient A
        await setDoc(doc(db, 'patients/patient_A/notes/note_smith'), {
          authorId: 'dr_smith',
          content: 'Initial assessment',
          createdAt: '2026-01-10T00:00:00Z'
        });
        await setDoc(doc(db, 'patients/patient_A/notes/note_removed_clinician'), {
          authorId: 'dr_removed',
          content: 'Old note from removed clinician',
          createdAt: '2026-01-05T00:00:00Z'
        });
        await setDoc(doc(db, 'patients/patient_A/vitals/vital_1'), {
          authorId: 'dr_smith',
          source: 'clinic',
          heartRate: 72,
          createdAt: '2026-01-10T00:00:00Z'
        });
        await setDoc(doc(db, 'patients/patient_A/prescriptions/rx_1'), {
          authorId: 'dr_smith',
          medication: 'Amoxicillin 500mg',
          dosage: 'TID x 10d',
          createdAt: '2026-01-10T00:00:00Z'
        });
      });
    }
  });

  // ==========================================
  // ALLOWED ACTIONS TEST MATRIX
  // ==========================================
  describe('ALLOWED cases', () => {
    it('ALLOW: admin can get and list patients', async () => {
      const db = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A')));
      await assertSucceeds(getDocs(collection(db, 'patients')));
    });

    it('ALLOW: admin can create a patient with required identity fields only', async () => {
      const db = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(setDoc(doc(db, 'patients/patient_new'), {
        id: 'patient_new',
        mrn: 'MRN-999',
        firstName: 'New',
        lastName: 'Patient',
        dob: '2000-01-01',
        gender: 'other',
        email: 'new@example.com',
        phone: '123-456-7890',
        linkedUserId: 'user_new',
        createdAt: '2026-03-01T00:00:00Z'
      }));
    });

    it('ALLOW: active care team clinician can read their patient document', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A')));
    });

    it('ALLOW: active care team nurse can read their patient document', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A')));
    });

    it('ALLOW: linked patient can read their own patient document', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A')));
    });

    it('ALLOW: linked patient can update only phone and email on patient document', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(updateDoc(doc(db, 'patients/patient_A'), {
        phone: '999-999-9999',
        email: 'alice_new@example.com'
      }));
    });

    it('ALLOW: active care team member can update patient document', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'patients/patient_A'), {
        phone: '111-222-3333'
      }));
    });

    it('ALLOW: admin, active team members, and linked patient can read care_teams', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();
      const patientDb = testEnv.authenticatedContext('patient_user_a').firestore();

      await assertSucceeds(getDoc(doc(adminDb, 'care_teams/patient_A_dr_smith')));
      await assertSucceeds(getDoc(doc(clinicianDb, 'care_teams/patient_A_nurse_amy')));
      await assertSucceeds(getDoc(doc(patientDb, 'care_teams/patient_A_dr_smith')));
    });

    it('ALLOW: active team member can read clinical notes, vitals, prescriptions', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A/notes/note_smith')));
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A/vitals/vital_1')));
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A/prescriptions/rx_1')));
    });

    it('ALLOW: linked patient can read their own chart (notes, vitals, prescriptions)', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A/notes/note_smith')));
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A/vitals/vital_1')));
      await assertSucceeds(getDoc(doc(db, 'patients/patient_A/prescriptions/rx_1')));
    });

    it('ALLOW: active team clinician can create notes with self as author', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'patients/patient_A/notes/note_2'), {
        authorId: 'dr_smith',
        content: 'Follow-up exam note',
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('ALLOW: note author still on active team can update their note', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'patients/patient_A/notes/note_smith'), {
        content: 'Initial assessment - amended with vitals check'
      }));
    });

    it('ALLOW: patient can add vitals with source=patient and self as author', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(setDoc(doc(db, 'patients/patient_A/vitals/vital_patient_1'), {
        authorId: 'patient_user_a',
        source: 'patient',
        systolic: 120,
        diastolic: 80,
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('ALLOW: staff on care team can add vitals with source=clinic', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertSucceeds(setDoc(doc(db, 'patients/patient_A/vitals/vital_clinic_1'), {
        authorId: 'nurse_amy',
        source: 'clinic',
        heartRate: 75,
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('ALLOW: active clinician on team can update prescription keeping authorId unchanged', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'patients/patient_A/prescriptions/rx_1'), {
        dosage: 'QID x 7d'
      }));
    });

    it('ALLOW: user can self-update only displayName and phone on users/{uid}', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'users/dr_smith'), {
        displayName: 'Dr. Jane Smith, MD',
        phone: '222-333-4444'
      }));
    });
  });

  // ==========================================
  // SPECIFIC DENIALS (Mandated by non-negotiables)
  // ==========================================
  describe('DENIED cases', () => {
    it('DENY: removed team member reading or editing the chart', async () => {
      const db = testEnv.authenticatedContext('dr_removed').firestore();
      // Read note -> DENIED
      await assertFails(getDoc(doc(db, 'patients/patient_A/notes/note_smith')));
      // Read vitals -> DENIED
      await assertFails(getDoc(doc(db, 'patients/patient_A/vitals/vital_1')));
      // Read prescriptions -> DENIED
      await assertFails(getDoc(doc(db, 'patients/patient_A/prescriptions/rx_1')));
      // Edit note -> DENIED
      await assertFails(updateDoc(doc(db, 'patients/patient_A/notes/note_smith'), {
        content: 'Malicious edit by removed member'
      }));
    });

    it('DENY: nurse on patient A team reading patient B chart', async () => {
      // nurse_amy is on patient A, NOT on patient B
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(getDoc(doc(db, 'patients/patient_B/notes/note_smith')));
      await assertFails(getDoc(doc(db, 'patients/patient_B')));
    });

    it('DENY: unauthenticated access to anything', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'patients/patient_A')));
      await assertFails(getDocs(collection(db, 'patients')));
      await assertFails(getDoc(doc(db, 'users/admin_1')));
      await assertFails(getDoc(doc(db, 'care_teams/patient_A_dr_smith')));
      await assertFails(getDoc(doc(db, 'patients/patient_A/notes/note_smith')));
    });

    it('DENY: staff member not on the team reading the patient document', async () => {
      // unassigned_staff is a clinician, but not on patient A team
      const db = testEnv.authenticatedContext('unassigned_staff').firestore();
      await assertFails(getDoc(doc(db, 'patients/patient_A')));
    });

    it('DENY: linked patient changing linkedUserId or mrn', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      // Attempting to change linkedUserId -> DENIED
      await assertFails(updateDoc(doc(db, 'patients/patient_A'), {
        linkedUserId: 'hacker_user_id'
      }));
      // Attempting to change MRN -> DENIED
      await assertFails(updateDoc(doc(db, 'patients/patient_A'), {
        mrn: 'MRN-HACKED'
      }));
    });

    it('DENY: removed clinician editing their own old note', async () => {
      // dr_removed authored note_removed_clinician, but is now status: removed
      const db = testEnv.authenticatedContext('dr_removed').firestore();
      await assertFails(updateDoc(doc(db, 'patients/patient_A/notes/note_removed_clinician'), {
        content: 'Amended by removed clinician'
      }));
    });

    it('DENY: admin reading clinical records in patient chart', async () => {
      // Non-negotiable: Admin manages accounts and roles. Admin does not get chart access.
      const db = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(getDoc(doc(db, 'patients/patient_A/notes/note_smith')));
      await assertFails(getDoc(doc(db, 'patients/patient_A/vitals/vital_1')));
      await assertFails(getDoc(doc(db, 'patients/patient_A/prescriptions/rx_1')));
    });

    it('DENY: patient adding vitals with source=clinic', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(setDoc(doc(db, 'patients/patient_A/vitals/vital_bad'), {
        authorId: 'patient_user_a',
        source: 'clinic',
        heartRate: 80
      }));
    });

    it('DENY: staff adding vitals with source=patient', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'patients/patient_A/vitals/vital_bad2'), {
        authorId: 'nurse_amy',
        source: 'patient',
        heartRate: 80
      }));
    });

    it('DENY: nurse creating prescription (clinicians only)', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'patients/patient_A/prescriptions/rx_nurse'), {
        authorId: 'nurse_amy',
        medication: 'Amoxicillin',
        dosage: 'TID'
      }));
    });

    it('DENY: changing authorId on prescription update', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'patients/patient_A/prescriptions/rx_1'), {
        authorId: 'dr_jones'
      }));
    });

    it('DENY: user changing role or unauthorized fields on users/{uid}', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      // Attempting to elevate to admin
      await assertFails(updateDoc(doc(db, 'users/nurse_amy'), {
        role: 'admin'
      }));
    });

    it('DENY: deleting records in care_teams or clinical records', async () => {
      const dbAdmin = testEnv.authenticatedContext('admin_1').firestore();
      const dbClinician = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(deleteDoc(doc(dbAdmin, 'care_teams/patient_A_dr_smith')));
      await assertFails(deleteDoc(doc(dbClinician, 'patients/patient_A/notes/note_smith')));
      await assertFails(deleteDoc(doc(dbAdmin, 'patients/patient_A')));
    });
  });
});
