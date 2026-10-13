import {
  calculateNEWS2,
  getReferenceFlags,
  getGlucoseBand,
  NEWS2Result,
  ReferenceFlag,
  GlucoseBand,
  NEWS2ParameterKey
} from './vitals.js';
import type { VitalRecord } from '../types.js';

export interface VitalParameterTile {
  value: number | string | null;
  unit: string;
  recordedAt: string | null;
  ageText: string;
  flag: ReferenceFlag;
  isStale: boolean;
  source?: 'clinic' | 'patient';
  readingId?: string;
}

export interface LatestVitalsResult {
  heartRate: VitalParameterTile;
  respRate: VitalParameterTile;
  bloodPressure: {
    systolic: number | null;
    diastolic: number | null;
    unit: string;
    recordedAt: string | null;
    ageText: string;
    flagSystolic: ReferenceFlag;
    flagDiastolic: ReferenceFlag;
    isStale: boolean;
    source?: 'clinic' | 'patient';
    readingId?: string;
  };
  temperature: VitalParameterTile;
  spo2: VitalParameterTile;
  glucose: VitalParameterTile & {
    band: GlucoseBand | null;
    context?: string;
  };
}

export interface HeaderNEWS2Info {
  latestReading: {
    readingId?: string;
    recordedAt: string | null;
    ageText: string;
    result: NEWS2Result;
  } | null;
  latestCompleteReading: {
    readingId?: string;
    recordedAt: string | null;
    ageText: string;
    total: number;
    band: string;
    redParameters: NEWS2ParameterKey[];
  } | null;
}

