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
    notes: 'Only admin creates patient records. Required non-empty mrn, firstName, lastName.',
  },
  {
    collection: '/organizations/{orgId}/patients',
    operation: 'update',
    clinician: 'Denied',
    nurse: 'Denied',
    patient: 'Denied',
    admin: 'Allowed (Org)',
    notes: 'Admin updates demographics. MRN is immutable once set.',
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
