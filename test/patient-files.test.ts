import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, writeBatch } from 'firebase/firestore';
import { searchPatientFiles, createPatientFile, addPatientId } from '../src/services/patientFiles';
import type { NewPatientInput } from '../src/services/patientMatching';

const PROJECT_ID = 'careplus-v2-patient-files-test';

const ROBERT: NewPatientInput = {
  firstName: 'Robert',
  lastName: 'Singh',
  dob: '1980-03-14',
  gender: 'male',
  email: 'robert@example.com',
  phone: '868-555-0101',
};

describe('Task 8: Admin patient files (service + rules, Firestore emulator)', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8088 },
    });
  });

  after(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'organizations/clinic_a'), { name: 'Clinic A', firstAdminUid: 'admin_1', createdAt: '2026-01-01T00:00:00Z' });
      await setDoc(doc(db, 'organizations/clinic_b'), { name: 'Clinic B', firstAdminUid: 'admin_b', createdAt: '2026-01-01T00:00:00Z' });
      await setDoc(doc(db, 'users/admin_1'), { role: 'admin', orgId: 'clinic_a', displayName: 'Admin A' });
      await setDoc(doc(db, 'users/admin_b'), { role: 'admin', orgId: 'clinic_b', displayName: 'Admin B' });
      await setDoc(doc(db, 'users/dr_smith'), { role: 'clinician', orgId: 'clinic_a', displayName: 'Dr. Smith' });
      await setDoc(doc(db, 'users/nurse_amy'), { role: 'nurse', orgId: 'clinic_a', displayName: 'Nurse Amy' });
      await setDoc(doc(db, 'users/robert_user'), { role: 'patient', displayName: 'Robert Singh' });
    });
  });

  const adminA = () => (testEnv.authenticatedContext('admin_1').firestore() as any);

  async function readAsOwner(path: string) {
    let data: any = null;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), path));
      data = snap.exists() ? snap.data() : null;
    });
    return data;
  }

  async function putCareTeam(patientId: string, userId: string, role: 'clinician' | 'nurse') {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `organizations/clinic_a/care_teams/${patientId}_${userId}`), {
        patientId, userId, role, displayName: userId, status: 'active', createdAt: '2026-01-01T00:00:00Z',
      });
    });
  }

  describe('ALLOWED', () => {
    it('admin creates files with sequential MRNs, registered in the same transaction', async () => {
      const first = await createPatientFile(adminA(), 'clinic_a', ROBERT);
      const second = await createPatientFile(adminA(), 'clinic_a', { ...ROBERT, firstName: 'Anil', lastName: 'Persad' });
      assert.equal(first.mrn, 'MRN-000001');
      assert.equal(second.mrn, 'MRN-000002');
      assert.equal(first.orgName, 'Clinic A');
      assert.deepEqual(await readAsOwner('organizations/clinic_a/counters/mrn'), { last: 2 });
      assert.equal((await readAsOwner('organizations/clinic_a/mrn_registry/MRN-000001')).patientId, first.id);
      assert.equal((await readAsOwner('organizations/clinic_a/mrn_registry/MRN-000002')).patientId, second.id);
    });

    it('MRN counters are per organisation', async () => {
      await createPatientFile(adminA(), 'clinic_a', ROBERT);
      const b = await createPatientFile((testEnv.authenticatedContext('admin_b').firestore() as any), 'clinic_b', ROBERT);
      assert.equal(b.mrn, 'MRN-000001');
    });

    it('two admins creating at the same moment still get different MRNs', async () => {
      const [x, y] = await Promise.all([
        createPatientFile(adminA(), 'clinic_a', ROBERT),
        createPatientFile(adminA(), 'clinic_a', { ...ROBERT, firstName: 'Anil', lastName: 'Persad' }),
      ]);
      assert.deepEqual([x.mrn, y.mrn].sort(), ['MRN-000001', 'MRN-000002']);
    });

    it('an ID already on file returns that file to reuse, even under another spelling', async () => {
      const original = await createPatientFile(adminA(), 'clinic_a', { ...ROBERT, idType: 'national_id', idNumber: '19800314-001' });
      assert.equal(original.idNumber, '19800314001');
      const decision = await searchPatientFiles(adminA(), 'clinic_a', {
        firstName: 'Bobby', lastName: 'Singh', dob: '1980-03-14', idType: 'national_id', idNumber: '19800314001',
      });
      assert.equal(decision.kind, 'reuse-by-id');
      assert.equal(decision.kind === 'reuse-by-id' && decision.patient.id, original.id);
    });

    it('Robert Singh x2: blocked until the existing file has an ID, then a different ID creates a second file', async () => {
      const existing = await createPatientFile(adminA(), 'clinic_a', ROBERT);
      const newcomer = { ...ROBERT, idType: 'national_id' as const, idNumber: 'NEW0002' };

      const blocked = await searchPatientFiles(adminA(), 'clinic_a', newcomer);
      assert.equal(blocked.kind, 'blocked-existing-needs-id');
      await assert.rejects(createPatientFile(adminA(), 'clinic_a', newcomer), /cannot be created/);

      const updated = await addPatientId(adminA(), 'clinic_a', existing.id, 'national_id', 'old 0001');
      assert.equal(updated.idNumber, 'OLD0001');

      const allowed = await searchPatientFiles(adminA(), 'clinic_a', newcomer);
      assert.equal(allowed.kind, 'can-create');
      const second = await createPatientFile(adminA(), 'clinic_a', newcomer);
      assert.equal(second.mrn, 'MRN-000002');

      const sameAsFirst = await searchPatientFiles(adminA(), 'clinic_a', { ...ROBERT, idType: 'national_id', idNumber: 'OLD0001' });
      assert.equal(sameAsFirst.kind, 'reuse-by-id');
    });

    it('a care-team clinician and the linked patient can see the ID on the file', async () => {
      const file = await createPatientFile(adminA(), 'clinic_a', { ...ROBERT, idType: 'drivers_permit', idNumber: 'DP12345' });
      await putCareTeam(file.id, 'dr_smith', 'clinician');
      const snap = await assertSucceeds(getDoc(doc((testEnv.authenticatedContext('dr_smith').firestore() as any), `organizations/clinic_a/patients/${file.id}`)));
      assert.equal(snap.data()?.idNumber, 'DP12345');

      await assertSucceeds(updateDoc(doc(adminA(), `organizations/clinic_a/patients/${file.id}`), { linkedUserId: 'robert_user' }));
      const own = await assertSucceeds(getDoc(doc((testEnv.authenticatedContext('robert_user').firestore() as any), `organizations/clinic_a/patients/${file.id}`)));
      assert.equal(own.data()?.idType, 'drivers_permit');
    });
  });

  describe('DENIED', () => {
    function directCreate(
      db: any,
      patientId: string,
      mrn: string,
      extra: Record<string, unknown> = {},
      opts: { registryFor?: string; idRegistry?: boolean } = {}
    ) {
      const createdAt = '2026-11-15T00:00:00Z';
      const batch = writeBatch(db);
      batch.set(doc(db, `organizations/clinic_a/patients/${patientId}`), {
        id: patientId, mrn, firstName: 'Direct', lastName: 'Write', dob: '1990-01-01', gender: 'other',
        email: '', phone: '', orgName: 'Clinic A', createdAt, ...extra,
      });
      batch.set(doc(db, `organizations/clinic_a/mrn_registry/${mrn}`), { patientId: opts.registryFor ?? patientId, createdAt });
      if (opts.idRegistry) {
        batch.set(doc(db, `organizations/clinic_a/id_registry/${extra.idType}_${extra.idNumber}`), { patientId, createdAt });
      }
      return batch.commit();
    }

    it('control: correct direct writes (file + registries together) are allowed', async () => {
      await assertSucceeds(directCreate(adminA(), 'p_ok', 'MRN-900001'));
      await assertSucceeds(directCreate(adminA(), 'p_ok_id', 'MRN-900011', { idType: 'national_id', idNumber: 'OK123' }, { idRegistry: true }));
    });

    it('admin creates a file without registering its MRN', async () => {
      await assertFails(setDoc(doc(adminA(), 'organizations/clinic_a/patients/p_noreg'), {
        id: 'p_noreg', mrn: 'MRN-900002', firstName: 'No', lastName: 'Registry', dob: '1990-01-01', gender: 'other',
        email: '', phone: '', orgName: 'Clinic A', createdAt: '2026-11-15T00:00:00Z',
      }));
    });

    it('admin gives a second file an MRN that is already taken', async () => {
      const first = await createPatientFile(adminA(), 'clinic_a', ROBERT);
      await assertFails(directCreate(adminA(), 'p_dup', first.mrn));
    });

    it('MRN registry entry pointing at a different file', async () => {
      await assertFails(directCreate(adminA(), 'p_mismatch', 'MRN-900003', {}, { registryFor: 'someone_else' }));
    });

    it('MRN with characters that could break the registry path', async () => {
      await assertFails(directCreate(adminA(), 'p_badmrn', 'MRN 900009'));
    });

    it('file with an ID but no ID registry entry', async () => {
      await assertFails(directCreate(adminA(), 'p_idnoreg', 'MRN-900004', { idType: 'national_id', idNumber: 'ABC123' }));
    });

    it('file with an ID already registered to another file', async () => {
      const first = await createPatientFile(adminA(), 'clinic_a', { ...ROBERT, idType: 'national_id', idNumber: 'TAKEN1' });
      const db = adminA();
      const batch = writeBatch(db);
      batch.set(doc(db, 'organizations/clinic_a/patients/p_idtaken'), {
        id: 'p_idtaken', mrn: 'MRN-900005', firstName: 'Copy', lastName: 'Cat', dob: '1990-01-01', gender: 'other',
        email: '', phone: '', orgName: 'Clinic A', createdAt: '2026-11-15T00:00:00Z', idType: 'national_id', idNumber: 'TAKEN1',
      });
      batch.set(doc(db, 'organizations/clinic_a/mrn_registry/MRN-900005'), { patientId: 'p_idtaken', createdAt: '2026-11-15T00:00:00Z' });
      batch.set(doc(db, 'organizations/clinic_a/id_registry/national_id_TAKEN1'), { patientId: 'p_idtaken', createdAt: '2026-11-15T00:00:00Z' });
      await assertFails(batch.commit());
      assert.equal((await readAsOwner('organizations/clinic_a/id_registry/national_id_TAKEN1')).patientId, first.id);
    });

    it('file with an un-normalised or unknown ID type', async () => {
      await assertFails(directCreate(adminA(), 'p_lower', 'MRN-900006', { idType: 'national_id', idNumber: 'abc-123' }, { idRegistry: true }));
      await assertFails(directCreate(adminA(), 'p_passport', 'MRN-900007', { idType: 'passport', idNumber: 'P123456' }, { idRegistry: true }));
      await assertFails(directCreate(adminA(), 'p_halfid', 'MRN-900008', { idType: 'national_id' }));
    });

    it('admin changes or removes an MRN once assigned', async () => {
      const file = await createPatientFile(adminA(), 'clinic_a', ROBERT);
      const ref = doc(adminA(), `organizations/clinic_a/patients/${file.id}`);
      await assertFails(updateDoc(ref, { mrn: 'MRN-000999' }));
      await assertFails(updateDoc(ref, { mrn: deleteField() }));
    });

    it('admin changes or removes an ID once set', async () => {
      const file = await createPatientFile(adminA(), 'clinic_a', { ...ROBERT, idType: 'national_id', idNumber: 'LOCK1' });
      const ref = doc(adminA(), `organizations/clinic_a/patients/${file.id}`);
      await assertFails(updateDoc(ref, { idNumber: 'LOCK2' }));
      await assertFails(updateDoc(ref, { idType: 'drivers_permit' }));
      await assertFails(updateDoc(ref, { idType: deleteField(), idNumber: deleteField() }));
      await assert.rejects(addPatientId(adminA(), 'clinic_a', file.id, 'national_id', 'LOCK3'), /cannot be changed/);
    });

    it('admin adds an ID to a file without registering it', async () => {
      const file = await createPatientFile(adminA(), 'clinic_a', ROBERT);
      await assertFails(updateDoc(doc(adminA(), `organizations/clinic_a/patients/${file.id}`), { idType: 'national_id', idNumber: 'SNEAK1' }));
    });

    it('care-team clinician or linked patient adds an ID', async () => {
      const file = await createPatientFile(adminA(), 'clinic_a', ROBERT);
      await putCareTeam(file.id, 'dr_smith', 'clinician');
      const dr = (testEnv.authenticatedContext('dr_smith').firestore() as any);
      await assertFails(addPatientId(dr, 'clinic_a', file.id, 'national_id', 'DOC1'));
      const drBatch = writeBatch(dr);
      drBatch.update(doc(dr, `organizations/clinic_a/patients/${file.id}`), { idType: 'national_id', idNumber: 'DOC1' });
      drBatch.set(doc(dr, 'organizations/clinic_a/id_registry/national_id_DOC1'), { patientId: file.id, createdAt: 'x' });
      await assertFails(drBatch.commit());
      await assertSucceeds(updateDoc(doc(adminA(), `organizations/clinic_a/patients/${file.id}`), { linkedUserId: 'robert_user' }));
      await assertFails(addPatientId((testEnv.authenticatedContext('robert_user').firestore() as any), 'clinic_a', file.id, 'national_id', 'SELF1'));
    });

    it('clinician and nurse create or search patient files', async () => {
      for (const uid of ['dr_smith', 'nurse_amy']) {
        const db = (testEnv.authenticatedContext(uid).firestore() as any);
        await assertFails(searchPatientFiles(db, 'clinic_a', ROBERT));
        await assertFails(createPatientFile(db, 'clinic_a', ROBERT));
        await assertFails(directCreate(db, `p_${uid}`, `MRN-91${uid.length}`));
      }
    });

    it('Clinic B admin searches or creates files in Clinic A', async () => {
      const dbB = (testEnv.authenticatedContext('admin_b').firestore() as any);
      await assertFails(searchPatientFiles(dbB, 'clinic_a', ROBERT));
      await assertFails(createPatientFile(dbB, 'clinic_a', ROBERT));
    });

    it('anyone rewinds, skips, deletes or forges the MRN counter', async () => {
      await createPatientFile(adminA(), 'clinic_a', ROBERT); // counter = 1
      const ref = doc(adminA(), 'organizations/clinic_a/counters/mrn');
      await assertFails(setDoc(ref, { last: 0 }));
      await assertFails(setDoc(ref, { last: 3 }));
      await assertFails(deleteDoc(ref));
      await assertFails(setDoc(doc(adminA(), 'organizations/clinic_a/counters/other'), { last: 1 }));
      await assertFails(setDoc(doc((testEnv.authenticatedContext('dr_smith').firestore() as any), 'organizations/clinic_a/counters/mrn'), { last: 2 }));
      await assertFails(setDoc(doc((testEnv.authenticatedContext('admin_b').firestore() as any), 'organizations/clinic_a/counters/mrn'), { last: 2 }));
    });

    it('admin starts a new counter anywhere other than 1', async () => {
      await assertFails(setDoc(doc(adminA(), 'organizations/clinic_a/counters/mrn'), { last: 5 }));
    });

    it('registry entries are never updated or deleted, and clinical staff cannot read them', async () => {
      const file = await createPatientFile(adminA(), 'clinic_a', { ...ROBERT, idType: 'national_id', idNumber: 'REG1' });
      const mrnReg = `organizations/clinic_a/mrn_registry/${file.mrn}`;
      const idReg = 'organizations/clinic_a/id_registry/national_id_REG1';
      await assertFails(setDoc(doc(adminA(), mrnReg), { patientId: 'other', createdAt: 'x' }));
      await assertFails(deleteDoc(doc(adminA(), mrnReg)));
      await assertFails(setDoc(doc(adminA(), idReg), { patientId: 'other', createdAt: 'x' }));
      await assertFails(deleteDoc(doc(adminA(), idReg)));
      await putCareTeam(file.id, 'dr_smith', 'clinician');
      const dr = (testEnv.authenticatedContext('dr_smith').firestore() as any);
      await assertFails(getDoc(doc(dr, mrnReg)));
      await assertFails(getDoc(doc(dr, idReg)));
      await assertFails(getDoc(doc((testEnv.authenticatedContext('admin_b').firestore() as any), mrnReg)));
    });
  });
});
