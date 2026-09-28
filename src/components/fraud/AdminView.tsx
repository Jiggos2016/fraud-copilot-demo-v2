import { Lock, ShieldAlert } from 'lucide-react';
import { Metric, PageHeader } from './shared';
import PolicyKnowledgeManager from './PolicyKnowledgeManager';

const thresholds: [string, string, string][] = [
  ['Low', '0 – 39', 'bg-emerald-500'],
  ['Medium', '40 – 69', 'bg-amber-500'],
  ['High', '70 – 100', 'bg-red-600'],
];

export default function AdminView() {
  return <div>
    <PageHeader eyebrow="Configuration" title="Demo Administration" description="Governance controls for the synthetic Fraud Copilot MVP. Risk settings remain read-only; policy knowledge can be tested in browser-session mode."
      right={<span className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600"><Lock size={12}/>MVP controls</span>} />
    <div className="mb-3 flex items-start gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800">
      <ShieldAlert size={16} className="mt-0.5 shrink-0 text-slate-600"/>
      <span><strong>Automated scores prioritize investigation workload and do not determine fraud.</strong> Thresholds only change work-queue presentation; they never determine eligibility or trigger a disposition.</span>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <Metric title="Model version" value="demo-v1" note="Static risk scores from seed data"/>
      <Metric title="Precision" value="—" note="Placeholder — no model evaluation run"/>
      <Metric title="Recall" value="—" note="Placeholder — no model evaluation run"/>
    </div>
    <div className="card mt-3">
      <div className="border-b border-slate-100 px-3.5 py-2.5 text-sm font-semibold">Risk thresholds</div>
      <table className="w-full text-sm"><thead className="text-left text-[10.5px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-3.5 py-2">Band</th><th className="px-3.5 py-2">Score range</th><th className="px-3.5 py-2">Effect</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{thresholds.map(([b, r, c]) => <tr key={b}><td className="px-3.5 py-2"><span className="inline-flex items-center gap-2 font-semibold"><span className={`h-2 w-2 rounded-full ${c}`}/>{b}</span></td><td className="mono px-3.5 py-2 text-xs">{r}</td><td className="px-3.5 py-2 text-slate-600">Queue ordering and display only</td></tr>)}</tbody>
      </table>
    </div>
    <PolicyKnowledgeManager />
  </div>;
}
