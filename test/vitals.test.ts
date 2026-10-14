import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getHeartRateReferenceFlag,
  getRespRateReferenceFlag,
  getSystolicReferenceFlag,
  getDiastolicReferenceFlag,
  getTemperatureReferenceFlag,
  getSpO2ReferenceFlag,
  getGlucoseReferenceFlag,
  getReferenceFlags,
  scoreNEWS2RespRate,
  scoreNEWS2SpO2,
  scoreNEWS2OnOxygen,
  scoreNEWS2Systolic,
  scoreNEWS2HeartRate,
  scoreNEWS2Consciousness,
  scoreNEWS2Temperature,
  calculateNEWS2,
  getGlucoseBand,
  VitalsInput
} from '../src/clinical/vitals.js';

describe('Task 7a: Vitals Reference Range Flags', () => {
  it('Heart Rate: 60–100 bpm edges and missing values', () => {
    assert.equal(getHeartRateReferenceFlag(59), 'low');
    assert.equal(getHeartRateReferenceFlag(60), 'normal');
    assert.equal(getHeartRateReferenceFlag(80), 'normal');
    assert.equal(getHeartRateReferenceFlag(100), 'normal');
    assert.equal(getHeartRateReferenceFlag(101), 'high');
    assert.equal(getHeartRateReferenceFlag(null), 'missing');
    assert.equal(getHeartRateReferenceFlag(undefined), 'missing');
    assert.equal(getHeartRateReferenceFlag(NaN), 'missing');
    assert.equal(getHeartRateReferenceFlag('75'), 'missing');
  });

  it('Respiratory Rate: 12–18 breaths/min edges and missing values', () => {
    assert.equal(getRespRateReferenceFlag(11), 'low');
    assert.equal(getRespRateReferenceFlag(12), 'normal');
    assert.equal(getRespRateReferenceFlag(15), 'normal');
    assert.equal(getRespRateReferenceFlag(18), 'normal');
    assert.equal(getRespRateReferenceFlag(19), 'high');
    assert.equal(getRespRateReferenceFlag(null), 'missing');
    assert.equal(getRespRateReferenceFlag(undefined), 'missing');
    assert.equal(getRespRateReferenceFlag(NaN), 'missing');
  });

  it('Systolic BP: 90–120 mmHg edges and missing values', () => {
    assert.equal(getSystolicReferenceFlag(89), 'low');
    assert.equal(getSystolicReferenceFlag(90), 'normal');
    assert.equal(getSystolicReferenceFlag(110), 'normal');
    assert.equal(getSystolicReferenceFlag(120), 'normal');
    assert.equal(getSystolicReferenceFlag(121), 'high');
    assert.equal(getSystolicReferenceFlag(null), 'missing');
    assert.equal(getSystolicReferenceFlag(undefined), 'missing');
    assert.equal(getSystolicReferenceFlag(NaN), 'missing');
  });

  it('Diastolic BP: 60–80 mmHg edges and missing values', () => {
    assert.equal(getDiastolicReferenceFlag(59), 'low');
    assert.equal(getDiastolicReferenceFlag(60), 'normal');
    assert.equal(getDiastolicReferenceFlag(70), 'normal');
    assert.equal(getDiastolicReferenceFlag(80), 'normal');
    assert.equal(getDiastolicReferenceFlag(81), 'high');
    assert.equal(getDiastolicReferenceFlag(null), 'missing');
    assert.equal(getDiastolicReferenceFlag(undefined), 'missing');
    assert.equal(getDiastolicReferenceFlag(NaN), 'missing');
  });

  it('Temperature: 36.5–37.3 °C edges and missing values', () => {
    assert.equal(getTemperatureReferenceFlag(36.4), 'low');
    assert.equal(getTemperatureReferenceFlag(36.5), 'normal');
    assert.equal(getTemperatureReferenceFlag(37.0), 'normal');
    assert.equal(getTemperatureReferenceFlag(37.3), 'normal');
    assert.equal(getTemperatureReferenceFlag(37.4), 'high');
    assert.equal(getTemperatureReferenceFlag(null), 'missing');
    assert.equal(getTemperatureReferenceFlag(undefined), 'missing');
    assert.equal(getTemperatureReferenceFlag(NaN), 'missing');
  });

  it('SpO₂: ≥95 % edges and missing values', () => {
    assert.equal(getSpO2ReferenceFlag(94), 'low');
    assert.equal(getSpO2ReferenceFlag(95), 'normal');
    assert.equal(getSpO2ReferenceFlag(99), 'normal');
    assert.equal(getSpO2ReferenceFlag(100), 'normal');
    assert.equal(getSpO2ReferenceFlag(null), 'missing');
    assert.equal(getSpO2ReferenceFlag(undefined), 'missing');
    assert.equal(getSpO2ReferenceFlag(NaN), 'missing');
  });

  it('Glucose: 70–180 mg/dL edges and missing values', () => {
    assert.equal(getGlucoseReferenceFlag(69), 'low');
    assert.equal(getGlucoseReferenceFlag(70), 'normal');
    assert.equal(getGlucoseReferenceFlag(120), 'normal');
    assert.equal(getGlucoseReferenceFlag(180), 'normal');
    assert.equal(getGlucoseReferenceFlag(181), 'high');
    assert.equal(getGlucoseReferenceFlag(null), 'missing');
    assert.equal(getGlucoseReferenceFlag(undefined), 'missing');
    assert.equal(getGlucoseReferenceFlag(NaN), 'missing');
  });

  it('getReferenceFlags evaluates all parameters and handles missing fields', () => {
    const flags = getReferenceFlags({
      heartRate: 75,
      respRate: 14,
      systolic: 115,
      diastolic: 75,
      tempC: 36.8,
      spo2: 98,
      glucoseMgDl: 110
    });
    assert.deepEqual(flags, {
      heartRate: 'normal',
      respRate: 'normal',
      systolic: 'normal',
      diastolic: 'normal',
      temperature: 'normal',
      spo2: 'normal',
      glucose: 'normal',
      hr: 'normal',
      rr: 'normal',
      tempC: 'normal',
      glucoseMgDl: 'normal'
    });

    const missingFlags = getReferenceFlags({});
    assert.equal(missingFlags.heartRate, 'missing');
    assert.equal(missingFlags.respRate, 'missing');
    assert.equal(missingFlags.systolic, 'missing');
    assert.equal(missingFlags.diastolic, 'missing');
    assert.equal(missingFlags.temperature, 'missing');
    assert.equal(missingFlags.spo2, 'missing');
    assert.equal(missingFlags.glucose, 'missing');
  });
});

