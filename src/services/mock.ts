import type { PatientRecord, UserRecord, CareTeamMemberRecord, PatientOrgCareTeam } from '../types';
import type { DataService, PatientLoadResult, StaffPatientRow } from './types';
import type { SessionService, SessionState } from './session';
import { CANONICAL_SEED } from './seed';

export class MockDataService implements DataService {
  private users: Map<string, UserRecord>;
  private patients: Map<string, { orgId: string; patient: PatientRecord }>;
  private careTeams: { orgId: string; record: CareTeamMemberRecord }[];

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

    // 1. First admins
    for (const fa of CANONICAL_SEED.firstAdmins) {
      this.users.set(fa.id, {
        uid: fa.id,
        role: fa.data.role,
        displayName: fa.data.displayName,
        email: fa.data.email,
        phone: fa.data.phone,
        orgId: fa.data.orgId,
      } as any);
    }

    // 2. Staff users
    for (const s of CANONICAL_SEED.staffUsers) {
      this.users.set(s.id, {
        uid: s.id,
        role: s.data.role,
        displayName: s.data.displayName,
        email: s.data.email,
        phone: s.data.phone,
        orgId: s.data.orgId,
      } as any);
    }

    // 3. Patient users
    for (const pu of CANONICAL_SEED.patientUsers) {
      this.users.set(pu.id, {
        uid: pu.id,
        role: pu.data.role,
        displayName: pu.data.displayName,
        email: pu.data.email,
        phone: pu.data.phone,
      });
    }

    // 4. Patients
    for (const p of CANONICAL_SEED.patients) {
      this.patients.set(p.entry.id, {
        orgId: p.orgId,
        patient: { ...p.entry.data },
      });
    }

    // 5. Care teams
    for (const ct of CANONICAL_SEED.careTeams) {
      this.careTeams.push({
        orgId: ct.orgId,
        record: {
          id: ct.entry.id,
          patientId: ct.entry.data.patientId,
          userId: ct.entry.data.userId,
          role: ct.entry.data.role,
          status: ct.entry.data.status,
          joinedAt: ct.entry.data.createdAt,
        },
      });
    }

    // 6. Care team updates
    for (const update of CANONICAL_SEED.careTeamUpdates) {
      const match = this.careTeams.find(
        (ct) => ct.orgId === update.orgId && ct.record.id === update.docId
      );
      if (match) {
        match.record.status = update.data.status;
        match.record.removedAt = update.data.removedAt;
      }
    }
  }

  async getStaffPatients(orgId: string, staffUid: string): Promise<PatientLoadResult[]> {
    // Only active assignments for staffUid in orgId
    const activeMemberships = this.careTeams.filter(
      (ct) => ct.orgId === orgId && ct.record.userId === staffUid && ct.record.status === 'active'
    );

    const results = await Promise.allSettled(
      activeMemberships.map(async (ct) => {
        const item = this.patients.get(ct.record.patientId);
        if (!item || item.orgId !== orgId) {
          throw new Error(`Patient ${ct.record.patientId} not found in ${orgId}`);
        }
        return {
          patient: item.patient,
          memberRole: ct.record.role,
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
          patientId: ct.record.patientId,
          memberRole: ct.record.role,
        };
      }
    });
  }

  async getPatient(orgId: string, patientId: string): Promise<PatientRecord | null> {
    const item = this.patients.get(patientId);
    if (!item || item.orgId !== orgId) return null;
    return { ...item.patient };
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const u = this.users.get(userId);
    return u ? { ...u } : null;
  }

  async getMyCareTeams(patientUid: string): Promise<PatientOrgCareTeam[]> {
    // Find all patients linked to patientUid
    const linkedPatients = Array.from(this.patients.values()).filter(
      (item) => item.patient.linkedUserId === patientUid
    );

    const result: PatientOrgCareTeam[] = [];

    for (const item of linkedPatients) {
      const activeMembers = this.careTeams.filter(
        (ct) =>
          ct.orgId === item.orgId &&
          ct.record.patientId === item.patient.id &&
          ct.record.status === 'active'
      );

      const members = activeMembers.map((ct) => {
        const user = this.users.get(ct.record.userId);
        return {
          userId: ct.record.userId,
          displayName: user?.displayName || ct.record.userId,
          role: ct.record.role,
        };
      });

      result.push({
        orgId: item.orgId,
        orgName: item.patient.orgName,
        patientId: item.patient.id,
        members,
      });
    }

    return result;
  }
}

export class MockSessionService implements SessionService {
  private currentUser: UserRecord | null = null;
  private listeners: Set<(state: SessionState) => void> = new Set();
  private dataService: MockDataService;

  constructor(dataService: MockDataService) {
    this.dataService = dataService;
    // Default to first clinician in mock mode
    const defaultUser = {
      uid: 'dr_smith',
      displayName: 'Dr. Sarah Smith',
      email: 'smith@careplus.test',
      phone: '+15550000002',
      role: 'clinician' as const,
      orgId: 'clinic_a',
    } as any;
    this.currentUser = defaultUser;
  }

  getState(): SessionState {
    return {
      status: this.currentUser ? 'signedIn' : 'signedOut',
      user: this.currentUser ? { ...this.currentUser } : null,
    };
  }

  getCurrentUser(): UserRecord | null {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  subscribe(callback: (state: SessionState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  async signInAs(uid: string): Promise<void> {
    if (!uid) {
      this.currentUser = null;
      this.notify();
      return;
    }
    const user = await this.dataService.getUser(uid);
    if (!user) {
      throw new Error(`User with uid ${uid} not found`);
    }
    this.currentUser = user;
    this.notify();
  }

  async signIn(email: string): Promise<void> {
    // Basic mock sign in
    this.notify();
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.notify();
  }

  async sendPasswordReset(): Promise<void> {
    // No-op mock
  }
}
