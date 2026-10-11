import React from 'react';
import { RULES_MATRIX_DATA, type RuleMatrixRow } from './rulesMatrix.data';
import { tokens } from '../theme/tokens';
import { ShieldCheck, Info, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RulesMatrix: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border font-medium ${tokens.surfaces.card} ${tokens.borders.default} ${tokens.surfaces.hover} ${tokens.text.body}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Application
        </Link>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div className="p-4 rounded-xl border flex items-start gap-3 bg-primary-subtle border-primary-base/20 text-primary-text">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary-base" />
        <div>
          <h4 className="text-sm font-bold">Hand-maintained summary. npm test is authoritative.</h4>
          <p className="text-xs mt-0.5 opacity-90">
            This security matrix summarizes access control rules across collections and roles. All security guarantees are strictly proven by emulator rules unit tests.
          </p>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden shadow-xs ${tokens.surfaces.card} ${tokens.borders.default}`}>
        <div className={`p-4 border-b flex items-center justify-between ${tokens.surfaces.muted} ${tokens.borders.subtle}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-base" />
            <h2 className={`font-semibold ${tokens.text.title}`}>CarePlus v2 Firestore Rules Matrix</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-semibold ${tokens.surfaces.muted} ${tokens.borders.subtle} ${tokens.text.muted}`}>
              <tr>
                <th className="px-4 py-3">Resource / Path</th>
                <th className="px-4 py-3">Op</th>
                <th className="px-4 py-3">Clinician</th>
                <th className="px-4 py-3">Nurse</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Policy Guarantee</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tokens.borders.subtle}`}>
              {RULES_MATRIX_DATA.map((row, idx) => (
                <tr key={idx} className={`${tokens.surfaces.hover} transition-colors`}>
                  <td className="px-4 py-3 font-mono font-medium text-text-title">{row.collection}</td>
                  <td className="px-4 py-3 uppercase font-semibold text-text-muted">{row.operation}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${row.clinician.startsWith('Allowed') ? tokens.status.active : tokens.status.danger}`}>
                      {row.clinician}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${row.nurse.startsWith('Allowed') ? tokens.status.active : tokens.status.danger}`}>
                      {row.nurse}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${row.patient.startsWith('Allowed') ? tokens.status.active : tokens.status.danger}`}>
                      {row.patient}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${row.admin.startsWith('Allowed') ? tokens.status.active : tokens.status.danger}`}>
                      {row.admin}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