describe('Task 7a: NEWS2 Parameter Scoring & Boundaries', () => {
  it('Respiratory Rate boundaries and decimals (≤8 → 3; 9–11 → 1; 12–20 → 0; 21–24 → 2; ≥25 → 3)', () => {
    assert.equal(scoreNEWS2RespRate(7), 3);
    assert.equal(scoreNEWS2RespRate(8), 3);
    assert.equal(scoreNEWS2RespRate(8.1), 1);
    assert.equal(scoreNEWS2RespRate(9), 1);
    assert.equal(scoreNEWS2RespRate(11), 1);
    assert.equal(scoreNEWS2RespRate(11.5), 0); // user-specified test: RR 11.5 → 0
    assert.equal(scoreNEWS2RespRate(12), 0);
    assert.equal(scoreNEWS2RespRate(20), 0);
    assert.equal(scoreNEWS2RespRate(20.5), 2);
    assert.equal(scoreNEWS2RespRate(21), 2);
    assert.equal(scoreNEWS2RespRate(24), 2);
    assert.equal(scoreNEWS2RespRate(24.5), 3);
    assert.equal(scoreNEWS2RespRate(25), 3);
    assert.equal(scoreNEWS2RespRate(30), 3);
    assert.equal(scoreNEWS2RespRate(NaN), null);
    assert.equal(scoreNEWS2RespRate(null), null);
  });

  it('SpO₂ boundaries and decimals (≤91 → 3; 92–93 → 2; 94–95 → 1; ≥96 → 0)', () => {
    assert.equal(scoreNEWS2SpO2(90), 3);
    assert.equal(scoreNEWS2SpO2(91), 3);
    assert.equal(scoreNEWS2SpO2(91.5), 2);
    assert.equal(scoreNEWS2SpO2(92), 2);
    assert.equal(scoreNEWS2SpO2(93), 2);
    assert.equal(scoreNEWS2SpO2(93.5), 1);
    assert.equal(scoreNEWS2SpO2(94), 1);
    assert.equal(scoreNEWS2SpO2(95), 1);
    assert.equal(scoreNEWS2SpO2(95.5), 0); // user-specified test: SpO₂ 95.5 → 0
    assert.equal(scoreNEWS2SpO2(96), 0);
    assert.equal(scoreNEWS2SpO2(99), 0);
    assert.equal(scoreNEWS2SpO2(NaN), null);
    assert.equal(scoreNEWS2SpO2(null), null);
  });

  it('On oxygen (yes → 2; air → 0; non-boolean → null)', () => {
    assert.equal(scoreNEWS2OnOxygen(true), 2);
    assert.equal(scoreNEWS2OnOxygen(false), 0);
    assert.equal(scoreNEWS2OnOxygen('yes'), null);
    assert.equal(scoreNEWS2OnOxygen(null), null);
    assert.equal(scoreNEWS2OnOxygen(undefined), null);
    assert.equal(scoreNEWS2OnOxygen(1), null);
  });

  it('Systolic BP boundaries and decimals (≤90 → 3; 91–100 → 2; 101–110 → 1; 111–219 → 0; ≥220 → 3)', () => {
    assert.equal(scoreNEWS2Systolic(85), 3);
    assert.equal(scoreNEWS2Systolic(90), 3);
    assert.equal(scoreNEWS2Systolic(90.5), 2); // user-specified test: systolic 90.5 → 2
    assert.equal(scoreNEWS2Systolic(91), 2);
    assert.equal(scoreNEWS2Systolic(100), 2);
    assert.equal(scoreNEWS2Systolic(100.5), 1);
    assert.equal(scoreNEWS2Systolic(101), 1);
    assert.equal(scoreNEWS2Systolic(110), 1);
    assert.equal(scoreNEWS2Systolic(110.5), 0);
    assert.equal(scoreNEWS2Systolic(111), 0);
    assert.equal(scoreNEWS2Systolic(219), 0);
    assert.equal(scoreNEWS2Systolic(219.5), 3);
    assert.equal(scoreNEWS2Systolic(220), 3);
    assert.equal(scoreNEWS2Systolic(230), 3);
    assert.equal(scoreNEWS2Systolic(NaN), null);
    assert.equal(scoreNEWS2Systolic(null), null);
  });

  it('Heart Rate boundaries and decimals (≤40 → 3; 41–50 → 1; 51–90 → 0; 91–110 → 1; 111–130 → 2; ≥131 → 3)', () => {
    assert.equal(scoreNEWS2HeartRate(35), 3);
    assert.equal(scoreNEWS2HeartRate(40), 3);
    assert.equal(scoreNEWS2HeartRate(40.5), 1); // user-specified test: HR 40.5 → 1
    assert.equal(scoreNEWS2HeartRate(41), 1);
    assert.equal(scoreNEWS2HeartRate(50), 1);
    assert.equal(scoreNEWS2HeartRate(50.5), 0);
    assert.equal(scoreNEWS2HeartRate(51), 0);
    assert.equal(scoreNEWS2HeartRate(90), 0);
    assert.equal(scoreNEWS2HeartRate(90.5), 1);
    assert.equal(scoreNEWS2HeartRate(91), 1);
    assert.equal(scoreNEWS2HeartRate(110), 1);
    assert.equal(scoreNEWS2HeartRate(110.5), 2);
    assert.equal(scoreNEWS2HeartRate(111), 2);
    assert.equal(scoreNEWS2HeartRate(130), 2);
    assert.equal(scoreNEWS2HeartRate(130.5), 3);
    assert.equal(scoreNEWS2HeartRate(131), 3);
    assert.equal(scoreNEWS2HeartRate(140), 3);
    assert.equal(scoreNEWS2HeartRate(NaN), null);
    assert.equal(scoreNEWS2HeartRate(null), null);
  });

  it('Consciousness (A → 0; C, V, P, U → 3; invalid → null)', () => {
    assert.equal(scoreNEWS2Consciousness('A'), 0);
    assert.equal(scoreNEWS2Consciousness('C'), 3);
    assert.equal(scoreNEWS2Consciousness('V'), 3);
    assert.equal(scoreNEWS2Consciousness('P'), 3);
    assert.equal(scoreNEWS2Consciousness('U'), 3);
    assert.equal(scoreNEWS2Consciousness('alert'), null);
    assert.equal(scoreNEWS2Consciousness('X'), null);
    assert.equal(scoreNEWS2Consciousness(null), null);
    assert.equal(scoreNEWS2Consciousness(undefined), null);
    assert.equal(scoreNEWS2Consciousness(123), null);
  });

  it('Temperature boundaries and decimals (≤35.0 → 3; 35.1–36.0 → 1; 36.1–38.0 → 0; 38.1–39.0 → 1; ≥39.1 → 2)', () => {
    assert.equal(scoreNEWS2Temperature(34.5), 3);
    assert.equal(scoreNEWS2Temperature(35.0), 3);
    assert.equal(scoreNEWS2Temperature(35.05), 1); // decimal falls into 1
    assert.equal(scoreNEWS2Temperature(35.1), 1);
    assert.equal(scoreNEWS2Temperature(36.0), 1);
    assert.equal(scoreNEWS2Temperature(36.05), 0);
    assert.equal(scoreNEWS2Temperature(36.1), 0);
    assert.equal(scoreNEWS2Temperature(38.0), 0);
    assert.equal(scoreNEWS2Temperature(38.05), 1);
    assert.equal(scoreNEWS2Temperature(38.1), 1);
    assert.equal(scoreNEWS2Temperature(39.0), 1);
    assert.equal(scoreNEWS2Temperature(39.05), 2);
    assert.equal(scoreNEWS2Temperature(39.1), 2);
    assert.equal(scoreNEWS2Temperature(40.0), 2);
    assert.equal(scoreNEWS2Temperature(NaN), null);
    assert.equal(scoreNEWS2Temperature(null), null);
  });
});

