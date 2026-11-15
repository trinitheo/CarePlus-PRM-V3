export interface RuleMatrixRow {
  collection: string;
  operation: 'read' | 'create' | 'update' | 'delete' | 'list';
  clinician: 'Allowed (Care Team)' | 'Denied (Not Care Team)' | 'Denied' | 'Allowed (Own / Auth)';
  nurse: 'Allowed (Care Team)' | 'Denied (Not Care Team)' | 'Denied' | 'Allowed (Own / Auth)';
  patient: 'Allowed (Linked Chart)' | 'Denied (Unlinked Chart)' | 'Allowed (Self)' | 'Denied';
  admin: 'Allowed (Org)' | 'Denied (Cross-Org)' | 'Denied (No Chart Access)';
  notes: string;
}

export const RULES_MATRIX_DATA: RuleMatrixRow[] = [
  {
    collection: '/organizations/{orgId}/users',
    operation: 'read',
    clinician: 'Allowed (Own / Auth)',
    nurse: 'Allowed (Own / Auth)',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Staff can read users in their org; patients cannot list/read staff user accounts.',
  },
  {
    collection: '/organizations/{orgId}/users',
    operation: 'create',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Admin creates staff/user records within their org. Role & orgId immutable once set.',
  },
  {
    collection: '/organizations/{orgId}/patients',
    operation: 'read',
    clinician: 'Allowed (Care Team)',
    nurse: 'Allowed (Care Team)',
    patient: 'Allowed (Linked Chart)',
    admin: 'Denied (No Chart Access)',
    notes: 'Read requires active care team membership for staff, or linkedUserId match for patient. Admin is denied.',
  },
  {
    collection: '/organizations/{orgId}/patients',
    operation: 'create',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Only admin creates patient records. Required non-empty mrn, firstName, lastName. Task 8: the MRN (and ID, if given) must be registered in the same transaction.',
  },
  {
    collection: '/organizations/{orgId}/patients',
    operation: 'update',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Admin updates demographics. MRN is immutable once set. Task 8: national ID / driver\'s permit is immutable once set; admin may add one to a file without, with its registry entry.',
  },
  {
    collection: '/organizations/{orgId}/mrn_registry',
    operation: 'create',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Task 8: one doc per MRN, create-only, must point at the file holding that MRN. Never updated or deleted; admin-only read.',
  },
  {
    collection: '/organizations/{orgId}/id_registry',
    operation: 'create',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Task 8: one doc per idType_idNumber, create-only, must match the ID on the file it points at. Admin-only read.',
  },
  {
    collection: '/organizations/{orgId}/counters/mrn',
    operation: 'update',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Task 8: sequential MRN counter. Starts at 1; every update adds exactly 1. Never deleted.',
  },
  {
    collection: '/organizations/{orgId}/care_teams',
    operation: 'read',
    clinician: 'Allowed (Care Team)',
    nurse: 'Allowed (Care Team)',
    patient: 'Allowed (Linked Chart)',
    admin: 'Allowed (Org)',
    notes: 'Staff reads active care team assignments. Admin manages assignments.',
  },
  {
    collection: '/organizations/{orgId}/patients/{pId}/vitals',
    operation: 'read',
    clinician: 'Allowed (Care Team)',
    nurse: 'Allowed (Care Team)',
    patient: 'Allowed (Linked Chart)',
    admin: 'Denied (No Chart Access)',
    notes: 'Clinical telemetry & vitals chart access strictly bounded by active care team.',
  },
  {
    collection: '/organizations/{orgId}/patients/{pId}/vitals',
    operation: 'create',
    clinician: 'Allowed (Care Team)',
    nurse: 'Allowed (Care Team)',
    patient: 'Allowed (Linked Chart)',
    admin: 'Denied (No Chart Access)',
    notes: 'Clinician/nurse create source=clinic. Patient create source=patient only.',
  },
  {
    collection: '/organizations/{orgId}/patients/{pId}/clinical_notes',
    operation: 'read',
    clinician: 'Allowed (Care Team)',
    nurse: 'Allowed (Care Team)',
    patient: 'Denied',
    admin: 'Denied (No Chart Access)',
    notes: 'Clinical notes are staff-only and restricted to active care team members.',
  },
];
