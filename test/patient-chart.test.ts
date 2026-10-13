import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { CANONICAL_SEED } from '../src/services/seed.js';
import { getPatientChart } from '../src/services/firestore.js';
import { MockDataService } from '../src/services/mock.js';

const PROJECT_ID = 'careplus-v2-chart-test';

describe('Task 7b: Patient Chart View & Data Service Integration', () => {
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

  async function loadAllCanonicalSeedThroughRules() {
    await testEnv.clearFirestore();
    const loadTime = Date.now();

    // 1. Platform owner creates orgs and first admins
    const ownerDb = testEnv.authenticatedContext('platform_owner', { platformOwner: true }).firestore();
    for (const org of CANONICAL_SEED.organizations) {
      await assertSucceeds(setDoc(doc(ownerDb, 'organizations', org.id), { ...org.data }));
    }
    for (const admin of CANONICAL_SEED.firstAdmins) {
      await assertSucceeds(setDoc(doc(ownerDb, 'users', admin.id), { ...admin.data }));
    }

    // 2. Admins create staff and patient users, patients, and care teams
    for (const staff of CANONICAL_SEED.staffUsers) {
      const adminId = staff.data.orgId === 'clinic_b' ? 'admin_b' : 'admin_1';
      const adminDb = testEnv.authenticatedContext(adminId).firestore();
      await assertSucceeds(setDoc(doc(adminDb, 'users', staff.id), { ...staff.data }));
    }

    const adminDbA = testEnv.authenticatedContext('admin_1').firestore();
    for (const patientUser of CANONICAL_SEED.patientUsers) {
      await assertSucceeds(setDoc(doc(adminDbA, 'users', patientUser.id), { ...patientUser.data }));
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

    // 3. Clinical Vitals loaded through author's authenticated context
    for (const v of CANONICAL_SEED.vitals) {
      const userDb = testEnv.authenticatedContext(v.authorId).firestore();
      const vitalData: any = {
        authorId: v.authorId,
        source: v.source,
        recordedAt: Timestamp.fromMillis(loadTime - v.offsetMs),
        createdAt: serverTimestamp()
      };
      if (v.heartRate !== undefined) vitalData.heartRate = v.heartRate;
      if (v.respRate !== undefined) vitalData.respRate = v.respRate;
      if (v.systolic !== undefined) vitalData.systolic = v.systolic;
      if (v.diastolic !== undefined) vitalData.diastolic = v.diastolic;
      if (v.tempC !== undefined) vitalData.tempC = v.tempC;
      if (v.spo2 !== undefined) vitalData.spo2 = v.spo2;
      if (v.consciousness !== undefined) vitalData.consciousness = v.consciousness;
      if (v.onOxygen !== undefined) vitalData.onOxygen = v.onOxygen;
      if (v.glucoseMgDl !== undefined) vitalData.glucoseMgDl = v.glucoseMgDl;
      if (v.glucoseContext !== undefined) vitalData.glucoseContext = v.glucoseContext;
      if (v.correctsId !== undefined) vitalData.correctsId = v.correctsId;

      await assertSucceeds(setDoc(doc(userDb, `organizations/${v.orgId}/patients/${v.patientId}/vitals`, v.id), vitalData));
    }

    // 4. Clinical Notes loaded through author's authenticated context (draft -> final)
    for (const n of CANONICAL_SEED.notes) {
      const userDb = testEnv.authenticatedContext(n.authorId).firestore();
      const noteDocRef = doc(userDb, `organizations/${n.orgId}/patients/${n.patientId}/notes`, n.id);

      // Always create as draft first
      const draftPayload: any = {
        authorId: n.authorId,
        body: n.body,
        status: 'draft',
        createdAt: serverTimestamp()
      };
      if (n.correctsId) draftPayload.correctsId = n.correctsId;

      await assertSucceeds(setDoc(noteDocRef, draftPayload));

      // If final, finalise via author update
      if (n.status === 'final') {
        await assertSucceeds(updateDoc(noteDocRef, {
          status: 'final',
          finalisedAt: serverTimestamp()
        }));
      }
    }

    // 5. Prescriptions loaded through clinician's authenticated context
    const drSmithDb = testEnv.authenticatedContext('dr_smith').firestore();

    // Standard active prescriptions
    const rxActive1 = CANONICAL_SEED.prescriptions.find((p) => p.id === 'rx_alice_active_1')!;
    await assertSucceeds(setDoc(doc(drSmithDb, `organizations/${rxActive1.orgId}/patients/${rxActive1.patientId}/prescriptions`, rxActive1.id), {
      authorId: rxActive1.authorId,
      medication: rxActive1.medication,
      dose: rxActive1.dose,
      route: rxActive1.route,
      frequency: rxActive1.frequency,
      status: 'active',
      createdAt: serverTimestamp()
    }));

    const rxActive2 = CANONICAL_SEED.prescriptions.find((p) => p.id === 'rx_alice_active_2')!;
    await assertSucceeds(setDoc(doc(drSmithDb, `organizations/${rxActive2.orgId}/patients/${rxActive2.patientId}/prescriptions`, rxActive2.id), {
      authorId: rxActive2.authorId,
      medication: rxActive2.medication,
      dose: rxActive2.dose,
      route: rxActive2.route,
      frequency: rxActive2.frequency,
      status: 'active',
      createdAt: serverTimestamp()
    }));

    // Discontinued prescription (created as active, then discontinued)
    const rxDisc = CANONICAL_SEED.prescriptions.find((p) => p.id === 'rx_alice_discontinued')!;
    const rxDiscRef = doc(drSmithDb, `organizations/${rxDisc.orgId}/patients/${rxDisc.patientId}/prescriptions`, rxDisc.id);
    await assertSucceeds(setDoc(rxDiscRef, {
      authorId: rxDisc.authorId,
      medication: rxDisc.medication,
      dose: rxDisc.dose,
      route: rxDisc.route,
      frequency: rxDisc.frequency,
      status: 'active',
      createdAt: serverTimestamp()
    }));
    await assertSucceeds(updateDoc(rxDiscRef, {
      status: 'discontinued',
      discontinuedBy: rxDisc.authorId,
      discontinuedAt: serverTimestamp()
    }));

    // Corrected prescription pair (atomic batch: discontinue original + create correction)
    const rxCorrOrig = CANONICAL_SEED.prescriptions.find((p) => p.id === 'rx_alice_corr_orig')!;
    const rxCorrNew = CANONICAL_SEED.prescriptions.find((p) => p.id === 'rx_alice_corr_new')!;
    const rxCorrOrigRef = doc(drSmithDb, `organizations/${rxCorrOrig.orgId}/patients/${rxCorrOrig.patientId}/prescriptions`, rxCorrOrig.id);
    const rxCorrNewRef = doc(drSmithDb, `organizations/${rxCorrNew.orgId}/patients/${rxCorrNew.patientId}/prescriptions`, rxCorrNew.id);

    // Initial creation of original prescription
    await assertSucceeds(setDoc(rxCorrOrigRef, {
      authorId: rxCorrOrig.authorId,
      medication: rxCorrOrig.medication,
      dose: rxCorrOrig.dose,
      route: rxCorrOrig.route,
      frequency: rxCorrOrig.frequency,
      status: 'active',
      createdAt: serverTimestamp()
    }));

    // Discontinue original and create correction together in one atomic batch
    const batch = writeBatch(drSmithDb);
    batch.update(rxCorrOrigRef, {
      status: 'discontinued',
      discontinuedBy: 'dr_smith',
      discontinuedAt: serverTimestamp()
    });
    batch.set(rxCorrNewRef, {
      authorId: 'dr_smith',
      medication: rxCorrNew.medication,
      dose: rxCorrNew.dose,
      route: rxCorrNew.route,
      frequency: rxCorrNew.frequency,
      status: 'active',
      createdAt: serverTimestamp(),
      correctsId: rxCorrOrig.id
    });
    await assertSucceeds(batch.commit());
  }

  beforeEach(async () => {
    await loadAllCanonicalSeedThroughRules();
  });

  it('every seed record loads through the rules', async () => {
    // Verified by assertSucceeds throughout loadAllCanonicalSeedThroughRules() in beforeEach
    assert.ok(true);
  });

  it('dr_smith gets final notes plus his own draft, not nurse_amy’s draft', async () => {
    const drSmithDb = testEnv.authenticatedContext('dr_smith').firestore();
    const chart = await getPatientChart(drSmithDb, 'clinic_a', 'patient_A', 'dr_smith');

    assert.equal(chart.patient.id, 'patient_A');
    assert.equal(chart.patient.mrn, 'MRN-001');

    // Final notes are visible
    assert.ok(chart.finalNotes.length >= 3);
    assert.ok(chart.finalNotes.every((n) => n.status === 'final'));
    assert.ok(chart.finalNotes.some((n) => n.id === 'note_alice_final_1'));
    assert.ok(chart.finalNotes.some((n) => n.id === 'note_alice_final_2'));

    // Dr. Smith sees his own draft
    assert.ok(chart.myDrafts.some((n) => n.id === 'note_alice_draft_smith'));
    assert.ok(chart.myDrafts.every((n) => n.authorId === 'dr_smith' && n.status === 'draft'));

    // Dr. Smith CANNOT see Nurse Amy's draft
    assert.ok(!chart.myDrafts.some((n) => n.id === 'note_alice_draft_amy'));
    assert.ok(!chart.finalNotes.some((n) => n.id === 'note_alice_draft_amy'));
  });

  it('nurse_amy gets her own draft, not dr_smith’s', async () => {
    const nurseAmyDb = testEnv.authenticatedContext('nurse_amy').firestore();
    const chart = await getPatientChart(nurseAmyDb, 'clinic_a', 'patient_A', 'nurse_amy');

    // Nurse Amy sees her own draft
    assert.ok(chart.myDrafts.some((n) => n.id === 'note_alice_draft_amy'));
    assert.ok(chart.myDrafts.every((n) => n.authorId === 'nurse_amy' && n.status === 'draft'));

    // Nurse Amy CANNOT see Dr. Smith's draft
    assert.ok(!chart.myDrafts.some((n) => n.id === 'note_alice_draft_smith'));
    assert.ok(!chart.finalNotes.some((n) => n.id === 'note_alice_draft_smith'));
  });

  it('vitals include the patient-reported reading', async () => {
    const drSmithDb = testEnv.authenticatedContext('dr_smith').firestore();
    const chart = await getPatientChart(drSmithDb, 'clinic_a', 'patient_A', 'dr_smith');

    const patientBpVital = chart.vitals.find((v) => v.id === 'vital_alice_patient_bp');
    assert.ok(patientBpVital, 'Patient-reported vital must be present');
    assert.equal(patientBpVital.authorId, 'alice');
    assert.equal(patientBpVital.source, 'patient');
    assert.equal(patientBpVital.systolic, 124);
    assert.equal(patientBpVital.diastolic, 82);
  });

  it('a removed team member and an unassigned clinician are denied', async () => {
    const drRemovedDb = testEnv.authenticatedContext('dr_removed').firestore();
    await assert.rejects(
      getPatientChart(drRemovedDb, 'clinic_a', 'patient_A', 'dr_removed'),
      (err: any) => {
        return err.message.includes('permission') || err.message.includes('PERMISSION_DENIED') || err.code === 7;
      }
    );

    const drUnassignedDb = testEnv.authenticatedContext('dr_unassigned').firestore();
    await assert.rejects(
      getPatientChart(drUnassignedDb, 'clinic_a', 'patient_A', 'dr_unassigned'),
      (err: any) => {
        return err.message.includes('permission') || err.message.includes('PERMISSION_DENIED') || err.code === 7;
      }
    );
  });

  it('mock getPatientChart works for any seed patient and applies the same care-team check', async () => {
    const mock = new MockDataService();

    // Alice on patient_A (dr_smith is on care team)
    const smithChart = await mock.getPatientChart('clinic_a', 'patient_A', 'dr_smith');
    assert.equal(smithChart.patient.id, 'patient_A');
    assert.ok(smithChart.myDrafts.some((d) => d.id === 'note_alice_draft_smith'));
    assert.ok(!smithChart.myDrafts.some((d) => d.id === 'note_alice_draft_amy'));

    // Amy on patient_A (nurse_amy is on care team)
    const amyChart = await mock.getPatientChart('clinic_a', 'patient_A', 'nurse_amy');
    assert.ok(amyChart.myDrafts.some((d) => d.id === 'note_alice_draft_amy'));
    assert.ok(!amyChart.myDrafts.some((d) => d.id === 'note_alice_draft_smith'));

    // Bob on patient_B (dr_smith and nurse_amy are on patient_B)
    const bobChart = await mock.getPatientChart('clinic_a', 'patient_B', 'dr_smith');
    assert.equal(bobChart.patient.id, 'patient_B');

    // Unassigned clinician denied on patient_A
    await assert.rejects(
      mock.getPatientChart('clinic_a', 'patient_A', 'dr_unassigned'),
      /Permission denied: You're not on this patient's care team/
    );

    // Removed clinician denied on patient_A
    await assert.rejects(
      mock.getPatientChart('clinic_a', 'patient_A', 'dr_removed'),
      /Permission denied: You're not on this patient's care team/
    );
  });
});
