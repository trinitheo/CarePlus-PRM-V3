# CarePlus v2 — Project Rules

## What this is
A patient relationship management system for a real clinic. The care team is
the center of the product. It works in two directions:
- Everyone on a patient's care team gets the access and tools their role needs.
- The patient can see who is on their team, what each person is asking of
  them and doing for them, and can reach them.

## v1 roles
clinician, nurse, patient, admin. No other roles until I ask for them.

## Non-negotiables
- CarePlus serves many organizations. Every patient, care team and staff
  account belongs to exactly one organization. Nothing crosses organizations.
- A staff account (clinician, nurse, admin) belongs to exactly one
  organization, and its orgId can never change. Someone who works at two
  organizations has two accounts.
- Patients sign in with their own email. One patient login may be linked to
  patient records at several organizations through linkedUserId.
- A staff member who becomes a patient registers a separate account with a
  different email. patients.linkedUserId may only ever point to a /users doc
  with role == 'patient'. There is no flow that converts a staff account into
  a patient account, or links a patient record to a staff UID.
- The platform owner is identified only by a custom auth claim
  (request.auth.token.platformOwner == true), set server-side. It is never a
  field any client can write.
- Access to any patient data comes from active membership in that patient's
  care team (or being that patient). Never from role alone.
- Admin manages accounts and roles. Admin does not get chart access.
- No anonymous sign-in in production. Real accounts only.
- One person, one MRN within an organisation. No MRN is created until a person becomes a patient.
  Before any patient file is created, existing patients are searched by name
  and date of birth, and a match is reused.
- Only admin creates patient files.
- No component imports from firebase/firestore or firebase/auth. All data
  access goes through src/services/.
- In development the app runs in mock mode by default: in-memory demo data
  and a dev-only “Sign in as” switcher. Neither may exist in a production
  build.
- Mock mode is for exercising features only. Security is proven only by the
  emulator rules tests. Never write tests against mock data.
- No API keys in client code. AI features call a server, never the model
  directly from the browser.
- Every security rule has tests, including tests that prove access is DENIED.
- Command and test output is pasted verbatim, never retyped or summarised.
- AGENTS.md is changed only when I explicitly ask. Never as a side effect of another task.
- Colors come from design tokens, never raw hex. Components stay under ~300
  lines.

## How to work
- Build vertically. Each task is a working slice across the stack. No
  scaffolding ahead.
- Show me the plan first. Wait for me to say go.
- When you finish a task, tell me what you did, then stop. Do not start the
  next task.
- When you create or modify files, list every file you touched.
- Never modify or create files you didn't list in your plan. If you realize
  you need another file, tell me why before creating it.
- If something doesn't work, show me the error and what you think caused it.
  Do not guess-and-check in silence.

## Testing
- Tests must actually run. "I've reviewed the code and it looks correct" is
  not testing.
- If a test requires an emulator, start the emulator.
- Never write tests that test a copy of the logic. Tests must run against the
  real security rules, real Firestore, real components.
- When a test fails, the fix is almost always in the rules or the code,
  rarely in the test. Do not weaken a test to make it pass.

## Git
- Commit at the end of every approved task. Commit message must name the
  task.
- A task is done only when CI is green on GitHub.
- Never force-push. Never commit broken code.
