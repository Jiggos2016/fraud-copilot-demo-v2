import { Link } from '@tanstack/react-router';
import { GitBranch, ShieldCheck } from 'lucide-react';
import CaseDetail from './CaseDetail';
import AuditorCaseSummary from './AuditorCaseSummary';
import { claims, policies, rulesForSignals, signalLabel, splitSignals } from './shared';

export default function CaseWorkspace({ claimId }: { claimId: string }) {
  const claim = claims.find(c => c.claim_id === claimId);
  const signals = claim ? splitSignals(claim.top_signals) : [];
  const triggered = rulesForSignals(signals);

  return <div>
    <AuditorCaseSummary claimId={claimId}/>

    {claim && <section className="card mb-3 overflow-hidden border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded border border-slate-300 bg-white p-1.5 text-slate-600"><GitBranch size={15}/></div>
          <div>
            <div className="label">Traceability</div>
            <h2 className="text-sm font-semibold text-slate-900">Triggered Rules</h2>
            <p className="mt-0.5 text-xs text-slate-500">Rules explain how detected signals enter the investigation workflow. They do not determine fraud.</p>
          </div>
        </div>
        <Link to="/rules" className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Open full rule catalog</Link>
      </div>

      {triggered.length ? <div className="grid gap-2 p-3 lg:grid-cols-2">
        {triggered.map(rule => {
          const matchedSignals = rule.trigger_signals.filter(signal => signals.includes(signal));
          return <div key={rule.rule_id} className="rounded border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mono text-xs font-bold text-slate-500">{rule.rule_id}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">{rule.name}</div>
              </div>
              <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800"><ShieldCheck size={10}/>Triggered</span>
            </div>

            <div className="mt-2">
              <div className="label mb-1">Matched signal</div>
              <div className="flex flex-wrap gap-1">{matchedSignals.map(signal => <span key={signal} title={signal} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">{signalLabel(signal)}</span>)}</div>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <div className="label mb-1">System action</div>
                <p className="text-xs leading-5 text-slate-600">{rule.system_action}</p>
              </div>
              <div>
                <div className="label mb-1">Policy basis</div>
                <div className="flex flex-wrap gap-1">{rule.policy_ids.map(id => {
                  const policy = policies.find(p => p.snippet_id === id);
                  return <Link key={id} to="/policy" search={{ search: id }} className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:underline">{id}{policy ? ` · ${policy.section.split(' - ')[0]}` : ''}</Link>;
                })}</div>
              </div>
            </div>

            <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-5 text-red-800"><strong>Boundary:</strong> {rule.prohibited_action}</div>
            <Link to="/rules" hash={rule.rule_id} className="mt-2 inline-block text-xs font-semibold text-slate-700 underline underline-offset-2">View rule details</Link>
          </div>;
        })}
      </div> : <div className="px-4 py-3 text-sm text-slate-500">No investigation rules are triggered by the current claim signals.</div>}
    </section>}

    <CaseDetail claimId={claimId}/>
  </div>;
}
