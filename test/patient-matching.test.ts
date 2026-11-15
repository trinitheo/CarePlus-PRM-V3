import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyNameMatches,
  cleanIdentityInput,
  decidePatientFile,
  formatMrn,
  normaliseIdNumber,
  normaliseName,
  validateIdentityInput,
} from '../src/services/patientMatching';
import type { PatientRecord } from '../src/types';

const TODAY = new Date('2026-11-15T12:00:00Z');

function patient(overrides: Partial<PatientRecord>): PatientRecord {
  return {
    id: 'p',
    mrn: 'MRN-000001',
    firstName: 'Robert',
    lastName: 'Singh',
    dob: '1980-03-14',
    gender: 'male',
    email: '',
    phone: '',
    orgName: 'Clinic A',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Task 8: Patient matching (src/services/patientMatching.ts)', () => {
  describe('normalisation', () => {
    it('names ignore case, accents, apostrophes, hyphens and extra spaces', () => {
      assert.equal(normaliseName('  José '), 'jose');
      assert.equal(normaliseName("O'Brien"), 'obrien');
      assert.equal(normaliseName('Ali-Khan'), 'ali khan');
      assert.equal(normaliseName('Mary   Ann'), 'mary ann');
    });

    it('ID numbers keep only capitals and digits', () => {
      assert.equal(normaliseIdNumber(' ab 123-456 '), 'AB123456');
    });

    it('MRNs are sequential and zero-padded to six digits', () => {
      assert.equal(formatMrn(1), 'MRN-000001');
      assert.equal(formatMrn(42), 'MRN-000042');
      assert.equal(formatMrn(1234567), 'MRN-1234567');
      assert.throws(() => formatMrn(0));
      assert.throws(() => formatMrn(1.5));
    });

    it('cleaning drops an ID type with no number', () => {
      const cleaned = cleanIdentityInput({ firstName: ' Robert ', lastName: 'Singh', dob: '1980-03-14', idType: 'national_id', idNumber: ' ' });
      assert.equal(cleaned.firstName, 'Robert');
      assert.equal('idType' in cleaned, false);
      assert.equal('idNumber' in cleaned, false);
    });
  });

  describe('validation', () => {
    const base = { firstName: 'Robert', lastName: 'Singh', dob: '1980-03-14' };

    it('accepts a valid input, with or without an ID', () => {
      assert.deepEqual(validateIdentityInput(base, TODAY), []);
      assert.deepEqual(validateIdentityInput({ ...base, idType: 'national_id', idNumber: '19800314001' }, TODAY), []);
    });

    it('rejects missing names, impossible or future dates, and half an ID', () => {
      assert.equal(validateIdentityInput({ ...base, firstName: ' ' }, TODAY).length, 1);
      assert.equal(validateIdentityInput({ ...base, dob: '1980-02-30' }, TODAY).length, 1);
      assert.equal(validateIdentityInput({ ...base, dob: '2027-01-01' }, TODAY).length, 1);
      assert.equal(validateIdentityInput({ ...base, idType: 'national_id' }, TODAY).length, 1);
      assert.equal(validateIdentityInput({ ...base, idNumber: '123456' }, TODAY).length, 1);
      assert.equal(validateIdentityInput({ ...base, idType: 'drivers_permit', idNumber: 'AB' }, TODAY).length, 1);
    });
  });

  describe('classifyNameMatches', () => {
    const input = { firstName: 'Robert', lastName: 'Singh', dob: '1980-03-14' };

    it('exact when both names match after normalisation and the DOB is the same', () => {
      const m = classifyNameMatches([patient({ firstName: 'ROBERT', lastName: ' singh' })], input);
      assert.deepEqual(m.map((x) => x.kind), ['exact']);
    });

    it('possible when one name matches, or the names are swapped', () => {
      const m = classifyNameMatches(
        [
          patient({ id: 'a', firstName: 'Rob' }),
          patient({ id: 'b', lastName: 'Singh-Ali' }),
          patient({ id: 'c', firstName: 'Singh', lastName: 'Robert' }),
        ],
        input
      );
      assert.deepEqual(m.map((x) => [x.patient.id, x.kind]), [['a', 'possible'], ['b', 'possible'], ['c', 'possible']]);
    });

    it('ignores a different DOB, or the same DOB with neither name matching', () => {
      const m = classifyNameMatches(
        [patient({ dob: '1980-03-15' }), patient({ firstName: 'Anil', lastName: 'Persad' })],
        input
      );
      assert.deepEqual(m, []);
    });
  });

  describe('decidePatientFile', () => {
    const input = { firstName: 'Robert', lastName: 'Singh', dob: '1980-03-14' };

    it('an ID already on file means reuse that file, whatever the name says', () => {
      const holder = patient({ id: 'holder', firstName: 'Bobby', idType: 'national_id', idNumber: 'X1' });
      const d = decidePatientFile({ ...input, idType: 'national_id', idNumber: 'X1' }, holder, []);
      assert.equal(d.kind, 'reuse-by-id');
    });

    it('same name and DOB on a file with no ID blocks creation until that ID is added', () => {
      const existing = patient({ id: 'old' });
      const d = decidePatientFile({ ...input, idType: 'national_id', idNumber: 'NEW1' }, null, [{ patient: existing, kind: 'exact' }]);
      assert.equal(d.kind, 'blocked-existing-needs-id');
      assert.deepEqual(d.kind === 'blocked-existing-needs-id' && d.patients.map((p) => p.id), ['old']);
    });

    it('same name and DOB on a file with an ID requires the same type of ID from the new person', () => {
      const existing = patient({ id: 'old', idType: 'national_id', idNumber: 'OLD1' });
      const noId = decidePatientFile(input, null, [{ patient: existing, kind: 'exact' }]);
      assert.equal(noId.kind, 'needs-new-id');
      const otherType = decidePatientFile({ ...input, idType: 'drivers_permit', idNumber: 'DP1' }, null, [{ patient: existing, kind: 'exact' }]);
      assert.equal(otherType.kind, 'needs-new-id');
    });

    it('a different ID of the same type means a different person: may create', () => {
      const existing = patient({ id: 'old', idType: 'national_id', idNumber: 'OLD1' });
      const d = decidePatientFile({ ...input, idType: 'national_id', idNumber: 'NEW1' }, null, [{ patient: existing, kind: 'exact' }]);
      assert.equal(d.kind, 'can-create');
      assert.deepEqual(d.kind === 'can-create' && d.sameNameDifferentId.map((p) => p.id), ['old']);
    });

    it('possible matches alone still allow creation, and are passed through for review', () => {
      const d = decidePatientFile(input, null, [{ patient: patient({ id: 'rob', firstName: 'Rob' }), kind: 'possible' }]);
      assert.equal(d.kind, 'can-create');
      assert.deepEqual(d.kind === 'can-create' && d.possible.map((p) => p.id), ['rob']);
    });
  });
});
