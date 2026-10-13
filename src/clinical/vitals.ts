export type ReferenceFlag = 'low' | 'normal' | 'high' | 'missing';

export type NEWS2Band = 'low' | 'lowMedium' | 'medium' | 'high';

export type GlucoseBand =
  | 'urgentLow'
  | 'low'
  | 'inRange'
  | 'aboveTarget'
  | 'high';

export type NEWS2ParameterKey =
  | 'respRate'
  | 'spo2'
  | 'onOxygen'
  | 'systolic'
  | 'heartRate'
  | 'consciousness'
  | 'tempC';

export interface VitalsInput {
  heartRate?: number | null;
  hr?: number | null;
  respRate?: number | null;
  rr?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  tempC?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  glucoseMgDl?: number | null;
  glucose?: number | null;
  weightKg?: number | null;
  onOxygen?: boolean | null;
  consciousness?: 'A' | 'C' | 'V' | 'P' | 'U' | string | null;
}

export interface NEWS2ParameterScores {
  respRate: number | null;
  spo2: number | null;
  onOxygen: number | null;
  systolic: number | null;
  heartRate: number | null;
  consciousness: number | null;
  tempC: number | null;
  rr?: number | null;
  hr?: number | null;
  temperature?: number | null;
}

export interface NEWS2Result {
  scores: NEWS2ParameterScores;
  total: number | null;
  band: NEWS2Band | null;
  complete: boolean;
  missingInputs: NEWS2ParameterKey[];
  redParameters: NEWS2ParameterKey[];
}

export interface VitalsReferenceFlags {
  heartRate: ReferenceFlag;
  respRate: ReferenceFlag;
  systolic: ReferenceFlag;
  diastolic: ReferenceFlag;
  temperature: ReferenceFlag;
  spo2: ReferenceFlag;
  glucose: ReferenceFlag;
  hr?: ReferenceFlag;
  rr?: ReferenceFlag;
  tempC?: ReferenceFlag;
  glucoseMgDl?: ReferenceFlag;
}

function isValidNumber(val: unknown): val is number {
  return typeof val === 'number' && !Number.isNaN(val);
}

// ---------------------------------------------------------------------------
// 1. Reference range flags ('low' | 'normal' | 'high' | 'missing')
// ---------------------------------------------------------------------------

export function getHeartRateReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 60) return 'low';
  if (val <= 100) return 'normal';
  return 'high';
}

export function getRespRateReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 12) return 'low';
  if (val <= 18) return 'normal';
  return 'high';
}

export function getSystolicReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 90) return 'low';
  if (val <= 120) return 'normal';
  return 'high';
}

export function getDiastolicReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 60) return 'low';
  if (val <= 80) return 'normal';
  return 'high';
}

export function getTemperatureReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 36.5) return 'low';
  if (val <= 37.3) return 'normal';
  return 'high';
}

export function getSpO2ReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 95) return 'low';
  return 'normal';
}

export function getGlucoseReferenceFlag(val: unknown): ReferenceFlag {
  if (!isValidNumber(val)) return 'missing';
  if (val < 70) return 'low';
  if (val <= 180) return 'normal';
  return 'high';
}

export function getReferenceFlags(vitals: VitalsInput): VitalsReferenceFlags {
  const hrVal = vitals.heartRate !== undefined ? vitals.heartRate : vitals.hr;
  const rrVal = vitals.respRate !== undefined ? vitals.respRate : vitals.rr;
  const sysVal = vitals.systolic;
  const diaVal = vitals.diastolic;
  const tempVal = vitals.tempC !== undefined ? vitals.tempC : vitals.temperature;
  const spo2Val = vitals.spo2;
  const gluVal = vitals.glucoseMgDl !== undefined ? vitals.glucoseMgDl : vitals.glucose;

  const hrFlag = getHeartRateReferenceFlag(hrVal);
  const rrFlag = getRespRateReferenceFlag(rrVal);
  const sysFlag = getSystolicReferenceFlag(sysVal);
  const diaFlag = getDiastolicReferenceFlag(diaVal);
  const tempFlag = getTemperatureReferenceFlag(tempVal);
  const spo2Flag = getSpO2ReferenceFlag(spo2Val);
  const gluFlag = getGlucoseReferenceFlag(gluVal);

  return {
    heartRate: hrFlag,
    respRate: rrFlag,
    systolic: sysFlag,
    diastolic: diaFlag,
    temperature: tempFlag,
    spo2: spo2Flag,
    glucose: gluFlag,
    hr: hrFlag,
    rr: rrFlag,
    tempC: tempFlag,
    glucoseMgDl: gluFlag
  };
}

// ---------------------------------------------------------------------------
// 2. NEWS2 Scoring & Risk Banding (Scale 1)
// ---------------------------------------------------------------------------

// RR: ≤8 → 3; 9–11 → 1; 12–20 → 0; 21–24 → 2; ≥25 → 3
export function scoreNEWS2RespRate(val: unknown): number | null {
  if (!isValidNumber(val)) return null;
  if (val <= 8) return 3;
  if (val <= 11) return 1;
  if (val <= 20) return 0;
  if (val <= 24) return 2;
  return 3;
}

// SpO₂: ≤91 → 3; 92–93 → 2; 94–95 → 1; ≥96 → 0
export function scoreNEWS2SpO2(val: unknown): number | null {
  if (!isValidNumber(val)) return null;
  if (val <= 91) return 3;
  if (val <= 93) return 2;
  if (val <= 95) return 1;
  return 0;
}