describe('Task 7a: NEWS2 Aggregate Bands & Red Parameters', () => {
  const normalBaseline: VitalsInput = {
    respRate: 16,     // 0
    spo2: 98,         // 0
    onOxygen: false,  // 0
    systolic: 120,    // 0
    heartRate: 72,    // 0
    consciousness: 'A', // 0
    tempC: 37.0       // 0
  };

  it('total 0 → low band, empty redParameters', () => {
    const result = calculateNEWS2(normalBaseline);
    assert.equal(result.complete, true);
    assert.equal(result.total, 0);
    assert.equal(result.band, 'low');
    assert.deepEqual(result.redParameters, []);
    assert.deepEqual(result.missingInputs, []);
  });

  it('total 4 with no parameter scoring 3 → low band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      onOxygen: true, // 2
      heartRate: 45,  // 1
      tempC: 38.5     // 1
    });
    assert.equal(result.total, 4);
    assert.equal(result.band, 'low');
    assert.deepEqual(result.redParameters, []);
  });

  it('total 3 with a single 3 → lowMedium band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      respRate: 7 // 3
    });
    assert.equal(result.total, 3);
    assert.equal(result.band, 'lowMedium');
    assert.deepEqual(result.redParameters, ['respRate']);
  });

  it('total 4 with a single 3 → lowMedium band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      respRate: 7, // 3
      tempC: 38.5  // 1
    });
    assert.equal(result.total, 4);
    assert.equal(result.band, 'lowMedium');
    assert.deepEqual(result.redParameters, ['respRate']);
  });

  it('total of 5 that includes a single 3 → medium band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      respRate: 7,    // 3
      onOxygen: true  // 2
    });
    assert.equal(result.total, 5);
    assert.equal(result.band, 'medium');
    assert.deepEqual(result.redParameters, ['respRate']);
  });

  it('total 5 with no parameter scoring 3 → medium band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      onOxygen: true, // 2
      respRate: 22,   // 2
      heartRate: 45   // 1
    });
    assert.equal(result.total, 5);
    assert.equal(result.band, 'medium');
    assert.deepEqual(result.redParameters, []);
  });

  it('total 6 → medium band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      respRate: 22,   // 2
      onOxygen: true, // 2
      heartRate: 115  // 2
    });
    assert.equal(result.total, 6);
    assert.equal(result.band, 'medium');
  });

  it('total 7 → high band', () => {
    const result = calculateNEWS2({
      ...normalBaseline,
      respRate: 7,    // 3
      onOxygen: true, // 2
      heartRate: 115  // 2
    });
    assert.equal(result.total, 7);
    assert.equal(result.band, 'high');
  });

  it('total ≥ 7 (e.g. 15) with multiple 3s listed in redParameters', () => {
    const result = calculateNEWS2({
      respRate: 7,         // 3
      spo2: 88,            // 3
      onOxygen: true,      // 2
      systolic: 80,        // 3
      heartRate: 35,       // 3
      consciousness: 'A',  // 0
      tempC: 39.5          // 2
    });
    assert.equal(result.total, 16);
    assert.equal(result.band, 'high');
    assert.deepEqual(result.redParameters, ['respRate', 'spo2', 'systolic', 'heartRate']);
  });
});

