import { Download, Eye, Lock, ShieldCheck } from 'lucide-react';
import { buildTraceability } from '@/domain/evidence/traceability';
import { getMlRiskOutput } from '@/domain/ml/mlRiskService';
import { getPolicySectionsByIds } from '@/domain/policy/policyService';
import { getPolicyIdsForSignals } from '@/domain/rules/ruleEngine';
import { listOutcomeFeedback } from '@/domain/outcomes/outcomeFeedbackService';
import { listCopilotTranscripts } from '@/audit/copilotTranscriptStore';
import { downloadEvidencePackage } from '@/audit/evidenceExportService';
import { useDemoRole } from './RoleContext';
import { cases, claimants, claims, employers, sessionDispositions, signalLabel, splitSignals } from './shared';

export default function AuditorCaseSummary({ claimId }: { claimId: string }) {
  const { role, permissions } = useDemoRole();
  if (role !== 'auditor') return null;

  const claim = claims.find(item => item.claim_id === claimId);
  if (!claim) return null;
  const claimant = claimants.find(item => item.claimant_id === claim.claimant_id);
  const employer = employers.find(item => item.employer_id === claim.employer_id);
  const caseItem = cases.find(item => item.claim_id === claimId);
  const signals = splitSignals(claim.top_signals);
  const traceability = buildTraceability(signals);
  const ml = getMlRiskOutput(claim);
  const policyIds = getPolicyIdsForSignals(signals);
  const mappedPolicy = getPolicySectionsByIds(policyIds, { asOfDate: claim.filed_date });
  const transcripts = listCopilotTranscripts(claimId);
  const feedback = listOutcomeFeedback().find(item => item.claimId === claimId);
  const sessionDisposition = sessionDispositions[claimId];
  const finalDisposition = sessionDisposition?.value ?? (caseItem?.disposition !== 'Open' ? caseItem?.disposition : undefined);

  const exportPackage = () => {
    if (!permissions.exportEvidence) return;
    downloadEvidencePackage(claimId, {
      case: {
        case_id: caseItem?.case_id ?? null,
        claim_id: claimId,
        claimant_reference: claimant?.claimant_id ?? null,
        employer_reference: employer?.employer_id ?? null,
        filed_date: claim.filed_date,
        case_status: caseItem?.disposition ?? claim.status,
      },
      model_provenance: {
        priority_score: ml.priorityScore,
        priority_band: ml.priorityBand,
        model_version: ml.modelVersion,
        scoring_mode: ml.scoringMode,
        ensemble: ml.ensemble,
        feature_attributions: ml.featureAttributions,
        guardrail: 'Investigation priority only; not probability of fraud.',
      },
      evidence_lineage: traceability,
      policy_snapshot: mappedPolicy.map(section => ({
        policy_id: section.snippet_id,
        section: section.section,
        source_document: section.source_doc,
        document_version: section.document?.version ?? null,
        effective_date: section.document?.effective_date ?? null,
        expiration_date: section.document?.expiration_date ?? null,
        jurisdiction: section.document?.jurisdiction ?? null,
        text: section.text,
      })),
      copilot_history: transcripts,
      final_decision: finalDisposition ? {
        disposition: finalDisposition,
        decided_at: sessionDisposition?.at ?? caseItem?.closed_date ?? null,
        appeal_outcome: feedback?.appealOutcome ?? 'none',
        training_status: feedback?.trainingStatus ?? null,
      } : null,
      governance: {
        exported_by_role: 'Compliance / OIG Auditor',
        read_only: true,
        copilot_access: false,
        disposition_access: false,
      },
    });
  };

  return <section className="card mb-4 overflow-hidden border-amber-200">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800"><Eye size={16}/></span>
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-950">Compliance / OIG reconstruction view</h2><span className="status-chip border-amber-300 bg-white text-amber-900"><Lock size={10}/>Read-only</span></div>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">Reconstruct the evidence, model provenance, rule-policy lineage, Copilot history, and final human decision without investigation controls.</p>
        </div>
      </div>
      <button className="btn-primary inline-flex items-center gap-2" onClick={exportPackage}><Download size={14}/>Export evidence package</button>
    </div>

    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="label">Priority model</div>
        <div className="mono mt-1.5 text-xl font-semibold text-slate-950">{ml.priorityScore} · {ml.priorityBand}</div>
        <div className="mt-1 text-xs text-slate-500">{ml.modelVersion} · priority only</div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="label">Feature attribution</div>
        <div className="mt-1.5 text-sm font-semibold text-slate-950">{ml.featureAttributions.length} contributing feature{ml.featureAttributions.length === 1 ? '' : 's'}</div>
        <div className="mt-1 line-clamp-2 text-xs text-slate-500">{ml.featureAttributions.map(item => signalLabel(item.feature)).join(' · ') || 'No seeded attribution'}</div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="label">Governed lineage</div>
        <div className="mt-1.5 text-sm font-semibold text-slate-950">{traceability.length} evidence path{traceability.length === 1 ? '' : 's'}</div>
        <div className="mt-1 text-xs text-slate-500">{mappedPolicy.length} active/effective policy section{mappedPolicy.length === 1 ? '' : 's'}</div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="label">Recorded outcome</div>
        <div className="mt-1.5 text-sm font-semibold text-slate-950">{finalDisposition ?? 'No final disposition'}</div>
        <div className="mt-1 text-xs text-slate-500">{transcripts.length} Copilot exchange{transcripts.length === 1 ? '' : 's'} retained this session</div>
      </div>
    </div>

    <div className="mx-4 mb-4 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs leading-5 text-blue-950">
      <span className="inline-flex items-center gap-1.5 font-semibold"><ShieldCheck size={13}/>RBAC enforced:</span> Copilot querying, memo editing, and disposition controls are unavailable in Auditor mode. Audit and evidence export remain available.
    </div>
  </section>;
}