export function parseRecordedAtMillis(recordedAt: unknown): number {
  if (!recordedAt) return 0;
  if (typeof recordedAt === 'number') return recordedAt;
  if (recordedAt instanceof Date) return recordedAt.getTime();
  if (typeof recordedAt === 'object' && 'toMillis' in (recordedAt as any)) {
    return (recordedAt as any).toMillis();
  }
  if (typeof recordedAt === 'string') {
    const parsed = Date.parse(recordedAt);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function formatAge(timestamp: unknown, nowMillis: number = Date.now()): string {
  const t = parseRecordedAtMillis(timestamp);
  if (!t) return '—';
  const diffMs = Math.max(0, nowMillis - t);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
  if (diffHours >= 1) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffMin >= 1) {
    return diffMin === 1 ? '1 min ago' : `${diffMin} mins ago`;
  }
  return 'Just now';
}

/**
 * Returns a Set of IDs that have been superseded by a subsequent record's correctsId.
 */
export function supersededIds(records: { id?: string; correctsId?: string }[]): Set<string> {
  const result = new Set<string>();
  for (const record of records) {
    if (record.correctsId && typeof record.correctsId === 'string') {
      result.add(record.correctsId);
    }
  }
  return result;
}

/**
 * Checks if a reading is over 24 hours old.
 */
export function isStale(recordedAt: unknown, nowMillis: number = Date.now()): boolean {
  const t = parseRecordedAtMillis(recordedAt);
  if (!t) return false;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return nowMillis - t > twentyFourHoursMs;
}

/**
 * Extracts latest non-superseded reading per parameter for display tiles.
 * Note: NEWS2 must NEVER be computed from this aggregate object.
 */
export function latestVitals(vitals: VitalRecord[], nowMillis: number = Date.now()): LatestVitalsResult {
  const superseded = supersededIds(vitals);
  const validVitals = vitals
    .filter((v) => !v.id || !superseded.has(v.id))
    .slice()
    .sort((a, b) => parseRecordedAtMillis(b.recordedAt) - parseRecordedAtMillis(a.recordedAt));

  let hrVital: VitalRecord | undefined;
  let rrVital: VitalRecord | undefined;
  let bpVital: VitalRecord | undefined;
  let tempVital: VitalRecord | undefined;
  let spo2Vital: VitalRecord | undefined;
  let gluVital: VitalRecord | undefined;

  for (const v of validVitals) {
    if (!hrVital && v.heartRate !== undefined && v.heartRate !== null && !Number.isNaN(v.heartRate)) {
      hrVital = v;
    }
    if (!rrVital && v.respRate !== undefined && v.respRate !== null && !Number.isNaN(v.respRate)) {
      rrVital = v;
    }
    if (!bpVital && (v.systolic !== undefined || v.diastolic !== undefined)) {
      bpVital = v;
    }
    if (!tempVital && v.tempC !== undefined && v.tempC !== null && !Number.isNaN(v.tempC)) {
      tempVital = v;
    }
    if (!spo2Vital && v.spo2 !== undefined && v.spo2 !== null && !Number.isNaN(v.spo2)) {
      spo2Vital = v;
    }
    if (!gluVital && v.glucoseMgDl !== undefined && v.glucoseMgDl !== null && !Number.isNaN(v.glucoseMgDl)) {
      gluVital = v;
    }
  }

  const flagsHR = hrVital ? getReferenceFlags({ heartRate: hrVital.heartRate }) : null;
  const flagsRR = rrVital ? getReferenceFlags({ respRate: rrVital.respRate }) : null;
  const flagsBP = bpVital ? getReferenceFlags({ systolic: bpVital.systolic, diastolic: bpVital.diastolic }) : null;
  const flagsTemp = tempVital ? getReferenceFlags({ tempC: tempVital.tempC }) : null;
  const flagsSpO2 = spo2Vital ? getReferenceFlags({ spo2: spo2Vital.spo2 }) : null;
  const flagsGlu = gluVital ? getReferenceFlags({ glucoseMgDl: gluVital.glucoseMgDl }) : null;

  return {
    heartRate: {
      value: hrVital?.heartRate ?? null,
      unit: 'bpm',
      recordedAt: hrVital?.recordedAt ?? null,
      ageText: hrVital ? formatAge(hrVital.recordedAt, nowMillis) : '—',
      flag: flagsHR?.heartRate ?? 'missing',
      isStale: hrVital ? isStale(hrVital.recordedAt, nowMillis) : false,
      source: hrVital?.source,
      readingId: hrVital?.id
    },
    respRate: {
      value: rrVital?.respRate ?? null,
      unit: '/min',
      recordedAt: rrVital?.recordedAt ?? null,
      ageText: rrVital ? formatAge(rrVital.recordedAt, nowMillis) : '—',
      flag: flagsRR?.respRate ?? 'missing',
      isStale: rrVital ? isStale(rrVital.recordedAt, nowMillis) : false,
      source: rrVital?.source,
      readingId: rrVital?.id
    },
    bloodPressure: {
      systolic: bpVital?.systolic ?? null,
      diastolic: bpVital?.diastolic ?? null,
      unit: 'mmHg',
      recordedAt: bpVital?.recordedAt ?? null,
      ageText: bpVital ? formatAge(bpVital.recordedAt, nowMillis) : '—',
      flagSystolic: flagsBP?.systolic ?? 'missing',
      flagDiastolic: flagsBP?.diastolic ?? 'missing',
      isStale: bpVital ? isStale(bpVital.recordedAt, nowMillis) : false,
      source: bpVital?.source,
      readingId: bpVital?.id
    },
    temperature: {
      value: tempVital?.tempC ?? null,
      unit: '°C',
      recordedAt: tempVital?.recordedAt ?? null,
      ageText: tempVital ? formatAge(tempVital.recordedAt, nowMillis) : '—',
      flag: flagsTemp?.temperature ?? 'missing',
      isStale: tempVital ? isStale(tempVital.recordedAt, nowMillis) : false,
      source: tempVital?.source,
      readingId: tempVital?.id
    },
    spo2: {
      value: spo2Vital?.spo2 ?? null,
      unit: '%',
      recordedAt: spo2Vital?.recordedAt ?? null,
      ageText: spo2Vital ? formatAge(spo2Vital.recordedAt, nowMillis) : '—',
      flag: flagsSpO2?.spo2 ?? 'missing',
      isStale: spo2Vital ? isStale(spo2Vital.recordedAt, nowMillis) : false,
      source: spo2Vital?.source,
      readingId: spo2Vital?.id
    },
    glucose: {
      value: gluVital?.glucoseMgDl ?? null,
      unit: 'mg/dL',
      recordedAt: gluVital?.recordedAt ?? null,
      ageText: gluVital ? formatAge(gluVital.recordedAt, nowMillis) : '—',
      flag: flagsGlu?.glucose ?? 'missing',
      band: gluVital ? getGlucoseBand(gluVital.glucoseMgDl) : null,
      context: gluVital?.glucoseContext,
      isStale: gluVital ? isStale(gluVital.recordedAt, nowMillis) : false,
      source: gluVital?.source,
      readingId: gluVital?.id
    }
  };
}

/**
 * Calculates NEWS2 exclusively on discrete readings, never across readings.
 * Returns the most recent reading's NEWS2, and if incomplete, also locates
 * the most recent complete NEWS2 reading with its age.
 */
export function getChartNEWS2HeaderInfo(vitals: VitalRecord[], nowMillis: number = Date.now()): HeaderNEWS2Info {
  const superseded = supersededIds(vitals);
  const validVitals = vitals
    .filter((v) => !v.id || !superseded.has(v.id))
    .slice()
    .sort((a, b) => parseRecordedAtMillis(b.recordedAt) - parseRecordedAtMillis(a.recordedAt));

  if (validVitals.length === 0) {
    return {
      latestReading: null,
      latestCompleteReading: null
    };
  }

  const latest = validVitals[0];
  const latestResult = calculateNEWS2({
    respRate: latest.respRate,
    spo2: latest.spo2,
    onOxygen: latest.onOxygen,
    systolic: latest.systolic,
    heartRate: latest.heartRate,
    consciousness: latest.consciousness,
    tempC: latest.tempC
  });

  const latestReadingInfo = {
    readingId: latest.id,
    recordedAt: latest.recordedAt,
    ageText: formatAge(latest.recordedAt, nowMillis),
    result: latestResult
  };

  let latestCompleteReadingInfo: HeaderNEWS2Info['latestCompleteReading'] = null;

  for (const v of validVitals) {
    const res = calculateNEWS2({
      respRate: v.respRate,
      spo2: v.spo2,
      onOxygen: v.onOxygen,
      systolic: v.systolic,
      heartRate: v.heartRate,
      consciousness: v.consciousness,
      tempC: v.tempC
    });
    if (res.complete && res.total !== null && res.band !== null) {
      latestCompleteReadingInfo = {
        readingId: v.id,
        recordedAt: v.recordedAt,
        ageText: formatAge(v.recordedAt, nowMillis),
        total: res.total,
        band: res.band,
        redParameters: res.redParameters
      };
      break;
    }
  }

  return {
    latestReading: latestReadingInfo,
    latestCompleteReading: latestCompleteReadingInfo
  };
}
