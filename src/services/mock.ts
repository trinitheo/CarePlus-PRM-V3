import type { PatientRecord, UserRecord, CareTeamMemberRecord } from '../types';
import type { DataService, PatientLoadResult, StaffPatientRow } from './types';
import type { SessionService } from './session';
import { CANONICAL_SEED } from './seed';

export class MockDataService implements DataService {
  private users: Map<string, UserRecord>;
  private patients: Map<string, PatientRecord>;
  private careTeams: CareTeamMemberRecord[];

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.careTeams = [];
    this.reset();
  }

  public reset() {
    this.users.clear();
    this.patients.clear();
    this.careTeams = [];

    for (const u of CANONICAL_SEED.users) {
      this.users.set(u.uid, { ...u });
    }
    for (const p of CANONICAL_SEED.patients) {
      this.patients.set(p.id, { ...p });
    }
    for (const ct of CANONICAL_SEED.careTeams) {
      this.careTeams.push({ ...ct });
    }
  }

  async getStaffPatients(orgId: string, staffUid: string): Promise<PatientLoadResult[]> {
    // Only active assignments for staffUid
    const activeMemberships = this.careTeams.filter(
      (ct) => ct.userId === staffUid && ct.status === 'active'
    );

    const results = await Promise.allSettled(
      activeMemberships.map(async (ct) => {
        const patient = this.patients.get(ct.patientId);
        if (!patient) {
          throw new Error(`Patient ${ct.patientId} not found`);
        }
        return {
          patient,
          memberRole: ct.role,
        } as StaffPatientRow;
      })
    );

    return results.map((res, index) => {
      const ct = activeMemberships[index];
      if (res.status === 'fulfilled') {
        return { status: 'fulfilled', value: res.value };
      } else {
        return {
          status: 'rejected',
          reason: res.reason instanceof Error ? res.reason.message : String(res.reason),
          patientId: ct.patientId,
          memberRole: ct.role,
        };
      }
    });
  }

  async getPatient(orgId: string, patientId: string): Promise<PatientRecord | null> {
    const p = this.patients.get(patientId);
    return p ? { ...p } : null;
  }

  async getUser(orgId: string, userId: string): Promise<UserRecord | null> {
    const u = this.users.get(userId);
    return u ? { ...u } : null;
  }
}

export class MockSessionService implements SessionService {
  private currentUser: UserRecord | null = null;
  private listeners: Set<(user: UserRecord | null) => void> = new Set();
  private dataService: MockDataService;

  constructor(dataService: MockDataService) {
    this.dataService = dataService;
    // Default to first clinician in mock mode
    const defaultUser = CANONICAL_SEED.users.find((u) => u.uid === 'dr_smith') || null;
    this.currentUser = defaultUser ? { ...defaultUser } : null;
  }

  getCurrentUser(): UserRecord | null {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  subscribe(callback: (user: UserRecord | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners.delete(callback);
    };
  }

  signInAs(uid: string): void {
    const found = CANONICAL_SEED.users.find((u) => u.uid === uid);
    this.currentUser = found ? { ...found } : null;
    for (const listener of this.listeners) {
      listener(this.getCurrentUser());
    }
  }
}
