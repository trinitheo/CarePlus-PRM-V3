import {
  UserRecord,
  PatientRecord,
  CareTeamMemberRecord,
  ClinicalNote,
  VitalRecord,
  PrescriptionRecord
} from '../types';

export interface DatabaseState {
  users: Record<string, UserRecord>;
  patients: Record<string, PatientRecord>;
  careTeams: Record<string, CareTeamMemberRecord>; // key: `${patientId}_${userId}`
  notes: Record<string, ClinicalNote>;
  vitals: Record<string, VitalRecord>;
  prescriptions: Record<string, PrescriptionRecord>;
}

export class AccessControlEngine {
  constructor(private db: DatabaseState) {}

  getUser(uid?: string): UserRecord | null {
    if (!uid) return null;
    return this.db.users[uid] || null;
  }

  isAdmin(authUid?: string): boolean {
    const user = this.getUser(authUid);
    return !!user && user.role === 'admin';
  }

  isClinician(authUid?: string): boolean {
    const user = this.getUser(authUid);
    return !!user && user.role === 'clinician';
  }

  isNurse(authUid?: string): boolean {
    const user = this.getUser(authUid);
    return !!user && user.role === 'nurse';
  }

  isPatient(authUid?: string): boolean {
    const user = this.getUser(authUid);
    return !!user && user.role === 'patient';
  }

  isStaff(authUid?: string): boolean {
    const user = this.getUser(authUid);
    return !!user && (user.role === 'clinician' || user.role === 'nurse' || user.role === 'admin');
  }

  isLinkedPatient(patientId: string, authUid?: string): boolean {
    if (!authUid) return false;
    const patient = this.db.patients[patientId];
    return !!patient && patient.linkedUserId === authUid;
  }

  isActiveCareTeamMember(patientId: string, authUid?: string): boolean {
    if (!authUid) return false;
    const membership = this.db.careTeams[`${patientId}_${authUid}`];
    return !!membership && membership.status === 'active';
  }

  isActiveClinicianOnTeam(patientId: string, authUid?: string): boolean {
    return this.isClinician(authUid) && this.isActiveCareTeamMember(patientId, authUid);
  }

  // 1. patients collection
  canGetPatient(patientId: string, authUid?: string): boolean {
    if (!authUid) return false;
    return (
      this.isAdmin(authUid) ||
      this.isActiveCareTeamMember(patientId, authUid) ||
      this.isLinkedPatient(patientId, authUid)
    );
  }

  canListPatients(authUid?: string): boolean {
    return this.isAdmin(authUid);
  }

  canCreatePatient(patientData: Record<string, unknown>, authUid?: string): boolean {
    if (!this.isAdmin(authUid)) return false;
    const allowedKeys = new Set([
      'id', 'mrn', 'firstName', 'lastName', 'dob', 'gender', 'email', 'phone', 'linkedUserId', 'createdAt'
    ]);
    return Object.keys(patientData).every((key) => allowedKeys.has(key));
  }

  canUpdatePatient(
    patientId: string,
    existingData: PatientRecord,
    updatedData: Partial<PatientRecord>,
    authUid?: string
  ): boolean {
    if (!authUid) return false;

    // Admin or active care-team member can update patient record
    if (this.isAdmin(authUid) || this.isActiveCareTeamMember(patientId, authUid)) {
      return true;
    }

    // Linked patient may change only phone and email, never linkedUserId or mrn
    if (this.isLinkedPatient(patientId, authUid)) {
      const keysChanged = Object.keys(updatedData).filter(
        (k) => (updatedData as any)[k] !== (existingData as any)[k]
      );
      const onlyPhoneOrEmail = keysChanged.every((k) => k === 'phone' || k === 'email');
      const mrnUnchanged = updatedData.mrn === undefined || updatedData.mrn === existingData.mrn;
      const linkedUserIdUnchanged =
        updatedData.linkedUserId === undefined || updatedData.linkedUserId === existingData.linkedUserId;

      return onlyPhoneOrEmail && mrnUnchanged && linkedUserIdUnchanged;
    }

    return false;
  }

  // 2. care_teams collection
  canReadCareTeam(patientId: string, authUid?: string): boolean {
    if (!authUid) return false;
    return (
      this.isAdmin(authUid) ||
      this.isActiveCareTeamMember(patientId, authUid) ||
      this.isLinkedPatient(patientId, authUid)
    );
  }

