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
  deleteField,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { CANONICAL_SEED } from '../src/services/seed';
import { getStaffPatients, getMyCareTeams, FirestoreDataService } from '../src/services/firestore';

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
        await setDoc(doc(db, 'users/dr_brown'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Brown', phone: '444-444-4444' });
        await setDoc(doc(db, 'users/unassigned_staff'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Unassigned', phone: '999-999-9999' });

        // Patient accounts: no orgId
        await setDoc(doc(db, 'users/patient_user_a'), { role: 'patient', displayName: 'Alice Patient', phone: '777-777-7777' });
        await setDoc(doc(db, 'users/patient_user_b'), { role: 'patient', displayName: 'Bob Patient', phone: '888-888-8888' });
        await setDoc(doc(db, 'users/user_new'), { role: 'patient', displayName: 'New User Patient', phone: '123-456-7890' });

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
          orgName: 'Clinic A',
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
          orgName: 'Clinic A',
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
          orgName: 'Clinic A',
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
          orgName: 'Clinic B',
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
          orgName: 'Clinic B',
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
          orgName: 'Clinic B',
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
        await setDoc(doc(db, 'organizations/clinic_a/care_teams/patient_A_dr_brown'), {
          patientId: 'patient_A',
          userId: 'dr_brown',
          displayName: 'Dr. Brown',
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
          body: 'Initial assessment',
          status: 'final',
          createdAt: Timestamp.fromDate(new Date('2026-01-10T00:00:00Z')),
          finalisedAt: Timestamp.fromDate(new Date('2026-01-10T00:00:00Z'))
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_removed_clinician'), {
          authorId: 'dr_removed',
          body: 'Old note from removed clinician',
          status: 'draft',
          createdAt: Timestamp.fromDate(new Date('2026-01-05T00:00:00Z'))
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_1'), {
          authorId: 'dr_smith',
          source: 'clinic',
          heartRate: 72,
          recordedAt: Timestamp.fromDate(new Date('2026-01-10T00:00:00Z')),
          createdAt: Timestamp.fromDate(new Date('2026-01-10T00:00:00Z'))
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
          authorId: 'dr_smith',
          medication: 'Amoxicillin 500mg',
          dose: '500mg',
          route: 'PO',
          frequency: 'TID x 10d',
          status: 'active',
          createdAt: Timestamp.fromDate(new Date('2026-01-10T00:00:00Z'))
        });
        await setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_discontinued_earlier'), {
          authorId: 'dr_smith',
          medication: 'Amoxicillin 500mg',
          dose: '500mg',
          route: 'PO',
          frequency: 'TID x 10d',
          status: 'discontinued',
          discontinuedBy: 'dr_smith',
          discontinuedAt: Timestamp.fromDate(new Date('2026-01-11T00:00:00Z')),
          createdAt: Timestamp.fromDate(new Date('2026-01-10T00:00:00Z'))
        });

        // Clinical records on Clinic B patients
        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_chen_b/notes/note_chen_1'), {
          authorId: 'dr_clinic_b',
          body: 'Note for Chen at Clinic B',
          status: 'final',
          createdAt: Timestamp.fromDate(new Date('2026-01-11T00:00:00Z')),
          finalisedAt: Timestamp.fromDate(new Date('2026-01-11T00:00:00Z'))
        });
        await setDoc(doc(db, 'organizations/clinic_b/patients/patient_b_other/notes/note_other_1'), {
          authorId: 'dr_clinic_b',
          body: 'Note for other patient at Clinic B',
          status: 'final',
          createdAt: Timestamp.fromDate(new Date('2026-01-12T00:00:00Z')),
          finalisedAt: Timestamp.fromDate(new Date('2026-01-12T00:00:00Z'))
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
        orgName: 'Clinic A',
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
        body: 'Follow-up exam note',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
    });

    it('DENY: note author on active team cannot perform in-place update on note', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith'), {
        body: 'Initial assessment - amended with vitals check'
      }));
    });

    it('ALLOW: patient can add vitals with source=patient and self as author', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_patient_1'), {
        authorId: 'patient_user_a',
        source: 'patient',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 120,
        diastolic: 80
      }));
    });

    it('ALLOW: active clinician on team can create prescription with self as author', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_2'), {
        authorId: 'dr_smith',
        medication: 'Lisinopril 10mg',
        dose: '10mg',
        route: 'oral',
        frequency: 'daily',
        status: 'active',
        createdAt: serverTimestamp()
      }));
    });

    it('ALLOW: active clinician on team can discontinue a prescription', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'dr_smith'
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
        body: 'Should fail'
      }));
    });

    it('DENY: nurse writing a prescription', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_nurse'), {
        authorId: 'nurse_amy',
        medication: 'Ibuprofen',
        dose: '200mg',
        route: 'oral',
        frequency: 'PRN',
        status: 'active',
        createdAt: serverTimestamp()
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
        body: 'Forged note',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
    });

    it('DENY: changing authorId or medication on prescription update', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'dr_smith',
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
        orgName: 'Clinic A',
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
        body: 'Patient writing note',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      await assertFails(setDoc(doc(personalDb, 'organizations/clinic_b/patients/patient_chen_b/prescriptions/rx_fail'), {
        authorId: 'dr_chen_personal',
        medication: 'Aspirin',
        dose: '81mg',
        route: 'oral',
        frequency: 'daily',
        status: 'active',
        createdAt: serverTimestamp()
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

  // =========================================================================
  // TASK 1C: ESCALATION CLOSURE, PATIENT ID BINDING & MRN LIFECYCLE
  // =========================================================================
  describe('Task 1c: Escalation Closure, Patient ID Binding & MRN Lifecycle', () => {
    it('ALLOW: admin creates a patient with no linkedUserId', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_no_link'), {
        id: 'patient_no_link',
        mrn: 'MRN-NOLINK-01',
        firstName: 'No',
        lastName: 'Link',
        dob: '1990-01-01',
        gender: 'female',
        email: 'nolink@example.com',
        phone: '555-444-3333',
        orgName: 'Clinic A',
        createdAt: '2026-03-05T00:00:00Z'
      }));
    });

    it('ALLOW: admin updates demographics (name, phone, mrn)', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        firstName: 'AliceUpdated',
        phone: '555-987-6543',
        mrn: 'MRN-001-REV'
      }));
    });

    it('ALLOW: admin unlinks a patient by removing linkedUserId', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        linkedUserId: deleteField()
      }));
    });

    it('DENY: admin creating patient missing required fields (mrn, firstName, lastName, dob)', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      // Empty document
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_empty'), {}));
      // Missing mrn
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_missing_mrn'), {
        id: 'patient_missing_mrn',
        firstName: 'Pending',
        lastName: 'Onboarding',
        dob: '1995-04-12',
        orgName: 'Clinic A'
      }));
      // Missing firstName
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_missing_first'), {
        id: 'patient_missing_first',
        mrn: 'MRN-101',
        lastName: 'Onboarding',
        dob: '1995-04-12',
        orgName: 'Clinic A'
      }));
      // Missing lastName
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_missing_last'), {
        id: 'patient_missing_last',
        mrn: 'MRN-102',
        firstName: 'Pending',
        dob: '1995-04-12',
        orgName: 'Clinic A'
      }));
      // Missing dob
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_missing_dob'), {
        id: 'patient_missing_dob',
        mrn: 'MRN-103',
        firstName: 'Pending',
        lastName: 'Onboarding',
        orgName: 'Clinic A'
      }));
      // Empty string mrn
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_empty_mrn'), {
        id: 'patient_empty_mrn',
        mrn: '',
        firstName: 'Pending',
        lastName: 'Onboarding',
        dob: '1995-04-12',
        orgName: 'Clinic A'
      }));
      // Empty string firstName
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_empty_first'), {
        id: 'patient_empty_first',
        mrn: 'MRN-104',
        firstName: '',
        lastName: 'Onboarding',
        dob: '1995-04-12',
        orgName: 'Clinic A'
      }));
      // Empty string lastName
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_empty_last'), {
        id: 'patient_empty_last',
        mrn: 'MRN-105',
        firstName: 'Pending',
        lastName: '',
        dob: '1995-04-12',
        orgName: 'Clinic A'
      }));
    });

    it('DENY: admin updating patient with empty-string mrn or names, or removing mrn', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      // Empty string mrn on update
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        mrn: ''
      }));
      // Empty string firstName on update
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        firstName: ''
      }));
      // Empty string lastName on update
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        lastName: ''
      }));
      // Removing mrn on update
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        mrn: deleteField()
      }));
    });

    it('DENY: collection-group patients list without the linkedUserId filter', async () => {
      const db = testEnv.authenticatedContext('dual_patient_user').firestore();
      await assertFails(getDocs(collectionGroup(db, 'patients')));
    });

    it('DENY: staff listing /users without the orgId filter', async () => {
      const staffDb = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(getDocs(collection(staffDb, 'users')));
    });

    it('DENY: patient listing /users', async () => {
      const patientDb = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(getDocs(collection(patientDb, 'users')));
    });

    it('ALLOW: admin can update patient linkedUserId to an existing patient account', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertSucceeds(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        linkedUserId: 'patient_user_b'
      }));
    });

    it('DENY: admin creating patient where data.id != patientId (path mismatch)', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_path_id'), {
        id: 'different_id_field',
        mrn: 'MRN-PATH-1',
        firstName: 'Mismatch',
        lastName: 'Patient',
        dob: '1990-01-01',
        orgName: 'Clinic A',
        createdAt: '2026-03-05T00:00:00Z'
      }));
    });

    it('DENY: admin updating patient to change id to mismatch patientId', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        id: 'tampered_patient_id'
      }));
    });

    it('DENY: admin setting patient linkedUserId to their own uid on update', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        linkedUserId: 'admin_1'
      }));
    });

    it('DENY: admin setting patient linkedUserId to their own uid on create', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_escalate_attempt'), {
        id: 'patient_escalate_attempt',
        mrn: 'MRN-ESC-1',
        firstName: 'Escalation',
        lastName: 'Attempt',
        dob: '1990-01-01',
        orgName: 'Clinic A',
        linkedUserId: 'admin_1',
        createdAt: '2026-03-05T00:00:00Z'
      }));
    });

    it('DENY: admin setting patient linkedUserId to a clinician or nurse uid', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      // dr_smith is role clinician
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        linkedUserId: 'dr_smith'
      }));
      // nurse_amy is role nurse
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        linkedUserId: 'nurse_amy'
      }));
    });

    it('DENY: admin setting patient linkedUserId to a non-existent user UID', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        linkedUserId: 'non_existent_uid_999'
      }));
    });

    it('DENY: platform owner cannot read notes', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      await assertFails(getDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
    });

    it('DENY: platform owner cannot create or update notes', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      await assertFails(setDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/notes/note_owner'), {
        authorId: 'platform_owner_uid',
        body: 'Unauthorized owner note',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      await assertFails(updateDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/notes/note_smith'), {
        body: 'Tampered note content'
      }));
    });

    it('DENY: platform owner cannot read vitals', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      await assertFails(getDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/vitals/vital_1')));
    });

    it('DENY: platform owner cannot create or update vitals', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      await assertFails(setDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/vitals/vital_owner'), {
        authorId: 'platform_owner_uid',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        heartRate: 70
      }));
      await assertFails(updateDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/vitals/vital_1'), {
        heartRate: 80
      }));
    });

    it('DENY: platform owner cannot read prescriptions', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      await assertFails(getDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1')));
    });

    it('DENY: platform owner cannot create or update prescriptions', async () => {
      const ownerDb = testEnv.authenticatedContext('platform_owner_uid', { platformOwner: true }).firestore();
      await assertFails(setDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_owner'), {
        authorId: 'platform_owner_uid',
        medication: 'Unauthorized Rx',
        dose: '10mg',
        route: 'oral',
        frequency: 'daily',
        status: 'active',
        createdAt: serverTimestamp()
      }));
      await assertFails(updateDoc(doc(ownerDb, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'platform_owner_uid'
      }));
    });

    it('DENY: removing or adding orgId on a user document is denied by explicit condition', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      const patientDb = testEnv.authenticatedContext('patient_user_a').firestore();

      // Adding orgId to a user document that had none (patient account)
      await assertFails(updateDoc(doc(patientDb, 'users/patient_user_a'), {
        orgId: 'clinic_a'
      }));

      // Changing orgId on a staff user
      await assertFails(updateDoc(doc(adminDb, 'users/dr_smith'), {
        orgId: 'clinic_b'
      }));
    });
  });

  // ==========================================
  // DEVICE & WEARABLE VITALS TELEMETRY
  // ==========================================
  describe('Device & Wearable Vitals Telemetry', () => {
    it('DENY: linked patient cannot submit vitals with source=device', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_device_1'), {
        authorId: 'patient_user_a',
        source: 'device',
        deviceId: 'cgm-dexcom-g7-9912',
        deviceModel: 'Dexcom G7',
        metric: 'glucose',
        value: 105,
        unit: 'mg/dL',
        capturedAt: '2026-03-02T10:00:00Z',
        createdAt: '2026-03-02T10:05:00Z'
      }));
    });

    it('DENY: linked patient cannot submit vitals with source=wearable', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_wearable_1'), {
        authorId: 'patient_user_a',
        source: 'wearable',
        deviceModel: 'Apple Watch Series 9',
        metric: 'heart_rate',
        value: 72,
        unit: 'bpm',
        createdAt: '2026-03-02T10:00:00Z'
      }));
    });

    it('DENY: patient cannot submit vitals with source=clinic', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_fake_clinic'), {
        authorId: 'patient_user_a',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        heartRate: 72
      }));
    });

    it('DENY: linked patient updates a vital they entered themselves (source: patient)', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'organizations/clinic_a/patients/patient_A/vitals/vital_self_entered'), {
          authorId: 'patient_user_a',
          source: 'patient',
          recordedAt: Timestamp.fromDate(new Date('2026-03-02T10:00:00Z')),
          createdAt: Timestamp.fromDate(new Date('2026-03-02T10:00:00Z')),
          heartRate: 72
        });
      });
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_self_entered'), {
        heartRate: 80
      }));
    });

    it('DENY: linked patient creates a source: patient vital in another patient’s chart', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_B/vitals/vital_cross_patient'), {
        authorId: 'patient_user_a',
        source: 'patient',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        heartRate: 72
      }));
    });
  });

  describe('Task 3: Canonical Seed Validation & Multi-Org Patient Care Team View', () => {
    async function loadCanonicalSeedThroughRules() {
      await testEnv.clearFirestore();
      const ownerDb = testEnv.authenticatedContext('platform_owner', { platformOwner: true }).firestore();

      for (const org of CANONICAL_SEED.organizations) {
        await assertSucceeds(setDoc(doc(ownerDb, 'organizations', org.id), {
          ...org.data
        }));
      }

      for (const admin of CANONICAL_SEED.firstAdmins) {
        await assertSucceeds(setDoc(doc(ownerDb, 'users', admin.id), {
          ...admin.data
        }));
      }

      for (const staff of CANONICAL_SEED.staffUsers) {
        const adminId = staff.data.orgId === 'clinic_b' ? 'admin_b' : 'admin_1';
        const adminDb = testEnv.authenticatedContext(adminId).firestore();
        await assertSucceeds(setDoc(doc(adminDb, 'users', staff.id), {
          ...staff.data
        }));
      }

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      for (const patientUser of CANONICAL_SEED.patientUsers) {
        await assertSucceeds(setDoc(doc(adminDb, 'users', patientUser.id), {
          ...patientUser.data
        }));
      }

      for (const p of CANONICAL_SEED.patients) {
        const adminId = p.orgId === 'clinic_b' ? 'admin_b' : 'admin_1';
        const adminDb = testEnv.authenticatedContext(adminId).firestore();
        await assertSucceeds(setDoc(doc(adminDb, `organizations/${p.orgId}/patients`, p.entry.id), {
          ...p.entry.data
        }));
      }

      for (const ct of CANONICAL_SEED.careTeams) {
        const adminId = ct.orgId === 'clinic_b' ? 'admin_b' : 'admin_1';
        const adminDb = testEnv.authenticatedContext(adminId).firestore();
        await assertSucceeds(setDoc(doc(adminDb, `organizations/${ct.orgId}/care_teams`, ct.entry.id), {
          ...ct.entry.data
        }));
      }

      for (const update of CANONICAL_SEED.careTeamUpdates) {
        const clinicianDb = testEnv.authenticatedContext('dr_smith').firestore();
        await assertSucceeds(updateDoc(doc(clinicianDb, `organizations/${update.orgId}/care_teams`, update.docId), {
          ...update.data
        }));
      }
    }

    beforeEach(async () => {
      await loadCanonicalSeedThroughRules();
    });

    it('ALLOW: canonical seed loads verbatim through real rules', async () => {
      // Verified in beforeEach via loadCanonicalSeedThroughRules() assertSucceeds calls
    });

    it('DENY: admin creates patient without orgName', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_missing_orgname'), {
        id: 'patient_missing_orgname',
        mrn: 'MRN-NO-ORGNAME',
        firstName: 'No',
        lastName: 'OrgName',
        dob: '1990-01-01',
        gender: 'female',
        email: 'no_orgname@example.com',
        phone: '123-456-7890',
        createdAt: '2026-03-01T00:00:00Z'
      }));
    });

    it('DENY: admin creates patient with mismatched orgName', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(setDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_mismatch_orgname'), {
        id: 'patient_mismatch_orgname',
        mrn: 'MRN-MISMATCH-ORGNAME',
        firstName: 'Mismatch',
        lastName: 'OrgName',
        dob: '1990-01-01',
        gender: 'female',
        email: 'mismatch_orgname@example.com',
        phone: '123-456-7890',
        orgName: 'Wrong Clinic Name',
        createdAt: '2026-03-01T00:00:00Z'
      }));
    });

    it('DENY: admin updates patient to change orgName (immutable)', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        orgName: 'Tampered Clinic Name'
      }));
    });

    it('DENY: admin updates patient to remove orgName (immutable)', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'organizations/clinic_a/patients/patient_A'), {
        orgName: deleteField()
      }));
    });

    it('ALLOW: dr_smith runs real getStaffPatients() and sees exactly their active assigned patients', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const results = await getStaffPatients(db, 'clinic_a', 'dr_smith');

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results.every((r) => r.status === 'fulfilled'), true);

      const patientIds = results.map((r) => r.status === 'fulfilled' ? r.value.patient.id : null).sort();
      assert.deepStrictEqual(patientIds, ['patient_A', 'patient_B', 'patient_C']);

      for (const r of results) {
        if (r.status === 'fulfilled') {
          assert.strictEqual(r.value.memberRole, 'clinician');
        }
      }
    });

    it('ALLOW: dr_jones runs real getStaffPatients() and sees exactly their 2 active assigned patients', async () => {
      const db = testEnv.authenticatedContext('dr_jones').firestore();
      const results = await getStaffPatients(db, 'clinic_a', 'dr_jones');

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results.every((r) => r.status === 'fulfilled'), true);

      const patientIds = results.map((r) => r.status === 'fulfilled' ? r.value.patient.id : null).sort();
      assert.deepStrictEqual(patientIds, ['patient_C', 'patient_D']);

      for (const r of results) {
        if (r.status === 'fulfilled') {
          assert.strictEqual(r.value.memberRole, 'clinician');
        }
      }
    });

    it('ALLOW: nurse_amy runs real getStaffPatients() and sees only active patients (patient_C excluded entirely)', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      const results = await getStaffPatients(db, 'clinic_a', 'nurse_amy');

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results.every((r) => r.status === 'fulfilled'), true);

      const patientIds = results.map((r) => r.status === 'fulfilled' ? r.value.patient.id : null).sort();
      assert.deepStrictEqual(patientIds, ['patient_A', 'patient_B']);

      const containsPatientC = results.some((r) =>
        (r.status === 'fulfilled' && r.value.patient.id === 'patient_C') ||
        (r.status === 'rejected' && r.patientId === 'patient_C')
      );
      assert.strictEqual(containsPatientC, false);
    });

    it('ALLOW: dr_unassigned runs real getStaffPatients() and gets an empty array (0 patients)', async () => {
      const db = testEnv.authenticatedContext('dr_unassigned').firestore();
      const results = await getStaffPatients(db, 'clinic_a', 'dr_unassigned');

      assert.strictEqual(results.length, 0);
      assert.deepStrictEqual(results, []);
    });

    it('DENY: dr_unassigned attempting direct get on any patient chart is denied', async () => {
      const db = testEnv.authenticatedContext('dr_unassigned').firestore();

      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_A')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_B')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_C')));
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_D')));
    });

    it('ALLOW: dr_clinic_b panel query returns Alice’s Clinic B record using staff orgId', async () => {
      const db = testEnv.authenticatedContext('dr_clinic_b').firestore();
      const results = await getStaffPatients(db, 'clinic_b', 'dr_clinic_b');

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].status, 'fulfilled');
      if (results[0].status === 'fulfilled') {
        assert.strictEqual(results[0].value.patient.id, 'patient_alice_b');
        assert.strictEqual(results[0].value.patient.mrn, 'MRN-B-001');
        assert.strictEqual(results[0].value.patient.orgName, 'CarePlus West');
      }
    });

    it('ALLOW: getMyCareTeams returns active care teams for Alice across Clinic A and Clinic B, excluding removed members', async () => {
      const db = testEnv.authenticatedContext('alice').firestore();
      const careTeams = await getMyCareTeams(db, 'alice');

      assert.strictEqual(careTeams.length, 2);

      const clinicATeam = careTeams.find((ct) => ct.orgId === 'clinic_a');
      assert.ok(clinicATeam);
      assert.strictEqual(clinicATeam.orgName, 'CarePlus Clinic');
      assert.strictEqual(clinicATeam.patientId, 'patient_A');
      // Dr. Smith and Nurse Amy active; dr_removed is status: removed and must not appear
      assert.strictEqual(clinicATeam.members.length, 2);
      const memberUids = clinicATeam.members.map((m) => m.userId).sort();
      assert.deepStrictEqual(memberUids, ['dr_smith', 'nurse_amy']);

      const clinicBTeam = careTeams.find((ct) => ct.orgId === 'clinic_b');
      assert.ok(clinicBTeam);
      assert.strictEqual(clinicBTeam.orgName, 'CarePlus West');
      assert.strictEqual(clinicBTeam.patientId, 'patient_alice_b');
      assert.strictEqual(clinicBTeam.members.length, 1);
      assert.strictEqual(clinicBTeam.members[0].userId, 'dr_clinic_b');
      assert.strictEqual(clinicBTeam.members[0].role, 'clinician');
    });

    it('DENY: Alice cannot read patient_B chart or list patient_B care team', async () => {
      const db = testEnv.authenticatedContext('alice').firestore();

      // Direct chart access to patient_B
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/patients/patient_B')));

      // Direct care team read on patient_B
      await assertFails(getDoc(doc(db, 'organizations/clinic_a/care_teams/patient_B_dr_smith')));
      await assertFails(getDocs(query(collection(db, 'organizations/clinic_a/care_teams'), where('patientId', '==', 'patient_B'))));
    });

    it('ALLOW: getUser returns the correct user from /users/{uid}', async () => {
      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      const serviceAlice = new FirestoreDataService(aliceDb);
      const user = await serviceAlice.getUser('alice');
      assert.ok(user);
      assert.strictEqual(user.uid, 'alice');
      assert.strictEqual(user.displayName, 'Alice Smith');
      assert.strictEqual(user.role, 'patient');

      const smithDb = testEnv.authenticatedContext('dr_smith').firestore();
      const serviceSmith = new FirestoreDataService(smithDb);
      const staff = await serviceSmith.getUser('dr_jones');
      assert.ok(staff);
      assert.strictEqual(staff.uid, 'dr_jones');
      assert.strictEqual(staff.displayName, 'Dr. Michael Jones');
      assert.strictEqual(staff.role, 'clinician');
    });
  });

  describe('Task 6: Clinical Integrity Rules', () => {
    it('DENY: note with an unknown field', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_unk'), {
        authorId: 'dr_smith',
        body: 'Valid body',
        status: 'draft',
        createdAt: serverTimestamp(),
        unknownField: 'bad'
      }));
    });

    it('DENY: note with client-supplied createdAt string instead of serverTimestamp', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_client_ts'), {
        authorId: 'dr_smith',
        body: 'Valid body',
        status: 'draft',
        createdAt: '2026-03-01T00:00:00Z'
      }));
    });

    it('DENY: vital with future recordedAt', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const futureTime = Timestamp.fromDate(new Date(Date.now() + 86400000));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_future'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: futureTime,
        createdAt: serverTimestamp(),
        heartRate: 72
      }));
    });

    it('DENY: vital with systolic out of range (< 40 or > 300)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_sys_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 30,
        diastolic: 20
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_sys_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 310,
        diastolic: 80
      }));
    });

    it('DENY: vital with diastolic out of range (< 20 or > 200)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_dia_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 120,
        diastolic: 10
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_dia_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 250,
        diastolic: 210
      }));
    });

    it('DENY: vital with heartRate out of range (< 20 or > 300)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_hr_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        heartRate: 15
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_hr_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        heartRate: 350
      }));
    });

    it('DENY: vital with respRate out of range (< 4 or > 80)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_rr_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        respRate: 2
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_rr_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        respRate: 90
      }));
    });

    it('DENY: vital with tempC out of range (< 25 or > 45)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_temp_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        tempC: 20
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_temp_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        tempC: 50
      }));
    });

    it('DENY: vital with spo2 out of range (< 50 or > 100)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_spo2_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        spo2: 40
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_spo2_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        spo2: 105
      }));
    });

    it('DENY: vital with weightKg out of range (< 0.3 or > 500)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_wt_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        weightKg: 0.1
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_wt_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        weightKg: 600
      }));
    });

    it('DENY: vital with glucoseMgDl out of range (< 10 or > 1000)', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_glu_low'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        glucoseMgDl: 5
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_glu_high'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        glucoseMgDl: 1200
      }));
    });

    it('DENY: vital with systolic without diastolic', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_sys_only'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 120
      }));
    });

    it('DENY: vital with diastolic >= systolic', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_dia_equal'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 120,
        diastolic: 120
      }));
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_dia_greater'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 100,
        diastolic: 120
      }));
    });

    it('DENY: vitals doc with no measurement', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_no_meas'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }));
    });

    it('DENY: glucoseContext without glucoseMgDl', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_ctx_only'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        glucoseContext: 'fasting'
      }));
    });

    it('DENY: invalid glucoseContext value', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_ctx_inv'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        glucoseMgDl: 100,
        glucoseContext: 'invalid_context'
      }));
    });

    it('DENY: invalid consciousness value', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_cons_inv'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        consciousness: 'X'
      }));
    });

    it('DENY: non-boolean onOxygen', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_oxy_inv'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        heartRate: 70,
        onOxygen: 'yes'
      }));
    });

    it('DENY: editing a note', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith'), {
        body: 'Attempted note edit'
      }));
    });

    it('DENY: editing a vital', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_1'), {
        heartRate: 80
      }));
    });

    it('DENY: correction by someone other than the author', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_corr_wrong_author'), {
        authorId: 'nurse_amy',
        body: 'Correcting dr smith note',
        status: 'draft',
        createdAt: serverTimestamp(),
        correctsId: 'note_smith'
      }));
    });

    it('DENY: correction pointing at a non-existent record', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_corr_nonexist'), {
        authorId: 'dr_smith',
        body: 'Correcting non-existent note',
        status: 'draft',
        createdAt: serverTimestamp(),
        correctsId: 'non_existent_note_999'
      }));
    });

    it('DENY: changing a prescription’s dose', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'dr_smith',
        dose: '1000mg'
      }));
    });

    it('DENY: discontinuing a prescription without discontinuedBy', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp()
      }));
    });

    it('DENY: a nurse discontinuing a prescription', async () => {
      const db = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'nurse_amy'
      }));
    });

    it('ALLOW: a correction by the author', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_corr_ok'), {
        authorId: 'dr_smith',
        body: 'Corrected note body',
        status: 'draft',
        createdAt: serverTimestamp(),
        correctsId: 'note_smith'
      }));
    });

    it('ALLOW: a patient logging yesterday’s reading', async () => {
      const db = testEnv.authenticatedContext('patient_user_a').firestore();
      const yesterday = Timestamp.fromDate(new Date(Date.now() - 86400000));
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_yesterday'), {
        authorId: 'patient_user_a',
        source: 'patient',
        recordedAt: yesterday,
        createdAt: serverTimestamp(),
        systolic: 118,
        diastolic: 78
      }));
    });

    it('ALLOW: a glucose-only reading (e.g. 45 mg/dL, \'random\')', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_glucose_only'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        glucoseMgDl: 45,
        glucoseContext: 'random'
      }));
    });

    it('ALLOW: an abnormal but plausible clinic reading: systolic 70, diastolic 40, SpO₂ 85, consciousness \'V\', onOxygen: true', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertSucceeds(setDoc(doc(db, 'organizations/clinic_a/patients/patient_A/vitals/vital_abnormal'), {
        authorId: 'dr_smith',
        source: 'clinic',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        systolic: 70,
        diastolic: 40,
        spo2: 85,
        consciousness: 'V',
        onOxygen: true
      }));
    });

    it('ALLOW: a clinician discontinuing another clinician’s prescription', async () => {
      const db = testEnv.authenticatedContext('dr_brown').firestore();
      await assertSucceeds(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1'), {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'dr_brown'
      }));
    });

    it('ALLOW: a batch that discontinues prescription X and creates its correction with correctsId: X', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const batch = writeBatch(db);
      const origRef = doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1');
      const corrRef = doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1_corr');

      batch.update(origRef, {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'dr_smith'
      });

      batch.set(corrRef, {
        authorId: 'dr_smith',
        medication: 'Amoxicillin 250mg',
        dose: '250mg',
        route: 'PO',
        frequency: 'TID x 10d',
        status: 'active',
        createdAt: serverTimestamp(),
        correctsId: 'rx_1'
      });

      await assertSucceeds(batch.commit());
    });

    it('DENY: a correction of an active prescription, created without discontinuing the original', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const corrRef = doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1_corr_alone');

      await assertFails(setDoc(corrRef, {
        authorId: 'dr_smith',
        medication: 'Amoxicillin 250mg',
        dose: '250mg',
        route: 'PO',
        frequency: 'TID x 10d',
        status: 'active',
        createdAt: serverTimestamp(),
        correctsId: 'rx_1'
      }));
    });

    it('ALLOW: a different clinician’s batch discontinues Dr A’s prescription and creates its correction', async () => {
      const db = testEnv.authenticatedContext('dr_brown').firestore();
      const batch = writeBatch(db);
      const origRef = doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1');
      const corrRef = doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_1_corr_by_brown');

      batch.update(origRef, {
        status: 'discontinued',
        discontinuedAt: serverTimestamp(),
        discontinuedBy: 'dr_brown'
      });

      batch.set(corrRef, {
        authorId: 'dr_brown',
        medication: 'Amoxicillin 250mg',
        dose: '250mg',
        route: 'PO',
        frequency: 'TID x 10d',
        status: 'active',
        createdAt: serverTimestamp(),
        correctsId: 'rx_1'
      });

      await assertSucceeds(batch.commit());
    });

    it('DENY: a correction pointing at a prescription that was discontinued earlier, outside this batch', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const corrRef = doc(db, 'organizations/clinic_a/patients/patient_A/prescriptions/rx_corr_earlier');

      await assertFails(setDoc(corrRef, {
        authorId: 'dr_smith',
        medication: 'Amoxicillin 250mg',
        dose: '250mg',
        route: 'PO',
        frequency: 'TID x 10d',
        status: 'active',
        createdAt: serverTimestamp(),
        correctsId: 'rx_discontinued_earlier'
      }));
    });
  });

  describe('Task 6b: Finalised Notes', () => {
    it('ALLOW: author edits own draft', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const draftRef = doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_draft_edit');
      await assertSucceeds(setDoc(draftRef, {
        authorId: 'dr_smith',
        body: 'Original draft body',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      await assertSucceeds(updateDoc(draftRef, {
        body: 'Updated draft body'
      }));
    });

    it('DENY: another team member reads someone’s draft', async () => {
      const dbSmith = testEnv.authenticatedContext('dr_smith').firestore();
      const draftRef = doc(dbSmith, 'organizations/clinic_a/patients/patient_A/notes/note_smith_draft');
      await assertSucceeds(setDoc(draftRef, {
        authorId: 'dr_smith',
        body: 'Smith private draft',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      const dbAmy = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(getDoc(doc(dbAmy, 'organizations/clinic_a/patients/patient_A/notes/note_smith_draft')));
    });

    it('DENY: patient reads a draft', async () => {
      const dbPatient = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertFails(getDoc(doc(dbPatient, 'organizations/clinic_a/patients/patient_A/notes/note_removed_clinician')));
    });

    it('ALLOW: patient reads a final note', async () => {
      const dbPatient = testEnv.authenticatedContext('patient_user_a').firestore();
      await assertSucceeds(getDoc(doc(dbPatient, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
    });

    it('ALLOW: patient lists notes filtered to status == \'final\'', async () => {
      const dbPatient = testEnv.authenticatedContext('patient_user_a').firestore();
      const notesCol = collection(dbPatient, 'organizations/clinic_a/patients/patient_A/notes');
      const q = query(notesCol, where('status', '==', 'final'));
      await assertSucceeds(getDocs(q));
    });

    it('DENY: patient lists notes unfiltered', async () => {
      const dbPatient = testEnv.authenticatedContext('patient_user_a').firestore();
      const notesCol = collection(dbPatient, 'organizations/clinic_a/patients/patient_A/notes');
      await assertFails(getDocs(notesCol));
    });

    it('ALLOW: a care-team member lists notes with where(\'status\', \'==\', \'final\')', async () => {
      const dbAmy = testEnv.authenticatedContext('nurse_amy').firestore();
      const notesCol = collection(dbAmy, 'organizations/clinic_a/patients/patient_A/notes');
      const q = query(notesCol, where('status', '==', 'final'));
      await assertSucceeds(getDocs(q));
    });

    it('ALLOW: a care-team member lists their own drafts with where(\'authorId\', \'==\', uid) and where(\'status\', \'==\', \'draft\')', async () => {
      const dbSmith = testEnv.authenticatedContext('dr_smith').firestore();
      const notesCol = collection(dbSmith, 'organizations/clinic_a/patients/patient_A/notes');
      const q = query(notesCol, where('authorId', '==', 'dr_smith'), where('status', '==', 'draft'));
      await assertSucceeds(getDocs(q));
    });

    it('DENY: a care-team member lists notes unfiltered', async () => {
      const dbSmith = testEnv.authenticatedContext('dr_smith').firestore();
      const notesCol = collection(dbSmith, 'organizations/clinic_a/patients/patient_A/notes');
      await assertFails(getDocs(notesCol));
    });

    it('ALLOW: finalise by author', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const noteRef = doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_to_finalise');
      await assertSucceeds(setDoc(noteRef, {
        authorId: 'dr_smith',
        body: 'Draft before finalisation',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      await assertSucceeds(updateDoc(noteRef, {
        status: 'final',
        finalisedAt: serverTimestamp()
      }));
    });

    it('DENY: finalise by someone else', async () => {
      const dbSmith = testEnv.authenticatedContext('dr_smith').firestore();
      const noteRef = doc(dbSmith, 'organizations/clinic_a/patients/patient_A/notes/note_to_finalise_by_other');
      await assertSucceeds(setDoc(noteRef, {
        authorId: 'dr_smith',
        body: 'Smith draft note',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      const dbAmy = testEnv.authenticatedContext('nurse_amy').firestore();
      await assertFails(updateDoc(doc(dbAmy, 'organizations/clinic_a/patients/patient_A/notes/note_to_finalise_by_other'), {
        status: 'final',
        finalisedAt: serverTimestamp()
      }));
    });

    it('DENY: edit after final', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(updateDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith'), {
        body: 'Attempt to edit already finalised note'
      }));
    });

    it('ALLOW: delete own draft', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const noteRef = doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_to_delete');
      await assertSucceeds(setDoc(noteRef, {
        authorId: 'dr_smith',
        body: 'Draft to be deleted',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      await assertSucceeds(deleteDoc(noteRef));
    });

    it('DENY: delete a final note', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      await assertFails(deleteDoc(doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_smith')));
    });

    it('DENY: correction pointing at a draft', async () => {
      const db = testEnv.authenticatedContext('dr_smith').firestore();
      const draftRef = doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_draft_target');
      await assertSucceeds(setDoc(draftRef, {
        authorId: 'dr_smith',
        body: 'A draft note',
        status: 'draft',
        createdAt: serverTimestamp()
      }));
      const corrRef = doc(db, 'organizations/clinic_a/patients/patient_A/notes/note_corr_to_draft');
      await assertFails(setDoc(corrRef, {
        authorId: 'dr_smith',
        body: 'Correction targeting draft',
        status: 'draft',
        createdAt: serverTimestamp(),
        correctsId: 'note_draft_target'
      }));
    });
  });
});