// On oxygen: yes → 2; air → 0
export function scoreNEWS2OnOxygen(val: unknown): number | null {
  if (typeof val !== 'boolean') return null;
  return val ? 2 : 0;
}

// Systolic: ≤90 → 3; 91–100 → 2; 101–110 → 1; 111–219 → 0; ≥220 → 3
export function scoreNEWS2Systolic(val: unknown): number | null {
  if (!isValidNumber(val)) return null;
  if (val <= 90) return 3;
  if (val <= 100) return 2;
  if (val <= 110) return 1;
  if (val <= 219) return 0;
  return 3;
}

// HR: ≤40 → 3; 41–50 → 1; 51–90 → 0; 91–110 → 1; 111–130 → 2; ≥131 → 3
export function scoreNEWS2HeartRate(val: unknown): number | null {
  if (!isValidNumber(val)) return null;
  if (val <= 40) return 3;
  if (val <= 50) return 1;
  if (val <= 90) return 0;
  if (val <= 110) return 1;
  if (val <= 130) return 2;
  return 3;
}

// Consciousness: A → 0; C, V, P or U → 3
export function scoreNEWS2Consciousness(val: unknown): number | null {
  if (typeof val !== 'string') return null;
  if (val === 'A') return 0;
  if (val === 'C' || val === 'V' || val === 'P' || val === 'U') return 3;
  return null;
}

// Temperature: ≤35.0 → 3; 35.1–36.0 → 1; 36.1–38.0 → 0; 38.1–39.0 → 1; ≥39.1 → 2
export function scoreNEWS2Temperature(val: unknown): number | null {
  if (!isValidNumber(val)) return null;
  if (val <= 35.0) return 3;
  if (val <= 36.0) return 1;
  if (val <= 38.0) return 0;
  if (val <= 39.0) return 1;
  return 2;
}

export function calculateNEWS2(vitals: VitalsInput): NEWS2Result {
  const rrVal = vitals.respRate !== undefined ? vitals.respRate : vitals.rr;
  const spo2Val = vitals.spo2;
  const oxygenVal = vitals.onOxygen;
  const sysVal = vitals.systolic;
  const hrVal = vitals.heartRate !== undefined ? vitals.heartRate : vitals.hr;
  const consVal = vitals.consciousness;
  const tempVal = vitals.tempC !== undefined ? vitals.tempC : vitals.temperature;

  const rrScore = scoreNEWS2RespRate(rrVal);
  const spo2Score = scoreNEWS2SpO2(spo2Val);
  const oxygenScore = scoreNEWS2OnOxygen(oxygenVal);
  const sysScore = scoreNEWS2Systolic(sysVal);
  const hrScore = scoreNEWS2HeartRate(hrVal);
  const consScore = scoreNEWS2Consciousness(consVal);
  const tempScore = scoreNEWS2Temperature(tempVal);

  const scores: NEWS2ParameterScores = {
    respRate: rrScore,
    spo2: spo2Score,
    onOxygen: oxygenScore,
    systolic: sysScore,
    heartRate: hrScore,
    consciousness: consScore,
    tempC: tempScore,
    rr: rrScore,
    hr: hrScore,
    temperature: tempScore
  };

  const missingInputs: NEWS2ParameterKey[] = [];
  if (rrScore === null) missingInputs.push('respRate');
  if (spo2Score === null) missingInputs.push('spo2');
  if (oxygenScore === null) missingInputs.push('onOxygen');
  if (sysScore === null) missingInputs.push('systolic');
  if (hrScore === null) missingInputs.push('heartRate');
  if (consScore === null) missingInputs.push('consciousness');
  if (tempScore === null) missingInputs.push('tempC');

  const redParameters: NEWS2ParameterKey[] = [];
  if (rrScore === 3) redParameters.push('respRate');
  if (spo2Score === 3) redParameters.push('spo2');
  if (sysScore === 3) redParameters.push('systolic');
  if (hrScore === 3) redParameters.push('heartRate');
  if (consScore === 3) redParameters.push('consciousness');
  if (tempScore === 3) redParameters.push('tempC');

  if (missingInputs.length > 0) {
    return {
      scores,
      total: null,
      band: null,
      complete: false,
      missingInputs,
      redParameters
    };
  }

  // All 7 inputs are present and valid
  const total =
    rrScore! +
    spo2Score!; +
    oxygenScore! +
    sysScore! +
    hrScore! +
    consScore! +
    tempScore!;

  const totalSum =
    (rrScore ?? 0) +
    (spo2Score ?? 0) +
    (oxygenScore ?? 0) +
    (sysScore ?? 0) +
    (hrScore ?? 0) +
    (consScore ?? 0) +
    (tempScore ?? 0);

  let band: NEWS2Band;
  if (totalSum >= 7) {
    band = 'high';
  } else if (totalSum >= 5) {
    band = 'medium';
  } else if (redParameters.length > 0) {
    band = 'lowMedium';
  } else {
    band = 'low';
  }

  return {
    scores,
    total: totalSum,
    band,
    complete: true,
    missingInputs: [],
    redParameters
  };
}

// ---------------------------------------------------------------------------
// 3. Glucose Band (<54 'urgentLow'; 54–69 'low'; 70–180 'inRange'; 181–250 'aboveTarget'; >250 'high')
// ---------------------------------------------------------------------------

export function getGlucoseBand(val: unknown): GlucoseBand | null {
  if (!isValidNumber(val)) return null;
  if (val < 54) return 'urgentLow';
  if (val <= 69) return 'low';
  if (val <= 180) return 'inRange';
  if (val <= 250) return 'aboveTarget';
  return 'high';
}