  canCreateCareTeam(authUid?: string): boolean {
    return this.isAdmin(authUid);
  }

  canUpdateCareTeam(
    patientId: string,
    existing: CareTeamMemberRecord,
    updated: Partial<CareTeamMemberRecord>,
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    if (this.isAdmin(authUid)) return true;

    // Removal sets status: 'removed'
    if (this.isActiveCareTeamMember(patientId, authUid)) {
      const keysChanged = Object.keys(updated).filter(
        (k) => (updated as any)[k] !== (existing as any)[k]
      );
      const allowed = keysChanged.every((k) => k === 'status' || k === 'removedAt');
      return allowed && updated.status === 'removed';
    }

    return false;
  }

  canDeleteCareTeam(): boolean {
    // No delete allowed. Status must be set to 'removed'
    return false;
  }

  // 3. Clinical records (notes, vitals, prescriptions)
  // Admin does NOT get chart access.
  canReadChart(patientId: string, authUid?: string): boolean {
    if (!authUid) return false;
    return (
      this.isActiveCareTeamMember(patientId, authUid) ||
      this.isLinkedPatient(patientId, authUid)
    );
  }

  // Notes
  canCreateNote(patientId: string, noteData: { authorId: string }, authUid?: string): boolean {
    if (!authUid) return false;
    return (
      this.isActiveCareTeamMember(patientId, authUid) &&
      noteData.authorId === authUid
    );
  }

  canUpdateNote(
    patientId: string,
    existingNote: { authorId: string },
    updatedNote: { authorId?: string },
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    const isAuthor = existingNote.authorId === authUid;
    const authorUnchanged = updatedNote.authorId === undefined || updatedNote.authorId === existingNote.authorId;
    return isAuthor && this.isActiveCareTeamMember(patientId, authUid) && authorUnchanged;
  }

  // Vitals
  canCreateVital(
    patientId: string,
    vitalData: { authorId: string; source: string },
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    if (vitalData.authorId !== authUid) return false;

    if (this.isLinkedPatient(patientId, authUid) && vitalData.source === 'patient') {
      return true;
    }
    if (this.isActiveCareTeamMember(patientId, authUid) && vitalData.source === 'clinic') {
      return true;
    }
    return false;
  }

  canUpdateVital(
    patientId: string,
    existingVital: { authorId: string },
    updatedVital: { authorId?: string },
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    const isAuthor = existingVital.authorId === authUid;
    const authorUnchanged = updatedVital.authorId === undefined || updatedVital.authorId === existingVital.authorId;
    return isAuthor && this.isActiveCareTeamMember(patientId, authUid) && authorUnchanged;
  }

  // Prescriptions
  canCreatePrescription(
    patientId: string,
    prescriptionData: { authorId: string },
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    return (
      this.isActiveClinicianOnTeam(patientId, authUid) &&
      prescriptionData.authorId === authUid
    );
  }

  canUpdatePrescription(
    patientId: string,
    existingPrescription: { authorId: string },
    updatedPrescription: { authorId?: string },
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    const authorUnchanged =
      updatedPrescription.authorId === undefined || updatedPrescription.authorId === existingPrescription.authorId;
    return this.isActiveClinicianOnTeam(patientId, authUid) && authorUnchanged;
  }

  // 4. users collection
  canGetUser(targetUid: string, authUid?: string): boolean {
    if (!authUid) return false;
    return authUid === targetUid || this.isAdmin(authUid) || this.isStaff(authUid);
  }

  canListUsers(authUid?: string): boolean {
    return this.isAdmin(authUid);
  }

  canUpdateUser(
    targetUid: string,
    existingUser: UserRecord,
    updatedUser: Partial<UserRecord>,
    authUid?: string
  ): boolean {
    if (!authUid) return false;
    if (this.isAdmin(authUid)) return true;

    if (authUid === targetUid) {
      const keysChanged = Object.keys(updatedUser).filter(
        (k) => (updatedUser as any)[k] !== (existingUser as any)[k]
      );
      return keysChanged.every((k) => k === 'displayName' || k === 'phone');
    }

    return false;
  }
}