describe('Task 7a: NEWS2 Incomplete & Invalid Inputs', () => {
  const normalBaseline: VitalsInput = {
    respRate: 16,
    spo2: 98,
    onOxygen: false,
    systolic: 120,
    heartRate: 72,
    consciousness: 'A',
    tempC: 37.0
  };

  it('each missing input individually causes complete: false, total: null, band: null', () => {
    const missingKeys: (keyof VitalsInput)[] = [
      'respRate',
      'spo2',
      'onOxygen',
      'systolic',
      'heartRate',
      'consciousness',
      'tempC'
    ];

    for (const key of missingKeys) {
      const input = { ...normalBaseline, [key]: undefined };
      const result = calculateNEWS2(input);
      assert.equal(result.complete, false, `Should be incomplete when ${key} is missing`);
      assert.equal(result.total, null, `Total should be null when ${key} is missing`);
      assert.equal(result.band, null, `Band should be null when ${key} is missing`);
      assert.ok(result.missingInputs.includes(key as any), `missingInputs should include ${key}`);
    }
  });

  it('invalid inputs count as missing (NaN, invalid consciousness, non-boolean onOxygen)', () => {
    const inputWithNaN: VitalsInput = {
      ...normalBaseline,
      heartRate: NaN,
      respRate: NaN,
      tempC: NaN,
      systolic: NaN,
      spo2: NaN
    };
    const nanResult = calculateNEWS2(inputWithNaN);
    assert.equal(nanResult.complete, false);
    assert.equal(nanResult.total, null);
    assert.equal(nanResult.scores.heartRate, null);
    assert.equal(nanResult.scores.respRate, null);
    assert.equal(nanResult.scores.tempC, null);
    assert.equal(nanResult.scores.systolic, null);
    assert.equal(nanResult.scores.spo2, null);

    const inputInvalidOxygen: VitalsInput = {
      ...normalBaseline,
      onOxygen: 'yes' as any
    };
    const oxygenResult = calculateNEWS2(inputInvalidOxygen);
    assert.equal(oxygenResult.complete, false);
    assert.ok(oxygenResult.missingInputs.includes('onOxygen'));

    const inputInvalidConsciousness: VitalsInput = {
      ...normalBaseline,
      consciousness: 'alert' as any
    };
    const consResult = calculateNEWS2(inputInvalidConsciousness);
    assert.equal(consResult.complete, false);
    assert.ok(consResult.missingInputs.includes('consciousness'));
  });

  it('all inputs missing lists all 7 in missingInputs', () => {
    const result = calculateNEWS2({});
    assert.equal(result.complete, false);
    assert.equal(result.total, null);
    assert.equal(result.band, null);
    assert.deepEqual(result.missingInputs, [
      'respRate',
      'spo2',
      'onOxygen',
      'systolic',
      'heartRate',
      'consciousness',
      'tempC'
    ]);
  });
});

