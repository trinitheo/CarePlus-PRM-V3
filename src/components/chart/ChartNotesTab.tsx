import React from 'react';
import type { PatientChartData } from '../../services/types';
import { formatAge } from '../../clinical/chart';
import { tokens } from '../../theme/tokens';
import { FileText, Clock, Edit3, CheckCircle2 } from 'lucide-react';

interface ChartNotesTabProps {
  chart: PatientChartData;
}

export const ChartNotesTab: React.FC<ChartNotesTabProps> = ({ chart }) => {
  return (
    <div className="space-y-8">
      {/* My Drafts Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-default">
          <Edit3 className="w-5 h-5 text-role-clinician-text" />
          <h3 className={`text-lg font-bold ${tokens.text.title}`}>My Drafts ({chart.myDrafts.length})</h3>
        </div>

        {chart.myDrafts.length === 0 ? (
          <div className={`p-6 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <p className="text-base text-text-muted">No personal drafts in progress for this patient.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chart.myDrafts.map((draft) => (
              <div
                key={draft.id}
                className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-3`}
              >
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-title">Author: {draft.authorId}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatAge(draft.createdAt)}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-role-admin-bg text-role-admin-text border border-role-admin-border">
                    Draft (Private)
                  </span>
                </div>
                <p className="text-base text-text-body whitespace-pre-line leading-relaxed">
                  {draft.body}
                </p>
                {draft.correctsId && (
                  <div className="text-xs text-role-clinician-text font-medium bg-role-clinician-bg/50 px-2.5 py-1 rounded border border-role-clinician-border/50">
                    Draft correction for note: {draft.correctsId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Notes Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-default">
          <CheckCircle2 className="w-5 h-5 text-status-active-text" />
          <h3 className={`text-lg font-bold ${tokens.text.title}`}>Finalised Clinical Notes ({chart.finalNotes.length})</h3>
        </div>

        {chart.finalNotes.length === 0 ? (
          <div className={`p-6 rounded-xl border text-center ${tokens.surfaces.card} ${tokens.borders.default}`}>
            <p className="text-base text-text-muted">No finalised clinical notes on record.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chart.finalNotes.map((note) => (
              <div
                key={note.id}
                className={`p-5 rounded-xl border ${tokens.surfaces.card} ${tokens.borders.default} shadow-xs space-y-3`}
              >
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-title">Author: {note.authorId}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatAge(note.createdAt)}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-status-active-bg text-status-active-text border border-status-active-border">
                    Finalised
                  </span>
                </div>
                <p className="text-base text-text-body whitespace-pre-line leading-relaxed">
                  {note.body}
                </p>
                {note.correctsId && (
                  <div className="text-xs text-role-clinician-text font-medium bg-role-clinician-bg/50 px-2.5 py-1 rounded border border-role-clinician-border/50">
                    Corrects prior note: {note.correctsId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
