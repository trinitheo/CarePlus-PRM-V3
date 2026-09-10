/**
 * CarePlus v2 - Design Tokens
 * Strictly tokenized semantic color system and scales. No raw hex in components.
 */

export const tokens = {
  colors: {
    // Brand & Clinical Primary (Slate / Teal Medical Palette)
    primary: {
      light: 'bg-teal-50 text-teal-900 border-teal-200',
      base: 'bg-teal-700 text-white hover:bg-teal-800',
      subtle: 'bg-teal-500/10 text-teal-800 dark:text-teal-300',
      border: 'border-teal-600',
    },
    // Role Badges
    roles: {
      clinician: 'bg-sky-100 text-sky-800 border-sky-300',
      nurse: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      patient: 'bg-violet-100 text-violet-800 border-violet-300',
      admin: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    // Status Badges
    status: {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      removed: 'bg-stone-100 text-stone-600 border-stone-200',
      denied: 'bg-rose-50 text-rose-700 border-rose-200',
      allowed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    // Surfaces & Borders
    surface: {
      canvas: 'bg-stone-50',
      card: 'bg-white',
      cardMuted: 'bg-stone-100/70',
      border: 'border-stone-200',
      borderSubtle: 'border-stone-100',
    },
    // Text Hierarchy
    text: {
      title: 'text-stone-900',
      body: 'text-stone-700',
      muted: 'text-stone-500',
      inverted: 'text-white',
    }
  }
} as const;
