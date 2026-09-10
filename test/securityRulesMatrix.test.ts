import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AccessControlEngine, DatabaseState } from '../src/security/accessControl';

describe('CarePlus v2 Security Rules Test Matrix', () => {
  let db: DatabaseState;
  let engine: AccessControlEngine;

  beforeEach(() => {
    db = {
      users: {
        admin_1: { uid: 'admin_1', role: 'admin', displayName: 'Admin One', phone: '111-111-1111' },
        dr_smith: { uid: 'dr_smith', role: 'clinician', displayName: 'Dr. Smith', phone: '222-222-2222' },
        dr_jones: { uid: 'dr_jones', role: 'clinician', displayName: 'Dr. Jones', phone: '333-333-3333' },
        nurse_amy: { uid: 'nurse_amy', role: 'nurse', displayName: 'Nurse Amy', phone: '444-444-4444' },
        nurse_bob: { uid: 'nurse_bob', role: 'nurse', displayName: 'Nurse Bob', phone: '555-555-5555' },
        dr_removed: { uid: 'dr_removed', role: 'clinician', displayName: 'Dr. Removed', phone: '666-666-6666' },
        patient_user_a: { uid: 'patient_user_a', role: 'patient', displayName: 'Alice Patient', phone: '777-777-7777' },
        patient_user_b: { uid: 'patient_user_b', role: 'patient', displayName: 'Bob Patient', phone: '888-888-8888' },
        unassigned_staff: { uid: 'unassigned_staff', role: 'clinician', displayName: 'Dr. Unassigned', phone: '999-999-9999' }
      },
      patients: {
        patient_A: {
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
        },
        patient_B: {
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
        }
      },
      careTeams: {
        patient_A_dr_smith: {
          patientId: 'patient_A',
          userId: 'dr_smith',
          role: 'clinician',
          status: 'active'
        },
        patient_A_nurse_amy: {
          patientId: 'patient_A',
          userId: 'nurse_amy',
          role: 'nurse',
          status: 'active'
        },
        patient_A_dr_removed: {
          patientId: 'patient_A',
          userId: 'dr_removed',
          role: 'clinician',
          status: 'removed',
          removedAt: '2026-02-01T00:00:00Z'
        },
        patient_B_dr_jones: {
          patientId: 'patient_B',
          userId: 'dr_jones',
          role: 'clinician',
          status: 'active'
        },
        patient_B_nurse_bob: {
          patientId: 'patient_B',
          userId: 'nurse_bob',
          role: 'nurse',
          status: 'active'
        }
      },
      notes: {
        note_smith: {
          id: 'note_smith',
          patientId: 'patient_A',
          authorId: 'dr_smith',
          content: 'Initial assessment',
          createdAt: '2026-01-10T00:00:00Z'
        },
        note_removed_clinician: {
          id: 'note_removed_clinician',
          patientId: 'patient_A',
          authorId: 'dr_removed',
          content: 'Old note from removed clinician',
          createdAt: '2026-01-05T00:00:00Z'
        }
      },
      vitals: {
        vital_1: {
          id: 'vital_1',
          patientId: 'patient_A',
          authorId: 'dr_smith',
          source: 'clinic',
          heartRate: 72,
          createdAt: '2026-01-10T00:00:00Z'
        }
      },
      prescriptions: {
        rx_1: {
          id: 'rx_1',
          patientId: 'patient_A',
          authorId: 'dr_smith',
          medication: 'Amoxicillin 500mg',
          dosage: 'TID x 10d',
          createdAt: '2026-01-10T00:00:00Z'
        }
      }
    };
    engine = new AccessControlEngine(db);
  });

  // ========================================================
  // REQUIREMENT 7: ALL ALLOWED CASES IN THE PERMITTED MATRIX
  // ========================================================
  describe('Permitted Action Matrix (ALLOWED Cases)', () => {
    it('ALLOW: admin can get and list patients', () => {
      assert.equal(engine.canGetPatient('patient_A', 'admin_1'), true);
      assert.equal(engine.canListPatients('admin_1'), true);
    });

    it('ALLOW: admin can create patient with only valid identity fields', () => {
      const validPatient = {
        id: 'patient_c',
        mrn: 'MRN-003',
        firstName: 'Charlie',
        lastName: 'Brown',
        dob: '1975-03-10',
        gender: 'male',
        email: 'charlie@example.com',
        phone: '555-0199',
        linkedUserId: 'patient_user_c',
        createdAt: '2026-03-01T00:00:00Z'
      };
      assert.equal(engine.canCreatePatient(validPatient, 'admin_1'), true);
    });

    it('ALLOW: active clinician on care team can get and update patient', () => {
      assert.equal(engine.canGetPatient('patient_A', 'dr_smith'), true);
      assert.equal(
        engine.canUpdatePatient('patient_A', db.patients.patient_A, { phone: '111-222-3333' }, 'dr_smith'),
        true
      );
    });

    it('ALLOW: active nurse on care team can get and update patient', () => {
      assert.equal(engine.canGetPatient('patient_A', 'nurse_amy'), true);
      assert.equal(
        engine.canUpdatePatient('patient_A', db.patients.patient_A, { phone: '111-222-3333' }, 'nurse_amy'),
        true
      );
    });

    it('ALLOW: linked patient can get own patient record', () => {
      assert.equal(engine.canGetPatient('patient_A', 'patient_user_a'), true);
    });

    it('ALLOW: linked patient can update only phone and email', () => {
      const updated = { phone: '999-999-9999', email: 'alice_new@example.com' };
      assert.equal(
        engine.canUpdatePatient('patient_A', db.patients.patient_A, updated, 'patient_user_a'),
        true
      );
    });

    it('ALLOW: admin, active team member, and linked patient can read care_teams', () => {
      assert.equal(engine.canReadCareTeam('patient_A', 'admin_1'), true);
      assert.equal(engine.canReadCareTeam('patient_A', 'dr_smith'), true);
      assert.equal(engine.canReadCareTeam('patient_A', 'nurse_amy'), true);
      assert.equal(engine.canReadCareTeam('patient_A', 'patient_user_a'), true);
    });

    it('ALLOW: active care team members and linked patient can read chart (notes, vitals, prescriptions)', () => {
      assert.equal(engine.canReadChart('patient_A', 'dr_smith'), true);
      assert.equal(engine.canReadChart('patient_A', 'nurse_amy'), true);
      assert.equal(engine.canReadChart('patient_A', 'patient_user_a'), true);
    });

    it('ALLOW: active care team member creates note with self as author', () => {
      assert.equal(
        engine.canCreateNote('patient_A', { authorId: 'dr_smith' }, 'dr_smith'),
        true
      );
    });

    it('ALLOW: note author who is still active care-team member can update note', () => {
      assert.equal(
        engine.canUpdateNote('patient_A', db.notes.note_smith, { authorId: 'dr_smith' }, 'dr_smith'),
        true
      );
    });

    it('ALLOW: patient adds vitals with source=patient and self as author', () => {
      assert.equal(
        engine.canCreateVital('patient_A', { authorId: 'patient_user_a', source: 'patient' }, 'patient_user_a'),
        true
      );
    });

    it('ALLOW: staff adds vitals with source=clinic and self as author', () => {
      assert.equal(
        engine.canCreateVital('patient_A', { authorId: 'nurse_amy', source: 'clinic' }, 'nurse_amy'),
        true
      );
    });

    it('ALLOW: vital author still active can update vitals without changing authorId', () => {
      assert.equal(
        engine.canUpdateVital('patient_A', db.vitals.vital_1, { authorId: 'dr_smith' }, 'dr_smith'),
        true
      );
    });

    it('ALLOW: active clinician on team creates prescription', () => {
      assert.equal(
        engine.canCreatePrescription('patient_A', { authorId: 'dr_smith' }, 'dr_smith'),
        true
      );
    });

    it('ALLOW: active clinician on team updates prescription keeping authorId unchanged', () => {
      assert.equal(
        engine.canUpdatePrescription('patient_A', db.prescriptions.rx_1, { authorId: 'dr_smith' }, 'dr_smith'),
        true
      );
    });

    it('ALLOW: user self-updates only displayName and phone on users/{uid}', () => {
      const existing = db.users.dr_smith;
      const update = { displayName: 'Dr. Jane Smith, MD', phone: '222-333-4444' };
      assert.equal(engine.canUpdateUser('dr_smith', existing, update, 'dr_smith'), true);
    });
  });

  // ========================================================
  // REQUIREMENT 7: ALL SPECIFIED DENIED CASES
  // ========================================================
  describe('Specific Denied Cases (Mandated Non-Negotiables)', () => {
    it('DENY 1: removed team member reading or editing the chart', () => {
      // dr_removed was removed from patient_A care team
      assert.equal(engine.canReadChart('patient_A', 'dr_removed'), false);
      assert.equal(
        engine.canUpdateNote('patient_A', db.notes.note_smith, {}, 'dr_removed'),
        false
      );
      assert.equal(
        engine.canCreateNote('patient_A', { authorId: 'dr_removed' }, 'dr_removed'),
        false
      );
    });

    it('DENY 2: nurse on patient A team reading patient B chart', () => {
      // nurse_amy is on patient A, NOT on patient B
      assert.equal(engine.canGetPatient('patient_B', 'nurse_amy'), false);
      assert.equal(engine.canReadChart('patient_B', 'nurse_amy'), false);
    });

    it('DENY 3: unauthenticated access to anything', () => {
      assert.equal(engine.canGetPatient('patient_A', undefined), false);
      assert.equal(engine.canListPatients(undefined), false);
      assert.equal(engine.canReadCareTeam('patient_A', undefined), false);
      assert.equal(engine.canReadChart('patient_A', undefined), false);
      assert.equal(engine.canGetUser('admin_1', undefined), false);
    });

    it('DENY 4: staff member not on the team reading the patient document', () => {
      // unassigned_staff is a clinician in users/{uid}, but not in patient_A care team
      assert.equal(engine.canGetPatient('patient_A', 'unassigned_staff'), false);
      assert.equal(engine.canReadChart('patient_A', 'unassigned_staff'), false);
    });

    it('DENY 5: linked patient changing linkedUserId or mrn', () => {
      // linked patient cannot change linkedUserId
      assert.equal(
        engine.canUpdatePatient(
          'patient_A',
          db.patients.patient_A,
          { linkedUserId: 'attacker_user_id' },
          'patient_user_a'
        ),
        false
      );
      // linked patient cannot change MRN
      assert.equal(
        engine.canUpdatePatient(
          'patient_A',
          db.patients.patient_A,
          { mrn: 'MRN-HACKED' },
          'patient_user_a'
        ),
        false
      );
    });

    it('DENY 6: removed clinician editing their own old note', () => {
      // dr_removed is author of note_removed_clinician, but is now status: removed
      assert.equal(
        engine.canUpdateNote(
          'patient_A',
          db.notes.note_removed_clinician,
          { authorId: 'dr_removed' },
          'dr_removed'
        ),
        false
      );
    });

    it('DENY: admin reading chart (Admin manages accounts and roles. Admin does not get chart access)', () => {
      assert.equal(engine.canReadChart('patient_A', 'admin_1'), false);
    });

    it('DENY: patient creating vital with source=clinic', () => {
      assert.equal(
        engine.canCreateVital('patient_A', { authorId: 'patient_user_a', source: 'clinic' }, 'patient_user_a'),
        false
      );
    });

    it('DENY: staff creating vital with source=patient', () => {
      assert.equal(
        engine.canCreateVital('patient_A', { authorId: 'nurse_amy', source: 'patient' }, 'nurse_amy'),
        false
      );
    });

    it('DENY: nurse creating prescription (clinicians only)', () => {
      assert.equal(
        engine.canCreatePrescription('patient_A', { authorId: 'nurse_amy' }, 'nurse_amy'),
        false
      );
    });

    it('DENY: clinician changing authorId on prescription update', () => {
      assert.equal(
        engine.canUpdatePrescription('patient_A', db.prescriptions.rx_1, { authorId: 'dr_jones' }, 'dr_smith'),
        false
      );
    });

    it('DENY: user changing role or unauthorized fields on users/{uid}', () => {
      const existing = db.users.dr_smith;
      const maliciousUpdate = { role: 'admin' as any };
      assert.equal(engine.canUpdateUser('dr_smith', existing, maliciousUpdate, 'dr_smith'), false);
    });

    it('DENY: deleting records in care_teams', () => {
      assert.equal(engine.canDeleteCareTeam(), false);
    });
  });
});
