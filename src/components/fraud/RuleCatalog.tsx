import { Link } from '@tanstack/react-router';
import { FileCheck2, ShieldAlert, Workflow } from 'lucide-react';
import { getRuleCatalog } from '@/domain/rules/ruleEngine';
import type { InvestigationRule } from '@/domain/rules/ruleTypes';
import { getPolicySection } from '@/domain/policy/policyService';
import { PageHeader, signalLabel } from './shared';

const rules = getRuleCatalog();

function PolicyLinks({ rule }: { rule: InvestigationRule }) {
  return <div className="flex flex-wrap gap-1.5">
    {rule.policy_ids.map(id => {
      const policy = getPolicySection(id);
      const version = policy?.document?.version;
      return <Link key={id} to="/policy" search={{ search: id }} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 hover:underline">
        {id}{policy ? ` · ${policy.section}` : ''}{version ? ` · v${version}` : ''}
      </Link>;
    })}
  </div>;
}

export default function RuleCatalog() {
  return <div>
    <PageHeader
      eyebrow="Decision governance"
      title="Rule Catalog"
      description="Governed operational rules translate policy into investigation workflow. Rules may prioritize work and surface required evidence; they never make the final fraud determination."
      right={<span className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"><Workflow size={14}/>Policy-to-rule traceability</span>}
    />

    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950">
      <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-700"/>
      <span><strong>Rules are investigative controls, not adjudication decisions.</strong> Every rule requires human review and corroborating evidence from the current claim.</span>
    </div>

    <div className="space-y-4">
      {rules.map(rule => <article key={rule.rule_id} id={rule.rule_id} className="card overflow-hidden">
        <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 lg:grid-cols-[130px_1fr_170px] lg:items-start">
          <div>
            <div className="label">Rule ID</div>
            <div className="mono mt-1.5 text-base font-bold text-slate-950">{rule.rule_id}</div>
            <span className="status-chip mt-2 border-emerald-200 bg-emerald-50 text-emerald-800">{rule.status}</span>
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-950">{rule.name}</h2>
            <p className="mt-1.5 max-w-4xl text-sm leading-6 text-slate-600">{rule.description}</p>
          </div>
          <div className="text-left lg:text-right"><div className="label">Control owner</div><div className="mt-1.5 text-sm font-semibold text-slate-800">{rule.owner}</div></div>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
          <div className="space-y-5">
            <section>
              <div className="label mb-2">Trigger logic</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-sm leading-6 text-slate-800">{rule.trigger_logic}</div>
            </section>
            <section>
              <div className="label mb-2">Matched signal types</div>
              <div className="flex flex-wrap gap-1.5">{rule.trigger_signals.map(signal => <span key={signal} title={signal} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">{signalLabel(signal)}</span>)}</div>
            </section>
            <section>
              <div className="label mb-2">Policy basis</div>
              <PolicyLinks rule={rule}/>
            </section>
          </div>

          <div className="space-y-5">
            <section>
              <div className="label mb-2">Evidence required</div>
              <ul className="space-y-2 text-sm text-slate-700">{rule.evidence_required.map(item => <li key={item} className="flex items-start gap-2.5"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><FileCheck2 size={13}/></span><span className="pt-0.5 leading-5">{item}</span></li>)}</ul>
            </section>
            <section>
              <div className="label mb-2">System action</div>
              <p className="rounded-lg border border-blue-100 bg-blue-50/50 p-3.5 text-sm leading-6 text-slate-700">{rule.system_action}</p>
            </section>
            <section className="rounded-lg border border-red-200 bg-red-50/60 p-3.5">
              <div className="label mb-1.5 text-red-700">Rule boundary</div>
              <p className="text-sm leading-6 text-red-950">{rule.prohibited_action}</p>
            </section>
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}
