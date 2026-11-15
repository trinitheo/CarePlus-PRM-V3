import type {
  PatientRecord,
  UserRecord,
  CareTeamMemberRecord,
  PatientOrgCareTeam,
  ClinicalNote,
  VitalRecord,
  PrescriptionRecord
} from '../types';
import type {
  DataService,
  PatientLoadResult,
  StaffPatientRow,
  PatientChartData,
  PatientFileDecision,
  PatientIdentityInput,
  NewPatientInput,
} from './types';
import type { IdType } from '../types';
import {
  classifyNameMatches,
  cleanIdentityInput,
  decidePatientFile,
  formatMrn,
  idRegistryKey,
  isValidIdNumber,
  normaliseIdNumber,
  PatientFileError,
  validateIdentityInput,
} from './patientMatching';
import type { SessionService, SessionState } from './session';
import { CANONICAL_SEED } from './seed';

export class MockDataService implements DataService {
  private users: Map<string, UserRecord>;
  private patients: Map<string, { orgId: string; patient: PatientRecord }>;
  private careTeams: { orgId: string; record: CareTeamMemberRecord }[];
  private vitals: { orgId: string; patientId: string; record: VitalRecord }[];
  private notes: { orgId: string; patientId: string; record: ClinicalNote }[];
  private prescriptions: { orgId: string; patientId: string; record: PrescriptionRecord }[];
  // Task 8: in-memory stand-ins for the registries and MRN counter (keys are `${orgId}/...`)
  private orgNames = new Map<string, string>();
  private mrnRegistry = new Map<string, string>();
  private idRegistry = new Map<string, string>();
  private mrnCounters = new Map<string, number>();

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.careTeams = [];
    this.vitals = [];
    this.notes = [];
    this.prescriptions = [];
    this.reset();
  }

  public reset() {
    this.users.clear();
    this.patients.clear();
    this.careTeams = [];
    this.vitals = [];
    this.notes = [];
    this.prescriptions = [];
    this.orgNames.clear();
    this.mrnRegistry.clear();
    this.idRegistry.clear();
    this.mrnCounters.clear();
    for (const org of CANONICAL_SEED.organizations) {
      this.orgNames.set(org.id, org.data.name);
    }

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
      this.mrnRegistry.set(`${p.orgId}/${p.entry.data.mrn}`, p.entry.id);
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

    // 7. Clinical Vitals
    const now = Date.now();
    for (const v of CANONICAL_SEED.vitals) {
      const recAt = new Date(now - v.offsetMs).toISOString();
      const creAt = new Date(now - v.offsetMs).toISOString();
      this.vitals.push({
        orgId: v.orgId,
        patientId: v.patientId,
        record: {
          id: v.id,
          patientId: v.patientId,
          authorId: v.authorId,
          source: v.source,
          recordedAt: recAt,
          createdAt: creAt,
          heartRate: v.heartRate,
          respRate: v.respRate,
          systolic: v.systolic,
          diastolic: v.diastolic,
          tempC: v.tempC,
          spo2: v.spo2,
          consciousness: v.consciousness,
          onOxygen: v.onOxygen,
          glucoseMgDl: v.glucoseMgDl,
          glucoseContext: v.glucoseContext,
          correctsId: v.correctsId,
        },
      });
    }

    // 8. Clinical Notes
    for (const n of CANONICAL_SEED.notes) {
      const creAt = new Date(now - n.offsetMs).toISOString();
      const finAt = n.status === 'final' ? new Date(now - n.offsetMs + 60000).toISOString() : undefined;
      this.notes.push({
        orgId: n.orgId,
        patientId: n.patientId,
        record: {
          id: n.id,
          patientId: n.patientId,
          authorId: n.authorId,
          body: n.body,
          status: n.status,
          createdAt: creAt as any,
          finalisedAt: finAt as any,
          correctsId: n.correctsId,
        },
      });
    }

    // 9. Prescriptions
    for (const rx of CANONICAL_SEED.prescriptions) {
      const creAt = new Date(now - rx.offsetMs).toISOString();
      const discAt = rx.status === 'discontinued'
        ? new Date(now - (rx.discontinueOffsetMs ?? rx.offsetMs / 2)).toISOString()
        : undefined;
      this.prescriptions.push({
        orgId: rx.orgId,
        patientId: rx.patientId,
        record: {
          id: rx.id,
          patientId: rx.patientId,
          authorId: rx.authorId,
          medication: rx.medication,
          dose: rx.dose,
          route: rx.route,
          frequency: rx.frequency,
          status: rx.status,
          createdAt: creAt,
          discontinuedAt: discAt,
          discontinuedBy: rx.discontinuedBy,
          correctsId: rx.correctsId,
        },
      });
    }
  }

  async getPatientChart(orgId: string, patientId: string, uid: string): Promise<PatientChartData> {
    const pItem = this.patients.get(patientId);
    if (!pItem || pItem.orgId !== orgId) {
      throw new Error(`Patient document ${patientId} not found in ${orgId}`);
    }

    // Care team / Linked patient access check
    const isActiveTeamMember = this.careTeams.some(
      (ct) =>
        ct.orgId === orgId &&
        ct.record.patientId === patientId &&
        ct.record.userId === uid &&
        ct.record.status === 'active'
    );
    const isLinkedPatient = pItem.patient.linkedUserId === uid;

    if (!isActiveTeamMember && !isLinkedPatient) {
      throw new Error("Permission denied: You're not on this patient's care team.");
    }

    const careTeam = this.careTeams
      .filter((ct) => ct.orgId === orgId && ct.record.patientId === patientId && ct.record.status === 'active')
      .map((ct) => ({ ...ct.record }));

    const vitals = this.vitals
      .filter((v) => v.orgId === orgId && v.patientId === patientId)
      .map((v) => ({ ...v.record }))
      .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));

    const finalNotes = this.notes
      .filter((n) => n.orgId === orgId && n.patientId === patientId && n.record.status === 'final')
      .map((n) => ({ ...n.record }))
      .sort((a, b) => Date.parse(b.createdAt as any) - Date.parse(a.createdAt as any));

    const myDrafts = this.notes
      .filter((n) => n.orgId === orgId && n.patientId === patientId && n.record.status === 'draft' && n.record.authorId === uid)
      .map((n) => ({ ...n.record }))
      .sort((a, b) => Date.parse(b.createdAt as any) - Date.parse(a.createdAt as any));

    const prescriptions = this.prescriptions
      .filter((rx) => rx.orgId === orgId && rx.patientId === patientId)
      .map((rx) => ({ ...rx.record }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return {
      patient: { ...pItem.patient },
      careTeam,
      vitals,
      finalNotes,
      myDrafts,
      prescriptions,
    };
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

  // ---- Task 8: admin patient files (same decision logic as Firestore) ----

  private orgPatients(orgId: string): PatientRecord[] {
    return Array.from(this.patients.values())
      .filter((item) => item.orgId === orgId)
      .map((item) => ({ ...item.patient }));
  }

  async searchPatientFiles(orgId: string, rawInput: PatientIdentityInput): Promise<PatientFileDecision> {
    const errors = validateIdentityInput(rawInput);
    if (errors.length > 0) throw new PatientFileError(errors.join(' '));
    const input = cleanIdentityInput(rawInput);
    let idHolder: PatientRecord | null = null;
    if (input.idType && input.idNumber) {
      const holderId = this.idRegistry.get(`${orgId}/${idRegistryKey(input.idType, input.idNumber)}`);
      idHolder = holderId ? await this.getPatient(orgId, holderId) : null;
    }
    return decidePatientFile(input, idHolder, classifyNameMatches(this.orgPatients(orgId), input));
  }

  async createPatientFile(orgId: string, rawInput: NewPatientInput): Promise<PatientRecord> {
    const input = cleanIdentityInput(rawInput);
    const decision = await this.searchPatientFiles(orgId, input);
    if (decision.kind !== 'can-create') {
      throw new PatientFileError('A patient file cannot be created until the match is resolved.', decision);
    }
    const next = (this.mrnCounters.get(orgId) ?? 0) + 1;
    const mrn = formatMrn(next);
    if (this.mrnRegistry.has(`${orgId}/${mrn}`)) {
      throw new PatientFileError(`${mrn} is already registered; the MRN counter is out of step.`);
    }
    const id = `patient_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const record: PatientRecord = {
      id,
      mrn,
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      gender: input.gender,
      email: input.email.trim(),
      phone: input.phone.trim(),
      orgName: this.orgNames.get(orgId) ?? orgId,
      createdAt: new Date().toISOString(),
      ...(input.idType && input.idNumber ? { idType: input.idType, idNumber: input.idNumber } : {}),
    };
    this.mrnCounters.set(orgId, next);
    this.patients.set(id, { orgId, patient: record });
    this.mrnRegistry.set(`${orgId}/${mrn}`, id);
    if (record.idType && record.idNumber) {
      this.idRegistry.set(`${orgId}/${idRegistryKey(record.idType, record.idNumber)}`, id);
    }
    return { ...record };
  }

  async addPatientId(orgId: string, patientId: string, idType: IdType, rawIdNumber: string): Promise<PatientRecord> {
    const idNumber = normaliseIdNumber(rawIdNumber);
    if (!isValidIdNumber(idNumber)) throw new PatientFileError('ID number must be 3–30 letters or digits.');
    const item = this.patients.get(patientId);
    if (!item || item.orgId !== orgId) throw new PatientFileError('Patient file not found.');
    if (item.patient.idNumber) throw new PatientFileError('This file already has an ID, and it cannot be changed.');
    const key = `${orgId}/${idRegistryKey(idType, idNumber)}`;
    if (this.idRegistry.has(key)) throw new PatientFileError('This ID is already on another patient file.');
    item.patient = { ...item.patient, idType, idNumber };
    this.idRegistry.set(key, patientId);
    return { ...item.patient };
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
