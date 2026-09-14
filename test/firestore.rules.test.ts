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
  collectionGroup,
  getDocs,
  query,
  where
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
        port: 8088
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

      // Seed setup data via admin context (rules disabled)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // 0. Organizations
        await setDoc(doc(db, 'organizations/clinic_a'), {
          name: 'Clinic A',
          firstAdminUid: 'admin_1',
          createdAt: '2026-01-01T00:00:00Z'
        });
        await setDoc(doc(db, 'organizations/clinic_b'), {
          name: 'Clinic B',
          firstAdminUid: 'admin_b',
          createdAt: '2026-01-01T00:00:00Z'
        });

        // 1. Users
        await setDoc(doc(db, 'users/admin_1'), { role: 'admin', orgId: 'clinic_a', displayName: 'Admin User', phone: '111-111-1111' });
        await setDoc(doc(db, 'users/dr_smith'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Smith', phone: '222-222-2222' });
        await setDoc(doc(db, 'users/dr_jones'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Jones', phone: '333-333-3333' });
        await setDoc(doc(db, 'users/nurse_amy'), { role: 'nurse', orgId: 'clinic_a', displayName: 'Nurse Amy', phone: '444-444-4444' });
        await setDoc(doc(db, 'users/nurse_bob'), { role: 'nurse', orgId: 'clinic_a', displayName: 'Nurse Bob', phone: '555-555-5555' });
        await setDoc(doc(db, 'users/dr_removed'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Removed', phone: '666-666-6666' });
        await setDoc(doc(db, 'users/unassigned_staff'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Unassigned', phone: '999-999-9999' });

        // Patient accounts: no orgId
        await setDoc(doc(db, 'users/patient_user_a'), { role: 'patient', displayName: 'Alice Patient', phone: '777-777-7777' });
        await setDoc(doc(db, 'users/patient_user_b'), { role: 'patient', displayName: 'Bob Patient', phone: '888-888-8888' });

        // Clinic B users
        await setDoc(doc(db, 'users/admin_b'), { role: 'admin', orgId: 'clinic_b', displayName: 'Admin B', phone: '111-222-0000' });
        await setDoc(doc(db, 'users/dr_clinic_b'), { role: 'clinician', orgId: 'clinic_b', displayName: 'Dr. Clinic B', phone: '222-333-0000' });
        await setDoc(doc(db, 'users/nurse_clinic_b'), { role: 'nurse', orgId: 'clinic_b', displayName: 'Nurse Clinic B', phone: '444-555-0000' });

        // Dual accounts for Dr. Chen test
        await setDoc(doc(db, 'users/dr_chen_work'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Chen', phone: '123-123-1234' });
        await setDoc(doc(db, 'users/dr_chen_personal'), { role: 'patient', displayName: 'Chen Personal', phone: '321-321-4321' });

        // Patient linked to both clinics
        await setDoc(doc(db, 'users/dual_patient_user'), { role: 'patient', displayName: 'Dual Patient', phone: '555-000-1111' });

        // 2. Patients in Clinic A
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), {
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

        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_B'), {
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

        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_dual_a'), {
          id: 'patient_dual_a',
          mrn: 'MRN-DUAL-A',
          firstName: 'Dual',
          lastName: 'Alice',
          dob: '1992-02-02',
          gender: 'female',
          email: 'dual@example.com',
          phone: '555-000-1111',
          linkedUserId: 'dual_patient_user',
          createdAt: '2026-01-05T00:00:00Z'
        });

        // Patients in Clinic B
        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_dual_b'), {
          id: 'patient_dual_b',
          mrn: 'MRN-DUAL-B',
          firstName: 'Dual',
          lastName: 'Bob',
          dob: '1992-02-02',
          gender: 'female',
          email: 'dual@example.com',
          phone: '555-000-1111',
          linkedUserId: 'dual_patient_user',
          createdAt: '2026-01-06T00:00:00Z'
        });

        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_chen_b'), {
          id: 'patient_chen_b',
          mrn: 'MRN-CHEN-B',
          firstName: 'Chen',
          lastName: 'Patient',
          dob: '1980-01-01',
          gender: 'other',
          email: 'chen@example.com',
          phone: '321-321-4321',
          linkedUserId: 'dr_chen_personal',
          createdAt: '2026-01-07T00:00:00Z'
        });

        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_b_other'), {
          id: 'patient_b_other',
          mrn: 'MRN-OTHER-B',
          firstName: 'Other',
          lastName: 'Person',
          dob: '1975-03-10',
          gender: 'male',
          email: 'other@example.com',
          phone: '999-888-7777',
          linkedUserId: 'user_other_b',
          createdAt: '2026-01-08T00:00:00Z'
        });

        // 3. Care Teams in Clinic A
        await setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_dr_smith'), {
          patientId: 'patient_A',
          userId: 'dr_smith',
          displayName: 'Dr. Smith',
          role: 'clinician',
          status: 'active'
        });
        await setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_nurse_amy'), {
          patientId: 'patient_A',
          userId: 'nurse_amy',
          displayName: 'Nurse Amy',
          role: 'nurse',
          status: 'active'
        });
        await setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_dr_removed'), {
          patientId: 'patient_A',
          userId: 'dr_removed',
          displayName: 'Dr. Removed',
          role: 'clinician',
          status: 'removed',
          removedAt: '2026-02-01T00:00:00Z'
        });

        await setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_B_dr_jones'), {
          patientId: 'patient_B',
          userId: 'dr_jones',
          displayName: 'Dr. Jones',
          role: 'clinician',
          status: 'active'
        });
        await setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_B_nurse_bob'), {
          patientId: 'patient_B',
          userId: 'nurse_bob',
          displayName: 'Nurse Bob',
          role: 'nurse',
          status: 'active'
        });

        // Care teams in Clinic B
        await setDoc(doc(db, 'organizations/clinic_b/care_teams/patient_chen_b_dr_clinic_b'), {
          patientId: 'patient_chen_b',
          userId: 'dr_clinic_b',
          displayName: 'Dr. Clinic B',
          role: 'clinician',
          status: 'active'
        });

        // 4. Clinical Records on Patient A in Clinic A
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith'), {
          authorId: 'dr_smith',
          content: 'Initial assessment',
          createdAt: '2026-01-10T00:00:00Z'
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_removed_clinician'), {
          authorId: 'dr_removed',
          content: 'Old note from removed clinician',
          createdAt: '2026-01-05T00:00:00Z'
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_1'), {
          authorId: 'dr_smith',
          source: 'clinic',
          heartRate: 72,
          createdAt: '2026-01-10T00:00:00Z'
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
          authorId: 'dr_smith',
          medication: 'Amoxicillin 500mg',
          dosage: 'TID x 10d',
          createdAt: '2026-01-10T00:00:00Z'
        });

        // Clinical records on Clinic B patients
        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_chen_b/notes/note_chen_1'), {
          authorId: 'dr_clinic_b',
          content: 'Note for Chen at Clinic B',
          createdAt: '2026-01-11T00:00:00Z'
        });
        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_b_other/notes/note_other_1'), {
          authorId: 'dr_clinic_b',
          content: 'Note for other patient at Clinic B',
          createdAt: '2026-01-12T00:00:00Z'
        });
      });
    }
  });

  // ==========================================
  // ALLOWED ACTIONS TEST MATRIX (Clinic A)
  // ==========================================
  describe('ALLOWED cases', () => {
    it('ALLOW: admin can get and list patients', async () => {
      const db = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
      await assertSucceeds(getDocs(collection(db, 'organizations/clinic_a/patients')));
    });

    it('ALLOW: admin can create a patient with required identity fields only', async () => {
      const db = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_new'), {
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
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
    });

    it('ALLOW: active care team nurse can read their patient document', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
    });

    it('ALLOW: linked patient can read their own patient document', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
    });

    it('ALLOW: linked patient can update only phone and email on patient document', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), {
        phone: '999-999-9999',
        email: 'alice_new@example.com'
      }));
    });

    it('ALLOW: active care team member can update patient document', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), {
        phone: '111-222-3333'
      }));
    });

    it('ALLOW: admin, active team members, and linked patient can read care_teams', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();
      const patientDb = testEnv.authenticatedContext('patient_user_a').firestore();

      await assertSucceeds(getDoc(doc(adminDb, 'organizations/clinic_a/care_teams/patient_A_dr_smith')));
      await assertSucceeds(getDoc(doc(clinicianDb, 'organizations/clinic_a/care_teams/patient_A_nurse_amy')));
      await assertSucceeds(getDoc(doc(patientDb, 'organizations/clinic_a/care_teams/patient_A_dr_smith')));
    });

    it('ALLOW: active team member can read clinical notes, vitals, prescriptions', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_1')));
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1')));
    });

    it('ALLOW: linked patient can read their own chart (notes, vitals, prescriptions)', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_1')));
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1')));
    });

    it('ALLOW: active team clinician can create notes with self as author', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_2'), {
        authorId: 'dr_smith',
        content: 'Follow-up exam note',
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('ALLOW: note author still on active team can update their note', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith'), {
        content: 'Initial assessment - amended with vitals check'
      }));
    });

    it('ALLOW: patient can add vitals with source=patient and self as author', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_patient_1'), {
        authorId: 'patient_user_a',
        source: 'patient',
        systolic: 120,
        diastolic: 80,
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('ALLOW: active clinician on team can create prescription with self as author', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_2'), {
        authorId: 'dr_smith',
        medication: 'Lisinopril 10mg',
        dosage: 'Daily',
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('ALLOW: active clinician on team can update prescription authoring', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        dosage: 'BID x 10d'
      }));
    });

    it('ALLOW: user can update own displayName and phone on users/{uid}', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'users/dr_smith'), {
        displayName: 'Dr. John Smith',
        phone: '222-222-9999'
      }));
    });
  });

  // ==========================================
  // DENIED ACTIONS TEST MATRIX
  // ==========================================
  describe('DENIED cases', () => {
    it('DENY: clinician not on care team reading patient document', async () => {
      const db = testEnv.authenticatedContext('dr_jones').firestore();
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
    });

    it('DENY: removed care team member reading patient document or chart', async () => {
      const db = testEnv.authenticatedContext('dr_removed').firestore();
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
    });

    it('DENY: removed care team member updating a note they authored', async () => {
      const db = testEnv.authenticatedContext('dr_removed').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_removed_clinician'), {
        content: 'Should fail'
      }));
    });

    it('DENY: nurse writing a prescription', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_nurse'), {
        authorId: 'nurse_amy',
        medication: 'Ibuprofen',
        dosage: 'PRN',
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('DENY: nurse creating care_teams entry', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_unassigned_staff'), {
        patientId: 'patient_A',
        userId: 'unassigned_staff',
        displayName: 'Dr. Unassigned',
        role: 'clinician',
        status: 'active'
      }));
    });

    it('DENY: clinician on patient A creating care_teams entry for patient B', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_B_unassigned_staff'), {
        patientId: 'patient_B',
        userId: 'unassigned_staff',
        displayName: 'Dr. Unassigned',
        role: 'clinician',
        status: 'active'
      }));
    });

    it('DENY: patient reading another patient document', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_B')));
    });

    it('DENY: unassigned staff listing or getting patients', async () => {
      const db = testEnv.authenticatedContext('unassigned_staff').firestore();
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
      await assertFails(getDocs(collection(db, 'organizations/clinic_a/patients')));
    });

    it('DENY: non-admin changing patient identity fields (firstName, mrn, linkedUserId)', async () => {
      const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();
      const patientDb = testEnv.authenticatedContext('patient_user_a').firestore();

      await assertFails(updateDoc(doc(clinicianDb, 'organizations/clinic_a/patients/patient_A'), { firstName: 'Hacked' }));
      await assertFails(updateDoc(doc(patientDb, 'organizations/clinic_a/patients/patient_A'), { mrn: 'Hacked' }));
      await assertFails(updateDoc(doc(patientDb, 'organizations/clinic_a/patients/patient_A'), { linkedUserId: 'hacked_id' }));
    });

    it('DENY: forging authorId on note creation', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_fake'), {
        authorId: 'dr_jones',
        content: 'Forged note',
        createdAt: '2026-03-02T00:00:00Z'
      }));
    });

    it('DENY: changing authorId on prescription update', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        authorId: 'dr_jones'
      }));
    });

    it('DENY: user changing role or unauthorized fields on users/{uid}', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(updateDoc(doc(db, 'users/nurse_amy'), {
        role: 'admin'
      }));
    });

    it('DENY: deleting records in care_teams or clinical records', async () => {
      const dbAdmin = testEnv.authenticatedContext('admin_1').firestore();
      const dbClinician = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(deleteDoc(doc(dbAdmin, 'organizations/clinic_a/care_teams/patient_A_dr_smith')));
      await assertFails(deleteDoc(doc(dbClinician, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
      await assertFails(deleteDoc(doc(dbAdmin, 'organizations/clinic_a/patients/patient_A')));
    });
  });

  // ==========================================
  // 18 SCENARIOS FROM PROBES2.TS (migrated to Clinic A)
  // ==========================================
  describe('Probes2 Review Scenarios', () => {
    // --- controls ---
    it('ALLOW: C1 clinician on the team reads a note', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
    });

    it('DENY: C2 nurse on A reads patient B', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_B')));
    });

    // --- problems found in review ---
    it('DENY: P1 nurse sets patient_A.linkedUserId to her own account', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), { linkedUserId: 'nurse_amy' }));
    });

    it('DENY: P2 nurse links herself, is removed from the team, still reads the chart', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), { linkedUserId: 'nurse_amy' }));
      await testEnv.withSecurityRulesDisabled(ctx =>
        updateDoc(doc(ctx.firestore(), 'organizations/clinic_a/care_teams/patient_A_nurse_amy'), { status: 'removed' }));
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
    });

    it('DENY: P3 nurse removes the clinician from the team', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_dr_smith'), { status: 'removed', removedAt: '2026-03-01' }));
    });

    // P4 UPDATED ON PURPOSE FOR TASK 1B:
    // Patient reads their clinician's name from their care_teams entry, not from the clinician's user account
    it('ALLOW: P4 patient reads the name of their own clinician from care_teams entry', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      const teamDoc = await getDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_dr_smith'));
      assert.strictEqual(teamDoc.data()?.displayName, 'Dr. Smith');
      // Patient cannot read clinician's user record directly
      await assertFails(getDoc(doc(db, 'users/dr_smith')));
    });

    it('DENY: P5 nurse reads the user record of a patient who is not hers', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(getDoc(doc(db, 'users/patient_user_b')));
    });

    it('ALLOW: P6 clinician lists their own care-team assignments', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(getDocs(query(collection(db, 'organizations/clinic_a/care_teams'), where('userId', '==', 'dr_smith'))));
    });

    it('DENY: P7 clinician relabels their clinic vital as patient-entered', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_1'), { source: 'patient' }));
    });

    it('ALLOW: P8 active clinician adds a nurse to their own patient team', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_nurse_bob'), {
        patientId: 'patient_A',
        userId: 'nurse_bob',
        displayName: 'Nurse Bob',
        role: 'nurse',
        status: 'active'
      }));
    });

    // --- safety checks on the fixes ---
    it('ALLOW: S1 patient lists their own care team', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(getDocs(query(collection(db, 'organizations/clinic_a/care_teams'), where('patientId', '==', 'patient_A'))));
    });

    it('ALLOW: S2 active clinician removes a nurse from the team', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_nurse_amy'), {
        status: 'removed',
        removedAt: '2026-03-01'
      }));
    });

    it('ALLOW: S3 care-team member updates the patient phone number', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), { phone: '2' }));
    });

    it('DENY: S4 clinician on A forges a team entry to reach patient B', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_B_dr_smith'), {
        patientId: 'patient_A',
        userId: 'dr_smith',
        displayName: 'Dr. Smith',
        role: 'clinician',
        status: 'active'
      }));
    });

    it('DENY: S5 clinician adds a nurse under the wrong role', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_nurse_bob'), {
        patientId: 'patient_A',
        userId: 'nurse_bob',
        displayName: 'Nurse Bob',
        role: 'clinician',
        status: 'active'
      }));
    });

    it('DENY: S6 nurse adds someone to the team', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_nurse_bob'), {
        patientId: 'patient_A',
        userId: 'nurse_bob',
        displayName: 'Nurse Bob',
        role: 'nurse',
        status: 'active'
      }));
    });

    it('DENY: S7 patient reads another patient user record', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(getDoc(doc(db, 'users/patient_user_b')));
    });

    it('DENY: S8 clinician changes the patient MRN', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A'), { mrn: 'X' }));
    });
  });

  // ==========================================
  // TASK 1B: ORGANIZATIONS & PLATFORM OWNER TESTS
  // ==========================================
  describe('Task 1b: Organizations and Multi-tenancy Scenarios', () => {
    it('DENY: Clinic B admin cannot get or list Clinic A patients, staff or care teams', async () => {
      const db = testEnv.authenticatedContext('admin_b').firestore();
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
      await assertFails(getDocs(collection(db, 'organizations/clinic_a/patients')));
      await assertFails(getDoc(doc(db, 'users/dr_smith')));
      await assertFails(getDocs(query(collection(db, 'users'), where('orgId', '==', 'clinic_a'))));
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_dr_smith')));
      await assertFails(getDocs(collection(db, 'organizations/clinic_a/care_teams')));
    });

    it('DENY: Clinic B admin cannot create a patient, care-team entry or user in Clinic A', async () => {
      const db = testEnv.authenticatedContext('admin_b').firestore();
      // Cannot create patient in Clinic A
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_forged'), {
        id: 'patient_forged',
        mrn: 'MRN-FORGED',
        firstName: 'Forged',
        lastName: 'Patient',
        dob: '2000-01-01',
        gender: 'other',
        email: 'forged@example.com',
        phone: '111-111-1111',
        linkedUserId: 'user_forged',
        createdAt: '2026-03-01T00:00:00Z'
      }));
      // Cannot create care-team entry in Clinic A
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_nurse_clinic_b'), {
        patientId: 'patient_A',
        userId: 'nurse_clinic_b',
        displayName: 'Nurse Clinic B',
        role: 'nurse',
        status: 'active'
      }));
      // Cannot create staff user in Clinic A
      await assertFails(setDoc(doc(db, 'users/new_staff_a'), {
        displayName: 'New Staff A',
        email: 'staff_a@example.com',
        phone: '111-222-3333',
        role: 'nurse',
        orgId: 'clinic_a'
      }));
    });

    it('DENY: Clinic B admin cannot change a Clinic A user role or orgId', async () => {
      const db = testEnv.authenticatedContext('admin_b').firestore();
      await assertFails(updateDoc(doc(db, 'users/dr_smith'), { role: 'admin' }));
      await assertFails(updateDoc(doc(db, 'users/dr_smith'), { orgId: 'clinic_b' }));
    });

    it('DENY: No one can change any user orgId', async () => {
      const adminADb = testEnv.authenticatedContext('admin_1').firestore();
      const drSmithDb = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(adminADb, 'users/dr_smith'), { orgId: 'clinic_b' }));
      await assertFails(updateDoc(doc(drSmithDb, 'users/dr_smith'), { orgId: 'clinic_b' }));
    });

    it('DENY: A Clinic A clinician given a forged active care_teams entry in Clinic B still cannot read Clinic B chart', async () => {
      // Seed forged care team entry in Clinic B for dr_smith (who belongs to clinic_a)
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'organizations/clinic_b/care_teams/patient_chen_b_dr_smith'), {
          patientId: 'patient_chen_b',
          userId: 'dr_smith',
          displayName: 'Dr. Smith',
          role: 'clinician',
          status: 'active'
        });
      });

      const db = testEnv.authenticatedContext('dr_smith').firestore();
      // Must be denied because dr_smith does not belong to clinic_b
      await assertFails(getDoc(doc(db, 'organizations/clinic_b/patients/patient_chen_b')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_b/patients/patient_chen_b/notes/note_chen_1')));
    });

    it('ALLOW/DENY: A patient linked to records at both Clinic A and Clinic B can read both of their own charts, and no other patient chart at either', async () => {
      const db = testEnv.authenticatedContext('dual_patient_user').firestore();
      // Can read own records at Clinic A and Clinic B
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_a/patients/patient_dual_a')));
      await assertSucceeds(getDoc(doc(db, 'organizations/clinic_b/patients/patient_dual_b')));

      // Cannot read other patients at Clinic A or Clinic B
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_b/patients/patient_chen_b')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_b/patients/patient_b_other')));
    });

    it('dr_chen_work cannot read any Clinic B chart; dr_chen_personal can read only their own Clinic B chart and cannot write notes or prescriptions', async () => {
      const workDb = testEnv.authenticatedContext('dr_chen_work').firestore();
      const personalDb = testEnv.authenticatedContext('dr_chen_personal').firestore();

      // dr_chen_work cannot read Clinic B patient chart
      await assertFails(getDoc(doc(workDb, 'organizations/clinic_b/patients/patient_chen_b')));
      await assertFails(getDoc(doc(workDb, 'organizations/clinic_b/patients/patient_chen_b/notes/note_chen_1')));

      // dr_chen_personal can read their own Clinic B chart
      await assertSucceeds(getDoc(doc(personalDb, 'organizations/clinic_b/patients/patient_chen_b')));
      await assertSucceeds(getDoc(doc(personalDb, 'organizations/clinic_b/patients/patient_chen_b/notes/note_chen_1')));

      // dr_chen_personal cannot read other Clinic B patient charts
      await assertFails(getDoc(doc(personalDb, 'organizations/clinic_b/patients/patient_b_other')));

      // dr_chen_personal cannot write notes or prescriptions
      await assertFails(setDoc(doc(personalDb, 'organizations/clinic_b/patients/patient_chen_b/notes/note_fail'), {
        authorId: 'dr_chen_personal',
        content: 'Patient writing note',
        createdAt: '2026-03-01T00:00:00Z'
      }));
      await assertFails(setDoc(doc(personalDb, 'organizations/clinic_b/patients/patient_chen_b/prescriptions/rx_fail'), {
        authorId: 'dr_chen_personal',
        medication: 'Aspirin',
        dosage: 'Daily',
        createdAt: '2026-03-01T00:00:00Z'
      }));
    });

    it('Platform owner can create an organization and its first admin, and cannot read any patient, chart, care team or user', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();

      // Can create organization
      await assertSucceeds(setDoc(doc(ownerDb, 'organizations/clinic_c'), {
        name: 'Clinic C',
        firstAdminUid: 'admin_c',
        createdAt: '2026-03-01T00:00:00Z'
      }));

      // Can create first admin for Clinic C
      await assertSucceeds(setDoc(doc(ownerDb, 'users/admin_c'), {
        displayName: 'Admin C',
        email: 'admin_c@example.com',
        phone: '111-222-3333',
        role: 'admin',
        orgId: 'clinic_c'
      }));

      // Cannot read any patient, chart, care team or user
      await assertFails(getDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A')));
      await assertFails(getDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
      await assertFails(getDoc(doc(ownerDb, 'organizations/clinic_a/care_teams/patient_A_dr_smith')));
      await assertFails(getDoc(doc(ownerDb, 'users/dr_smith')));
    });

    it('DENY: A user without the platformOwner claim cannot create an organization', async () => {
      const userDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(setDoc(doc(userDb, 'organizations/clinic_d'), {
        name: 'Clinic D',
        firstAdminUid: 'admin_d',
        createdAt: '2026-03-01T00:00:00Z'
      }));
    });

    it('DENY: Creating a user document with an unexpected field is rejected', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      // First create org clinic_e
      await setDoc(doc(ownerDb, 'organizations/clinic_e'), {
        name: 'Clinic E',
        firstAdminUid: 'admin_e',
        createdAt: '2026-03-01T00:00:00Z'
      });

      // Try creating user with unexpected platformOwner field
      await assertFails(setDoc(doc(ownerDb, 'users/admin_e'), {
        displayName: 'Admin E',
        email: 'admin_e@example.com',
        phone: '111-222-3333',
        role: 'admin',
        orgId: 'clinic_e',
        platformOwner: true
      }));
    });

    // Additional specific tests requested:
    it('DENY: an org admin cannot add themselves or any admin to a care team, and has no chart access even with a forged care-team entry', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      // Admin cannot create care team entry for themselves or another admin
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/care_teams/patient_A_admin_1'), {
        patientId: 'patient_A',
        userId: 'admin_1',
        displayName: 'Admin User',
        role: 'admin',
        status: 'active'
      }));

      // Forge an entry via rules-disabled context
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'organizations/clinic_a/care_teams/patient_A_admin_1'), {
          patientId: 'patient_A',
          userId: 'admin_1',
          displayName: 'Admin User',
          role: 'admin',
          status: 'active'
        });
      });

      // Admin still has no chart access (notes, vitals, prescriptions)
      await assertFails(getDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
      await assertFails(getDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A/vitals/vital_1')));
      await assertFails(getDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1')));
    });

    it('DENY: a care-team entry whose displayName or role does not match the member account is rejected', async () => {
      const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();

      // Mismatched role
      await assertFails(setDoc(doc(clinicianDb, 'organizations/clinic_a/care_teams/patient_A_nurse_bob'), {
        patientId: 'patient_A',
        userId: 'nurse_bob',
        displayName: 'Nurse Bob',
        role: 'clinician',
        status: 'active'
      }));

      // Mismatched displayName
      await assertFails(setDoc(doc(clinicianDb, 'organizations/clinic_a/care_teams/patient_A_nurse_bob'), {
        patientId: 'patient_A',
        userId: 'nurse_bob',
        displayName: 'Wrong Name',
        role: 'nurse',
        status: 'active'
      }));
    });

    it('DENY: a Clinic A clinician cannot add a Clinic B staff member to a Clinic A team', async () => {
      const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(clinicianDb, 'organizations/clinic_a/care_teams/patient_A_nurse_clinic_b'), {
        patientId: 'patient_A',
        userId: 'nurse_clinic_b',
        displayName: 'Nurse Clinic B',
        role: 'nurse',
        status: 'active'
      }));
    });

    it('DENY: a nurse cannot remove anyone; a clinician can only set status removed', async () => {
      const nurseDb = testEnv.authenticatedContext('nurse_amy').firestore();
      const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();

      // Nurse cannot remove
      await assertFails(updateDoc(doc(nurseDb, 'organizations/clinic_a/care_teams/patient_A_dr_smith'), {
        status: 'removed',
        removedAt: '2026-03-01'
      }));

      // Clinician setting status to active fails
      await assertFails(updateDoc(doc(clinicianDb, 'organizations/clinic_a/care_teams/patient_A_dr_removed'), {
        status: 'active'
      }));

      // Clinician setting status to removed succeeds
      await assertSucceeds(updateDoc(doc(clinicianDb, 'organizations/clinic_a/care_teams/patient_A_nurse_amy'), {
        status: 'removed',
        removedAt: '2026-03-01'
      }));
    });

    it('DENY: platform owner cannot create a second admin or make themselves admin', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();

      // Cannot create admin with matching uid == request.auth.uid (make themselves admin)
      await assertFails(setDoc(doc(ownerDb, 'users/platform_owner_uid'), {
        displayName: 'Owner Admin',
        email: 'owner@example.com',
        phone: '111-222-3333',
        role: 'admin',
        orgId: 'clinic_a'
      }));

      // Cannot create a second admin for Clinic A (firstAdminUid was admin_1)
      await assertFails(setDoc(doc(ownerDb, 'users/admin_second_a'), {
        displayName: 'Second Admin',
        email: 'admin2@example.com',
        phone: '111-222-3333',
        role: 'admin',
        orgId: 'clinic_a'
      }));
    });

    it('DENY: an admin cannot change their own role', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'users/admin_1'), {
        role: 'clinician'
      }));
    });

    it('ALLOW/DENY: Clinic A staff can list Clinic A staff but not Clinic B staff, and nobody can list patient accounts', async () => {
      const staffDb = testEnv.authenticatedContext('dr_smith').firestore();
      const patientDb = testEnv.authenticatedContext('patient_user_a').firestore();

      // Staff can list Clinic A staff
      await assertSucceeds(getDocs(query(collection(staffDb, 'users'), where('orgId', '==', 'clinic_a'))));

      // Staff cannot list Clinic B staff
      await assertFails(getDocs(query(collection(staffDb, 'users'), where('orgId', '==', 'clinic_b'))));

      // Nobody can list patient accounts
      await assertFails(getDocs(query(collection(staffDb, 'users'), where('role', '==', 'patient'))));
      await assertFails(getDocs(query(collection(patientDb, 'users'), where('role', '==', 'patient'))));
    });

    it('ALLOW: a patient collection-group query returns their Clinic A and Clinic B records and no one else', async () => {
      const db = testEnv.authenticatedContext('dual_patient_user').firestore();
      const q = query(collectionGroup(db, 'patients'), where('linkedUserId', '==', 'dual_patient_user'));
      const snapshot = await assertSucceeds(getDocs(q));
      assert.strictEqual(snapshot.docs.length, 2);
      const patientIds = snapshot.docs.map(d => d.id).sort();
      assert.deepStrictEqual(patientIds, ['patient_dual_a', 'patient_dual_b']);
    });
  });
});
