import { Link } from '@tanstack/react-router';
import { FileCheck2, ShieldAlert, Workflow } from 'lucide-react';
import rulesData from '@/data/rules.json';
import policiesData from '@/data/policy_snippets.json';
import { PageHeader, signalLabel } from './shared';

type Rule = (typeof rulesData)[number];

function PolicyLinks({ rule }: { rule: Rule }) {
  return <div className="flex flex-wrap gap-1.5">
    {rule.policy_ids.map(id => {
      const policy = policiesData.find(p => p.snippet_id === id);
      return <Link key={id} to="/policy" search={{ search: id }} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:underline">
        {id}{policy ? ` · ${policy.section}` : ''}
      </Link>;
    })}
  </div>;
}

export default function RuleCatalog() {
  return <div>
    <PageHeader
      eyebrow="Decision governance"
      title="Rule Catalog"
      description="Operational rules translate policy into investigation workflow. Rules can prioritize work and surface evidence, but they never make the final fraud determination."
      right={<span className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"><Workflow size={13}/>Policy-to-rule traceability</span>}
    />

    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
      <ShieldAlert size={16} className="mt-0.5 shrink-0"/>
      <span><strong>Rules are investigative controls, not adjudication decisions.</strong> Every rule requires human review and the evidence shown for the current claim.</span>
    </div>

    <div className="space-y-3">
      {rulesData.map(rule => <article key={rule.rule_id} id={rule.rule_id} className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 lg:grid-cols-[150px_1fr_auto] lg:items-start">
          <div>
            <div className="label">Rule ID</div>
            <div className="mono mt-1 text-sm font-bold text-slate-900">{rule.rule_id}</div>
            <span className="mt-2 inline-flex rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">{rule.status}</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{rule.name}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{rule.description}</p>
          </div>
          <div className="text-left lg:text-right"><div className="label">Owner</div><div className="mt-1 text-sm font-semibold">{rule.owner}</div></div>
        </div>

        <div className="grid gap-4 px-4 py-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section>
              <div className="label mb-1.5">Trigger logic</div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">{rule.trigger_logic}</div>
            </section>
            <section>
              <div className="label mb-1.5">Signals</div>
              <div className="flex flex-wrap gap-1.5">{rule.trigger_signals.map(signal => <span key={signal} title={signal} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{signalLabel(signal)}</span>)}</div>
            </section>
            <section>
              <div className="label mb-1.5">Policy basis</div>
              <PolicyLinks rule={rule}/>
            </section>
          </div>

          <div className="space-y-4">
            <section>
              <div className="label mb-1.5">Evidence required</div>
              <ul className="space-y-1.5 text-sm text-slate-700">{rule.evidence_required.map(item => <li key={item} className="flex items-start gap-2"><FileCheck2 size={14} className="mt-1 shrink-0 text-slate-500"/><span>{item}</span></li>)}</ul>
            </section>
            <section>
              <div className="label mb-1.5">System action</div>
              <p className="text-sm leading-6 text-slate-700">{rule.system_action}</p>
            </section>
            <section className="rounded border border-red-200 bg-red-50/50 p-3">
              <div className="label mb-1 text-red-700">Rule boundary</div>
              <p className="text-sm leading-6 text-red-900">{rule.prohibited_action}</p>
            </section>
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}
