import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  supersededIds,
  isStale,
  latestVitals,
  getChartNEWS2HeaderInfo
} from '../src/clinical/chart.js';
import type { VitalRecord } from '../src/types.js';

describe('Task 7b: Chart Logic Unit Tests (src/clinical/chart.ts)', () => {
  const baseTime = Date.parse('2026-10-13T12:00:00Z');

  describe('supersededIds', () => {
    it('returns empty Set when no records have correctsId', () => {
      const records = [
        { id: 'vital_1' },
        { id: 'vital_2' }
      ];
      const result = supersededIds(records);
      assert.equal(result.size, 0);
    });

    it('collects all records referenced by correctsId', () => {
      const records = [
        { id: 'vital_1' },
        { id: 'vital_2', correctsId: 'vital_1' },
        { id: 'note_1' },
        { id: 'note_2', correctsId: 'note_1' },
        { id: 'rx_1' }
      ];
      const result = supersededIds(records);
      assert.equal(result.size, 2);
      assert.ok(result.has('vital_1'));
      assert.ok(result.has('note_1'));
      assert.ok(!result.has('vital_2'));
    });
  });

  describe('isStale (>24 hours)', () => {
    it('returns false for reading less than or equal to 24 hours old', () => {
      const twentyThreeHoursAgo = baseTime - 23 * 60 * 60 * 1000;
      const exactlyTwentyFourHoursAgo = baseTime - 24 * 60 * 60 * 1000;

      assert.equal(isStale(twentyThreeHoursAgo, baseTime), false);
      assert.equal(isStale(exactlyTwentyFourHoursAgo, baseTime), false);
      assert.equal(isStale(new Date(twentyThreeHoursAgo).toISOString(), baseTime), false);
    });

    it('returns true for reading older than 24 hours', () => {
      const twentyFiveHoursAgo = baseTime - 25 * 60 * 60 * 1000;
      const threeDaysAgo = baseTime - 3 * 24 * 60 * 60 * 1000;

      assert.equal(isStale(twentyFiveHoursAgo, baseTime), true);
      assert.equal(isStale(threeDaysAgo, baseTime), true);
      assert.equal(isStale(new Date(twentyFiveHoursAgo).toISOString(), baseTime), true);
    });

    it('returns false for missing or invalid timestamps', () => {
      assert.equal(isStale(null, baseTime), false);
      assert.equal(isStale(undefined, baseTime), false);
      assert.equal(isStale('invalid-date', baseTime), false);
    });
  });

  describe('latestVitals (per-parameter non-superseded readings)', () => {
    it('extracts latest non-superseded reading for each parameter with its own timestamp', () => {
      const vitals: VitalRecord[] = [
        // 3 days ago: complete normal vitals
        {
          id: 'v_3d_ago',
          authorId: 'dr_smith',
          source: 'clinic',
          recordedAt: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(),
          heartRate: 72,
          respRate: 14,
          systolic: 120,
          diastolic: 80,
          tempC: 36.8,
          spo2: 98
        },
        // Yesterday: patient-reported BP-only
        {
          id: 'v_yesterday',
          authorId: 'alice',
          source: 'patient',
          recordedAt: new Date(baseTime - 24 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 24 * 3600 * 1000).toISOString(),
          systolic: 124,
          diastolic: 82
        },
        // 2 hours ago: clinic abnormal HR, RR, SpO2, temp
        {
          id: 'v_2h_ago',
          authorId: 'nurse_amy',
          source: 'clinic',
          recordedAt: new Date(baseTime - 2 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 2 * 3600 * 1000).toISOString(),
          heartRate: 112,
          respRate: 22,
          spo2: 94,
          systolic: 98,
          diastolic: 60,
          tempC: 38.4,
          consciousness: 'A',
          onOxygen: false
        }
      ];

      const tiles = latestVitals(vitals, baseTime);

      // Latest BP comes from 2 hours ago
      assert.equal(tiles.bloodPressure.systolic, 98);
      assert.equal(tiles.bloodPressure.diastolic, 60);
      assert.equal(tiles.bloodPressure.ageText, '2 hours ago');
      assert.equal(tiles.bloodPressure.isStale, false);

      // Latest HR comes from 2 hours ago
      assert.equal(tiles.heartRate.value, 112);
      assert.equal(tiles.heartRate.flag, 'high'); // 112 > 100
      assert.equal(tiles.heartRate.ageText, '2 hours ago');

      // Latest SpO2 comes from 2 hours ago
      assert.equal(tiles.spo2.value, 94);
      assert.equal(tiles.spo2.flag, 'low'); // 94 < 95
      assert.equal(tiles.spo2.ageText, '2 hours ago');

      // Latest Temp comes from 2 hours ago
      assert.equal(tiles.temperature.value, 38.4);
      assert.equal(tiles.temperature.flag, 'high'); // 38.4 > 37.3
      assert.equal(tiles.temperature.ageText, '2 hours ago');
    });

    it('ignores superseded readings when extracting latest parameter values', () => {
      const vitals: VitalRecord[] = [
        {
          id: 'v_orig',
          authorId: 'dr_smith',
          source: 'clinic',
          recordedAt: new Date(baseTime - 1 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 1 * 3600 * 1000).toISOString(),
          heartRate: 150 // erroneous reading
        },
        {
          id: 'v_corrected',
          correctsId: 'v_orig',
          authorId: 'dr_smith',
          source: 'clinic',
          recordedAt: new Date(baseTime - 30 * 60 * 1000).toISOString(),
          createdAt: new Date(baseTime - 30 * 60 * 1000).toISOString(),
          heartRate: 75 // corrected reading
        }
      ];

      const tiles = latestVitals(vitals, baseTime);
      assert.equal(tiles.heartRate.value, 75);
      assert.equal(tiles.heartRate.readingId, 'v_corrected');
    });
  });

  describe('NEWS2 Isolation Rule: NEWS2 is NEVER computed across readings', () => {
    it('latest reading is incomplete (BP-only) and header explicitly flags incomplete, not pulling other readings', () => {
      const vitals: VitalRecord[] = [
        // 3 days ago: Complete normal reading (NEWS2 = 0)
        {
          id: 'v_3d_ago',
          authorId: 'dr_smith',
          source: 'clinic',
          recordedAt: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(),
          respRate: 16,
          spo2: 98,
          onOxygen: false,
          systolic: 120,
          heartRate: 72,
          consciousness: 'A',
          tempC: 37.0
        },
        // Yesterday: Patient-reported BP-only reading (incomplete NEWS2)
        {
          id: 'v_yesterday_bp',
          authorId: 'alice',
          source: 'patient',
          recordedAt: new Date(baseTime - 24 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 24 * 3600 * 1000).toISOString(),
          systolic: 124,
          diastolic: 82
        }
      ];

      const headerInfo = getChartNEWS2HeaderInfo(vitals, baseTime);

      // The latest reading (yesterday) is incomplete
      assert.ok(headerInfo.latestReading);
      assert.equal(headerInfo.latestReading.result.complete, false);
      assert.equal(headerInfo.latestReading.result.total, null);
      assert.equal(headerInfo.latestReading.result.band, null);
      // It is missing the other 5 inputs: respRate, spo2, onOxygen, heartRate, consciousness, tempC
      assert.ok(headerInfo.latestReading.result.missingInputs.includes('respRate'));
      assert.ok(headerInfo.latestReading.result.missingInputs.includes('tempC'));

      // The most recent COMPLETE reading is properly identified as 3 days ago with total 0
      assert.ok(headerInfo.latestCompleteReading);
      assert.equal(headerInfo.latestCompleteReading.readingId, 'v_3d_ago');
      assert.equal(headerInfo.latestCompleteReading.total, 0);
      assert.equal(headerInfo.latestCompleteReading.band, 'low');
      assert.equal(headerInfo.latestCompleteReading.ageText, '3 days ago');
    });

    it('proves NEWS2 total is never synthesized from combining partial readings', () => {
      // Reading A has RR and SpO2 only
      // Reading B has BP and HR only
      // Combined they might form a pseudo-reading, but NEWS2 must reject both as incomplete
      const vitals: VitalRecord[] = [
        {
          id: 'v_partial_1',
          authorId: 'nurse_amy',
          source: 'clinic',
          recordedAt: new Date(baseTime - 2 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 2 * 3600 * 1000).toISOString(),
          respRate: 16,
          spo2: 98
        },
        {
          id: 'v_partial_2',
          authorId: 'nurse_amy',
          source: 'clinic',
          recordedAt: new Date(baseTime - 1 * 3600 * 1000).toISOString(),
          createdAt: new Date(baseTime - 1 * 3600 * 1000).toISOString(),
          systolic: 120,
          heartRate: 72,
          consciousness: 'A',
          tempC: 37.0,
          onOxygen: false
        }
      ];

      const headerInfo = getChartNEWS2HeaderInfo(vitals, baseTime);

      // Latest reading v_partial_2 lacks respRate and spo2
      assert.ok(headerInfo.latestReading);
      assert.equal(headerInfo.latestReading.result.complete, false);
      assert.equal(headerInfo.latestReading.result.total, null);
      assert.ok(headerInfo.latestReading.result.missingInputs.includes('respRate'));
      assert.ok(headerInfo.latestReading.result.missingInputs.includes('spo2'));

      // No complete reading exists across the history
      assert.equal(headerInfo.latestCompleteReading, null);
    });
  });
});
