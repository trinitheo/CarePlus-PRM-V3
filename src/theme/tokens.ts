/**
 * CarePlus v2 - Design Token Utility Classes
 * Values are defined once in @theme in src/index.css.
 * This file exposes typed Tailwind class mapping without redefining raw values.
 */

export const tokens = {
  surfaces: {
    canvas: 'bg-surface-canvas',
    card: 'bg-surface-card',
    muted: 'bg-surface-muted',
    hover: 'hover:bg-surface-hover',
  },
  borders: {
    subtle: 'border-border-subtle',
    default: 'border-border-default',
    strong: 'border-border-strong',
  },
  text: {
    title: 'text-text-title',
    body: 'text-text-body',
    muted: 'text-text-muted',
    inverted: 'text-text-inverted',
  },
  primary: {
    base: 'bg-primary-base text-text-inverted hover:bg-primary-hover',
    subtle: 'bg-primary-subtle text-primary-text border-primary-base/20',
  },
  roles: {
    clinician: 'bg-role-clinician-bg text-role-clinician-text border-role-clinician-border',
    nurse: 'bg-role-nurse-bg text-role-nurse-text border-role-nurse-border',
    patient: 'bg-role-patient-bg text-role-patient-text border-role-patient-border',
    admin: 'bg-role-admin-bg text-role-admin-text border-role-admin-border',
  },
  status: {
    active: 'bg-status-active-bg text-status-active-text border-status-active-border',
    removed: 'bg-status-removed-bg text-status-removed-text border-status-removed-border',
    danger: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
  },
} as const;
