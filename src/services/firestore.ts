import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { PatientRecord, UserRecord, CareTeamMemberRecord, PatientOrgCareTeam } from '../types';
import type { DataService, PatientLoadResult, StaffPatientRow } from './types';
import type { SessionService, SessionState } from './session';

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
  private db: any;

  constructor(db: any) {
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

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type Auth,
} from 'firebase/auth';

/**
 * Firestore Session Service:
 * Manages Firebase Auth state and loads user documents from Firestore /users/{uid}.
 * Follows injectable constructor pattern: accepts (auth, db).
 */
export class FirestoreSessionService implements SessionService {
  private auth: Auth;
  private db: Firestore;
  private state: SessionState = { status: 'loading', user: null };
  private listeners: Set<(state: SessionState) => void> = new Set();
  private unsubscribeAuth?: () => void;
  private unsubscribeUserDoc?: () => void;

  constructor(auth: Auth, db: Firestore) {
    this.auth = auth;
    this.db = db;

    this.unsubscribeAuth = onAuthStateChanged(this.auth, (firebaseUser) => {
      if (this.unsubscribeUserDoc) {
        this.unsubscribeUserDoc();
        this.unsubscribeUserDoc = undefined;
      }

      if (!firebaseUser) {
        this.state = { status: 'signedOut', user: null };
        this.notify();
        return;
      }

      this.state = { status: 'loading', user: null };
      this.notify();

      const uRef = doc(this.db, 'users', firebaseUser.uid);
      this.unsubscribeUserDoc = onSnapshot(
        uRef,
        (uSnap) => {
          if (uSnap.exists()) {
            const data = uSnap.data() as UserRecord;
            this.state = {
              status: 'signedIn',
              user: { ...data, uid: uSnap.id },
            };
          } else {
            // Signed in but no /users document -> distinct notSetUp state
            this.state = { status: 'notSetUp', user: null };
          }
          this.notify();
        },
        (err: any) => {
          // Failed read (e.g., permission-denied or error) -> error state
          this.state = {
            status: 'error',
            user: null,
            errorMessage: err?.message || String(err),
          };
          this.notify();
        }
      );
    });
  }

  getState(): SessionState {
    return { ...this.state };
  }

  getCurrentUser(): UserRecord | null {
    return this.state.user ? { ...this.state.user } : null;
  }

  subscribe(callback: (state: SessionState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await firebaseSendPasswordResetEmail(this.auth, email);
  }

  destroy() {
    if (this.unsubscribeUserDoc) {
      this.unsubscribeUserDoc();
    }
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  }
}
