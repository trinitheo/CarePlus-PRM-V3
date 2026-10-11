import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { PatientRecord, UserRecord, CareTeamMemberRecord, PatientOrgCareTeam } from '../types';
import type { DataService, PatientLoadResult, StaffPatientRow } from './types';
import type { SessionService } from './session';

/**
 * Real production query used for staff (clinician/nurse) patient panel.
 * Evaluates care_teams for the authenticated staff member with status 'active',
 * and then fetches each patient document via Promise.allSettled.
 */
export async function getStaffPatients(
  db: any,
  orgId: string,
  staffUid: string
): Promise<PatientLoadResult[]> {
  const careTeamsRef = collection(db, 'organizations', orgId, 'care_teams');
  const q = query(
    careTeamsRef,
    where('userId', '==', staffUid),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  const careTeamDocs = snapshot.docs.map((d) => {
    const data = d.data() as CareTeamMemberRecord;
    return {
      id: d.id,
      patientId: data.patientId,
      userId: data.userId,
      role: data.role,
      status: data.status,
    };
  });

  const settleResults = await Promise.allSettled(
    careTeamDocs.map(async (ct) => {
      const patientRef = doc(db, 'organizations', orgId, 'patients', ct.patientId);
      const patientSnap = await getDoc(patientRef);
      if (!patientSnap.exists()) {
        throw new Error(`Patient document ${ct.patientId} does not exist`);
      }
      const pData = patientSnap.data() as PatientRecord;
      return {
        patient: {
          id: patientSnap.id,
          mrn: pData.mrn,
          firstName: pData.firstName,
          lastName: pData.lastName,
          dob: pData.dob,
          gender: pData.gender,
          email: pData.email,
          phone: pData.phone,
          orgName: pData.orgName,
          linkedUserId: pData.linkedUserId,
          createdAt: pData.createdAt,
        },
        memberRole: ct.role,
      } as StaffPatientRow;
    })
  );

  return settleResults.map((res, index) => {
    const ct = careTeamDocs[index];
    if (res.status === 'fulfilled') {
      return {
        status: 'fulfilled',
        value: res.value,
      };
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

/**
 * Real production query used for patient care team view across organizations.
 * Uses collectionGroup query for patients with linkedUserId == patientUid,
 * then fetches each organization's active care-team members for that patient.
 */
export async function getMyCareTeams(
  db: any,
  patientUid: string
): Promise<PatientOrgCareTeam[]> {
  const patientsQuery = query(
    collectionGroup(db, 'patients'),
    where('linkedUserId', '==', patientUid)
  );
  const patientSnaps = await getDocs(patientsQuery);

  const orgCareTeams: PatientOrgCareTeam[] = [];

  for (const pSnap of patientSnaps.docs) {
    const patientData = pSnap.data() as PatientRecord;
    const orgId = pSnap.ref.parent.parent?.id;
    if (!orgId) continue;

    // Fetch active care team members for this patient
    const ctQuery = query(
      collection(db, 'organizations', orgId, 'care_teams'),
      where('patientId', '==', pSnap.id),
      where('status', '==', 'active')
    );
    const ctSnaps = await getDocs(ctQuery);

    const members = ctSnaps.docs.map((ctDoc) => {
      const data = ctDoc.data();
      return {
        userId: data.userId as string,
        displayName: data.displayName as string,
        role: data.role as 'clinician' | 'nurse',
      };
    });

    orgCareTeams.push({
      orgId,
      orgName: patientData.orgName,
      patientId: pSnap.id,
      members,
    });
  }

  return orgCareTeams;
}

export class FirestoreDataService implements DataService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async getStaffPatients(orgId: string, staffUid: string): Promise<PatientLoadResult[]> {
    return getStaffPatients(this.db, orgId, staffUid);
  }

  async getPatient(orgId: string, patientId: string): Promise<PatientRecord | null> {
    const pSnap = await getDoc(doc(this.db, 'organizations', orgId, 'patients', patientId));
    if (!pSnap.exists()) return null;
    const data = pSnap.data() as PatientRecord;
    return { ...data, id: pSnap.id };
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const uSnap = await getDoc(doc(this.db, 'users', userId));
    if (!uSnap.exists()) return null;
    const data = uSnap.data() as UserRecord;
    return { ...data, uid: uSnap.id };
  }

  async getMyCareTeams(patientUid: string): Promise<PatientOrgCareTeam[]> {
    return getMyCareTeams(this.db, patientUid);
  }
}

/**
 * Firestore Session Service:
 * Production fails closed. Does NOT allow arbitrary signInAs().
 * (Real Firebase Auth integration follows in a dedicated auth task).
 */
export class FirestoreSessionService implements SessionService {
  private currentUser: UserRecord | null = null;
  private listeners: Set<(user: UserRecord | null) => void> = new Set();

  getCurrentUser(): UserRecord | null {
    return this.currentUser;
  }

  subscribe(callback: (user: UserRecord | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
