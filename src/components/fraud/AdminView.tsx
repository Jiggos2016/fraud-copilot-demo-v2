import { Gauge, Lock, ShieldAlert } from 'lucide-react';
import { Metric, PageHeader } from './shared';
import PolicyKnowledgeManager from './PolicyKnowledgeManager';
import { useDemoRole } from './RoleContext';

const thresholds: [string, string, string][] = [
  ['Low', '0 – 39', 'bg-emerald-500'],
  ['Medium', '40 – 69', 'bg-amber-500'],
  ['High', '70 – 100', 'bg-red-600'],
];

export default function AdminView() {
  const { permissions, roleLabel } = useDemoRole();

  if (!permissions.viewAdministration) {
    return <div>
      <PageHeader
        eyebrow="Role-based access"
        title="Administration unavailable"
        description={`The ${roleLabel} role is read-only and cannot access policy ingestion or platform administration controls.`}
        right={<span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"><Lock size={13}/>Access restricted</span>}
      />
      <div className="card p-5 text-sm leading-6 text-slate-700">
        Switch the header role back to <strong>Investigator</strong> to use the Administration demonstration. Auditor mode is intentionally limited to evidence, policy, rule, model-provenance, audit, and export views.
      </div>
    </div>;
  }

  return <div>
    <PageHeader
      eyebrow="Platform governance"
      title="Administration"
      description="Governance controls for the Fraud Copilot demonstration environment. Risk configuration remains read-only; policy knowledge can be staged, reviewed, and activated in browser-session mode."
      right={<span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"><Lock size={13}/>Controlled MVP environment</span>}
    />

    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-950">
      <ShieldAlert size={17} className="mt-0.5 shrink-0 text-blue-700"/>
      <span><strong>Automated scores prioritize investigation workload and do not represent probability of fraud.</strong> The production contract combines supervised classification and anomaly detection; this static MVP exposes precomputed synthetic inference through that contract. Thresholds never determine eligibility or trigger a disposition.</span>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      <Metric title="Risk model version" value="demo-ensemble-v1" note="Gradient-boosted + anomaly-detection contract; precomputed synthetic inference"/>
      <Metric title="Precision" value="—" note="No production model evaluation has been executed"/>
      <Metric title="Recall" value="—" note="No production model evaluation has been executed"/>
    </div>

    <div className="card mt-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
        <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Gauge size={15}/></span><div><div className="text-sm font-semibold text-slate-900">Risk threshold governance</div><div className="mt-0.5 text-[11px] text-slate-500">Read-only workload bands for the demonstration queue</div></div></div>
        <span className="status-chip border-slate-200 bg-white text-slate-600">Read-only</span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-white text-left"><tr><th className="px-4 py-3 label">Band</th><th className="px-4 py-3 label">Score range</th><th className="px-4 py-3 label">Operational effect</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{thresholds.map(([b, r, c]) => <tr key={b} className="bg-white"><td className="px-4 py-3"><span className="inline-flex items-center gap-2 font-semibold text-slate-900"><span className={`h-2 w-2 rounded-full ${c}`}/>{b}</span></td><td className="mono px-4 py-3 text-xs text-slate-700">{r}</td><td className="px-4 py-3 text-slate-600">Queue ordering and display only</td></tr>)}</tbody>
      </table>
    </div>

    <PolicyKnowledgeManager />
  </div>;
}
