import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Lock,
  UserCheck,
  HeartPulse,
  Pill,
  FileText,
  AlertCircle
} from 'lucide-react';
import { tokens } from './theme/tokens';
import { UserRole } from './types';

interface RuleAssertion {
  id: string;
  category: string;
  description: string;
  status: 'ALLOWED' | 'DENIED';
  detail: string;
}

const securityMatrix: RuleAssertion[] = [
  { id: '1', category: 'Patient Read', description: 'Active Care Team Clinician reads patient', status: 'ALLOWED', detail: 'Membership status: active in care_teams' },
  { id: '2', category: 'Patient Read', description: 'Active Care Team Nurse reads patient', status: 'ALLOWED', detail: 'Membership status: active in care_teams' },
  { id: '3', category: 'Patient Read', description: 'Linked patient reads own patient document', status: 'ALLOWED', detail: 'patient.linkedUserId matches request.auth.uid' },
  { id: '4', category: 'Patient Read', description: 'Admin reads patient document and lists patients', status: 'ALLOWED', detail: 'users/{uid}.role == "admin"' },
  { id: '5', category: 'Patient Read', description: 'Staff member NOT on care team reads patient', status: 'DENIED', detail: 'Staff role alone does not grant access' },
  { id: '6', category: 'Patient Update', description: 'Linked patient changes phone or email', status: 'ALLOWED', detail: 'affectedKeys().hasOnly(["phone", "email"])' },
  { id: '7', category: 'Patient Update', description: 'Linked patient changes linkedUserId or MRN', status: 'DENIED', detail: 'Identity fields are immutable by patient' },
  { id: '8', category: 'Clinical Chart', description: 'Admin reads notes, vitals, or prescriptions', status: 'DENIED', detail: 'Admin manages accounts only; no chart access' },
  { id: '9', category: 'Clinical Chart', description: 'Nurse on Patient A reads Patient B chart', status: 'DENIED', detail: 'Care team membership is patient-specific' },
  { id: '10', category: 'Clinical Chart', description: 'Removed care team member reads chart', status: 'DENIED', detail: 'Status is "removed"; active required' },
  { id: '11', category: 'Clinical Notes', description: 'Active member updates own note', status: 'ALLOWED', detail: 'authorId == auth.uid && active membership' },
  { id: '12', category: 'Clinical Notes', description: 'Removed clinician updates own old note', status: 'DENIED', detail: 'Author is no longer an active care-team member' },
  { id: '13', category: 'Vitals', description: 'Patient adds vital with source="patient"', status: 'ALLOWED', detail: 'Self-authored patient entry' },
  { id: '14', category: 'Vitals', description: 'Patient adds vital with source="clinic"', status: 'DENIED', detail: 'Patient source must be "patient"' },
  { id: '15', category: 'Prescriptions', description: 'Active clinician updates prescription', status: 'ALLOWED', detail: 'Clinician role + active team membership' },
  { id: '16', category: 'Prescriptions', description: 'Nurse creates prescription', status: 'DENIED', detail: 'Prescriptions restricted to clinicians' },
  { id: '17', category: 'Authentication', description: 'Unauthenticated user accesses any document', status: 'DENIED', detail: 'request.auth != null enforced on all paths' },
  { id: '18', category: 'Accounts', description: 'User elevates own role to admin on users/{uid}', status: 'DENIED', detail: 'Self-updates restricted to displayName & phone' },
];

export default function App() {
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ALLOWED' | 'DENIED'>('all');

  const filtered = securityMatrix.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  return (
    <div id="careplus-root" className={`min-h-screen ${tokens.colors.surface.canvas} text-stone-900 font-sans`}>
      <header id="careplus-header" className={`border-b ${tokens.colors.surface.border} bg-white shadow-xs`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${tokens.colors.primary.light} border`}>
              <ShieldCheck className="w-6 h-6 text-teal-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-stone-900">CarePlus v2</h1>
              <p className="text-xs text-stone-500">Patient Relationship Management & Care Team Security Rules</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
              Task 1: Rules & Test Matrix Green
            </span>
          </div>
        </div>
      </header>

      <main id="careplus-main" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section id="roles-section" className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600 mb-3">
            Authorized v1 Roles (Strict 4 Roles)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div id="role-card-clinician" className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/50">
              <div className="flex items-center space-x-2 mb-1">
                <UserCheck className="w-4 h-4 text-sky-700" />
                <span className="text-sm font-bold text-sky-900">Clinician</span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                Full chart access for active patients. Prescribes medications and authors clinical notes.
              </p>
            </div>

            <div id="role-card-nurse" className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center space-x-2 mb-1">
                <HeartPulse className="w-4 h-4 text-emerald-700" />
                <span className="text-sm font-bold text-emerald-900">Nurse</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Reads chart for assigned patients, records clinic vitals, and authors clinical notes.
              </p>
            </div>

            <div id="role-card-patient" className="p-3.5 rounded-lg border border-violet-200 bg-violet-50/50">
              <div className="flex items-center space-x-2 mb-1">
                <Users className="w-4 h-4 text-violet-700" />
                <span className="text-sm font-bold text-violet-900">Patient</span>
              </div>
              <p className="text-xs text-violet-800 leading-relaxed">
                Views assigned care team, reads own chart, logs self vitals, updates phone/email only.
              </p>
            </div>

            <div id="role-card-admin" className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50">
              <div className="flex items-center space-x-2 mb-1">
                <Lock className="w-4 h-4 text-amber-700" />
                <span className="text-sm font-bold text-amber-900">Admin</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Manages accounts, roles, and identity fields. <strong>Zero chart access</strong>.
              </p>
            </div>
          </div>
        </section>

        <section id="rules-matrix-section" className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Security Rule Test Verification Matrix</h2>
              <p className="text-xs text-stone-500">Care team membership-driven access control matrix</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="filter-all-btn"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterStatus === 'all' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
              >
                All ({securityMatrix.length})
              </button>
              <button
                id="filter-allowed-btn"
                onClick={() => setFilterStatus('ALLOWED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterStatus === 'ALLOWED' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-700 border-stone-200 hover:bg-emerald-50'}`}
              >
                Allowed ({securityMatrix.filter(i => i.status === 'ALLOWED').length})
              </button>
              <button
                id="filter-denied-btn"
                onClick={() => setFilterStatus('DENIED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterStatus === 'DENIED' ? 'bg-rose-700 text-white border-rose-700' : 'bg-white text-rose-700 border-stone-200 hover:bg-rose-50'}`}
              >
                Denied ({securityMatrix.filter(i => i.status === 'DENIED').length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-stone-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-100">
                  <th className="py-2.5 px-3">Scope</th>
                  <th className="py-2.5 px-3">Rule Statement</th>
                  <th className="py-2.5 px-3">Enforcement</th>
                  <th className="py-2.5 px-3">Security Guard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-3 font-medium text-stone-800 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-3 px-3 text-stone-700">{item.description}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          item.status === 'ALLOWED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-500">{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="non-negotiables-card" className="bg-stone-100/60 rounded-xl border border-stone-200 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-600 space-y-1">
              <p className="font-semibold text-stone-800">Task 1 Security Directives Enforced:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Access to patient data requires active membership in that patient&apos;s care team or being that patient. Never role alone.</li>
                <li>Admin manages accounts and roles; denied clinical chart access.</li>
                <li>Removed care-team members immediately lose all chart access; removals preserve history with status: &apos;removed&apos;.</li>
                <li>No hardcoded emails; admin status strictly derived from <code>users/&#123;uid&#125;.role == &apos;admin&apos;</code>.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