describe('Task 7a: Glucose Bands & Edge Values', () => {
  it('edges: 53.9, 54, 69.5, 70, 180, 180.5, 250, 250.5', () => {
    assert.equal(getGlucoseBand(53.9), 'urgentLow');
    assert.equal(getGlucoseBand(54), 'low');
    assert.equal(getGlucoseBand(69.5), 'low');
    assert.equal(getGlucoseBand(70), 'inRange');
    assert.equal(getGlucoseBand(180), 'inRange');
    assert.equal(getGlucoseBand(180.5), 'aboveTarget');
    assert.equal(getGlucoseBand(250), 'aboveTarget');
    assert.equal(getGlucoseBand(250.5), 'high');
  });

  it('edges: 53/54, 69/70, 180/181, 250/251', () => {
    // <54 'urgentLow'
    assert.equal(getGlucoseBand(53), 'urgentLow');
    assert.equal(getGlucoseBand(53.9), 'urgentLow');
    assert.equal(getGlucoseBand(54), 'low');

    // 54–69 'low'
    assert.equal(getGlucoseBand(60), 'low');
    assert.equal(getGlucoseBand(69), 'low');
    assert.equal(getGlucoseBand(70), 'inRange');

    // 70–180 'inRange'
    assert.equal(getGlucoseBand(120), 'inRange');
    assert.equal(getGlucoseBand(180), 'inRange');
    assert.equal(getGlucoseBand(181), 'aboveTarget');

    // 181–250 'aboveTarget'
    assert.equal(getGlucoseBand(200), 'aboveTarget');
    assert.equal(getGlucoseBand(250), 'aboveTarget');
    assert.equal(getGlucoseBand(251), 'high');

    // >250 'high'
    assert.equal(getGlucoseBand(350), 'high');
  });

  it('missing and invalid glucose values return null', () => {
    assert.equal(getGlucoseBand(null), null);
    assert.equal(getGlucoseBand(undefined), null);
    assert.equal(getGlucoseBand(NaN), null);
    assert.equal(getGlucoseBand('100'), null);
  });
});
