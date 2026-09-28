import { FormEvent, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, ClipboardList, FileText, History, Lock, Scale, Sparkles, User, Briefcase } from 'lucide-react';
import {
  AuditEntry, Citation, CitationChip, EvidenceState, Panel, RiskScore,
  cases, claimants, claims, effectiveStatus, employers, investigators, money, recordDisposition, sessionDispositions,
  scripts, signalExplanation, signalLabel, splitSignals, stamp,
} from './shared';

const SUGGESTED: { label: string; intent: string }[] = [
  { label: 'Why was this claim prioritized?', intent: 'why prioritized' },
  { label: 'Show similar closed cases', intent: 'similar closed cases' },
  { label: 'What policy applies to these signals?', intent: 'policy signals' },
  { label: 'What evidence is still missing?', intent: 'missing evidence' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="label">{label}</div><div className="mt-0.5 text-sm font-medium text-slate-900">{children}</div></div>;
}

export default function CaseDetail({ claimId }: { claimId: string }) {
  const claim = claims.find(c => c.claim_id === claimId);
  const claimant = claimants.find(c => c.claimant_id === claim?.claimant_id);
  const employer = employers.find(e => e.employer_id === claim?.employer_id);
  const caseItem = cases.find(c => c.claim_id === claimId);
  const investigator = investigators.find(i => i.investigator_id === caseItem?.assigned_investigator);
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState<{ q: string; a: string; citations: Citation[] }[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>(() => caseItem ? [{ at: caseItem.opened_date, action: 'Case opened', detail: caseItem.notes_summary }] : []);
  const initialMemo = claim ? `Claim ${claim.claim_id} was prioritized for review based on ${splitSignals(claim.top_signals).map(signalLabel).join(', ').toLowerCase() || 'no active automated risk signals'}. Current evidence should be corroborated before disposition. Recommend review of available network, identity, employer, related-claim, and policy evidence before submitting a determination.` : '';
  const [memo, setMemo] = useState(initialMemo);
  const [memoEdited, setMemoEdited] = useState(false);
  const [pendingDisposition, setPendingDisposition] = useState<string | null>(null);
  const [submittedDisposition, setSubmittedDisposition] = useState<{ value: string; at: string } | null>(() => sessionDispositions[claimId] ?? null);

  useEffect(() => {
    setAudit(a => a.some(x => x.action === 'Workspace viewed') ? a : [...a, { at: stamp(), action: 'Workspace viewed', detail: `Opened ${claimId}` }]);
  }, [claimId]);

  if (!claim || !claimant || !employer) {
    return <div className="card p-6">Claim not found. <Link className="underline" to="/">Return to queue</Link>.</div>;
  }

  const relatedByIp = claimants.filter(c => c.filing_ip === claimant.filing_ip && c.claimant_id !== claimant.claimant_id).map(c => c.claimant_id);
  const relatedByDevice = claimants.filter(c => c.device_fingerprint === claimant.device_fingerprint && c.claimant_id !== claimant.claimant_id).map(c => c.claimant_id);
  const signals = splitSignals(claim.top_signals);
  const evidence: [string, string, string][] = [
    ['Network / IP', signals.some(s => s.includes('ip')) ? 'Available' : 'Pending', claimant.filing_ip],
    ['Identity', signals.includes('cross_country_ip_mismatch') || signals.includes('blocklisted_ip_range') ? 'Pending' : 'Available', `Device ${claimant.device_fingerprint}`],
    ['Employer Verification', caseItem?.notes_summary.toLowerCase().includes('awaiting employer') ? 'Pending' : 'Available', employer.name],
    ['Payment', 'Not Available', 'Not included in demo dataset'],
    ['Related Claims', relatedByIp.length || relatedByDevice.length ? 'Available' : 'Not Available', [...new Set([...relatedByIp, ...relatedByDevice])].join(', ') || 'No direct link'],
    ['Policy', 'Available', 'Grounded local policy corpus'],
  ];

  const runQuery = (raw: string, intent?: string) => {
    const q = raw.trim();
    if (!q) return;
    const list = scripts[claimId] || [];
    const hit = intent
      ? list.find(s => s.match === intent)
      : list.find(s => q.toLowerCase().includes(s.match.toLowerCase()) || s.match.toLowerCase().includes(q.toLowerCase()));
    const result = hit || { answer: 'No grounded answer found for this query.', citations: [] as Citation[] };
    setChat(c => [...c, { q, a: result.answer, citations: result.citations }]);
    const t = stamp();
    setAudit(a => [...a,
      { at: t, action: 'Copilot question', detail: q },
      { at: t, action: 'Citation returned', detail: result.citations.map(c => c.id).join(', ') || 'No citation returned' },
    ]);
    setQuery('');
  };

  const ask = (e: FormEvent) => { e.preventDefault(); runQuery(query); };
  const editMemo = (v: string) => {
    setMemo(v);
    if (!memoEdited) {
      setMemoEdited(true);
      setAudit(a => [...a, { at: stamp(), action: 'Memo edited', detail: 'Investigator modified the AI draft' }]);
    }
  };
  const confirmDisposition = () => {
    if (!pendingDisposition || submittedDisposition) return;
    const at = stamp();
    recordDisposition(claimId, pendingDisposition, at);
    setSubmittedDisposition({ value: pendingDisposition, at });
    setAudit(a => [...a, { at, action: 'Disposition submitted', detail: pendingDisposition }]);
    setPendingDisposition(null);
  };

  const closed = !!caseItem && caseItem.disposition !== 'Open';
  const caseStatus = closed ? `Closed · ${caseItem.disposition}` : effectiveStatus(claimId, claim.status);

  return <div>
    <Link to="/" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={13}/>Risk Queue</Link>
    {closed && <div className="mb-3 flex items-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700"><Lock size={13} className="shrink-0 text-slate-500"/><span><strong>Historical case — read-only.</strong> This case was closed on <span className="mono">{caseItem.closed_date}</span>. Copilot and evidence remain available for review; no new decision can be submitted.</span></div>}

    <div className="card mb-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="mono text-xs text-slate-500">{caseItem?.case_id ?? '—'} · {claim.claim_id}</div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">{claimant.name}{closed && <span className="inline-flex items-center gap-1 rounded border border-slate-400 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700"><Lock size={10}/>Historical Case</span>}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right"><div className="label">Risk score</div><div className="text-[10px] text-slate-500">Investigation priority</div></div>
          <RiskScore score={claim.risk_score} size="lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Case ID"><span className="mono">{caseItem?.case_id ?? '—'}</span></Field>
        <Field label="Claimant">{claimant.name}</Field>
        <Field label="Employer">{employer.name}</Field>
        <Field label="Claim date"><span className="mono">{claim.filed_date}</span></Field>
        <Field label="Weekly benefit"><span className="mono">{money(claim.weekly_benefit_amount)}</span></Field>
        <Field label="Case status"><span className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">{caseStatus}</span></Field>
      </div>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <Panel title="Case Summary" icon={<ClipboardList size={15}/>}>
          <p className="text-sm leading-6 text-slate-700">{caseItem?.notes_summary ?? 'No case record in the demo dataset.'}</p>
          {caseItem && <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500"><span>Opened <span className="mono text-slate-700">{caseItem.opened_date}</span></span>{caseItem.closed_date && <span>Closed <span className="mono text-slate-700">{caseItem.closed_date}</span></span>}</div>}
        </Panel>

        <Panel title="Risk Signals" subtitle="Investigative leads only" icon={<AlertTriangle size={15}/>} right={<span className="mono text-xs text-slate-500">{signals.length}</span>}>
          <div className="divide-y divide-slate-100">{signals.length ? signals.map(s => <div key={s} className="py-2 first:pt-0 last:pb-0"><div className="text-sm font-semibold text-slate-900" title={s}>{signalLabel(s)}</div><div className="mt-0.5 text-sm leading-6 text-slate-600">{signalExplanation(s, claimant.claimant_id, relatedByIp, relatedByDevice)}</div></div>) : <div className="text-sm text-slate-500">No active risk signals in the seed data.</div>}</div>
          <div className="mt-2 text-[11px] text-slate-500">Corroboration required before any determination.</div>
        </Panel>

        <Panel title="Evidence" subtitle="Availability only — not a verdict" icon={<FileText size={15}/>}>
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-100">{evidence.map(([name,state,detail]) => <tr key={name}><td className="py-1.5 pr-3 font-medium">{name}</td><td className="mono py-1.5 pr-3 text-xs text-slate-500">{detail}</td><td className="py-1.5 text-right"><EvidenceState state={state}/></td></tr>)}</tbody></table>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2">
          <Panel title="Claim Details" icon={<Briefcase size={15}/>}>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {([['Residence', claimant.state_of_residence], ['IP geo', `${claimant.ip_geo_state}, ${claimant.ip_geo_country}`], ['Filing IP', claimant.filing_ip], ['Device', claimant.device_fingerprint], ['Industry', employer.industry], ['Employer state', employer.state]] as [string,string][]).map(([k,v]) => <div key={k}><dt className="label">{k}</dt><dd className="mono mt-0.5 text-slate-800">{v}</dd></div>)}
            </dl>
          </Panel>
          <Panel title="Investigator" icon={<User size={15}/>}>
            {investigator ? <div><div className="text-sm font-semibold">{investigator.name}</div><div className="text-xs text-slate-500">{investigator.role}</div><div className="mono mt-2 text-[11px] text-slate-500">{investigator.investigator_id}</div></div> : <div className="text-sm text-slate-500">Unassigned</div>}
          </Panel>
        </div>
      </div>

      <div className="space-y-3">
        <Panel tone="ai" title="Fraud Copilot" icon={<Bot size={15}/>} right={<span className="inline-flex items-center gap-1 rounded border border-violet-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700"><Sparkles size={10}/>Grounded Copilot</span>}>
          <div className="mb-2.5 flex flex-wrap gap-1.5">{SUGGESTED.filter(s => (scripts[claimId] || []).some(x => x.match === s.intent)).map(s => <button key={s.intent} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 hover:border-violet-300 hover:bg-violet-100" onClick={() => runQuery(s.label, s.intent)}>{s.label}</button>)}</div>
          <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
            {chat.length === 0 && <div className="rounded border border-dashed border-violet-200 p-4 text-center text-xs text-slate-500">Answers are scripted and grounded in case or policy sources. Every answer shows its citations.</div>}
            {chat.map((m,i) => <div key={i} className="space-y-1.5">
              <div className="ml-auto w-fit max-w-[90%] rounded bg-slate-900 px-3 py-2 text-sm text-white">{m.q}</div>
              <div className="max-w-[96%] rounded border border-violet-200 border-l-4 border-l-violet-500 bg-violet-50/50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700"><Sparkles size={11}/>AI-assisted · grounded answer</div>
                <div className="text-sm leading-6 text-slate-800">{m.a}</div>
                {m.citations.length > 0 && <div className="mt-2 border-t border-violet-100 pt-2"><div className="label mb-1">Citations</div><div className="flex flex-wrap gap-1.5">{m.citations.map(c => <CitationChip key={`${c.type}-${c.id}`} citation={c}/>)}</div></div>}
              </div>
            </div>)}
          </div>
          <form className="mt-2.5 flex gap-2" onSubmit={ask}><input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask a grounded question…"/><button className="btn-primary" type="submit">Ask</button></form>
        </Panel>

        <Panel title="Draft Investigation Memo" icon={<FileText size={15}/>} right={memoEdited
          ? <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Investigator edited</span>
          : <span className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700"><Sparkles size={10}/>AI-assisted draft · Investigator review required</span>}>
          <textarea readOnly={closed} className={`min-h-36 w-full rounded border p-2.5 text-sm leading-6 outline-none focus:ring-2 focus:ring-slate-200 ${memoEdited ? 'border-slate-300 bg-white' : 'border-violet-200 bg-violet-50/50'} ${closed ? 'cursor-default opacity-80' : ''}`} value={memo} onChange={e => editMemo(e.target.value)}/>
          <div className="mt-1.5 text-[11px] text-slate-500">{closed ? 'Read-only for historical cases.' : 'Draft only. Never submitted automatically and not a disposition.'}</div>
        </Panel>

        <Panel title="Disposition" icon={<Scale size={15}/>} right={closed ? <span className="inline-flex items-center gap-1 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600"><Lock size={10}/>Read-only</span> : undefined}>
          {!closed && <div className="mb-2.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">Final disposition is a human investigator decision.</div>}
          {closed ? <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm"><div className="label mb-1">Historical disposition</div><strong>{caseItem.disposition}</strong> · closed <span className="mono">{caseItem.closed_date}</span><div className="mt-1 text-xs text-slate-500">Recorded in the historical case record. No further decision can be made here.</div></div>
          : submittedDisposition ? <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><div className="flex items-center gap-2"><CheckCircle2 size={16}/>Disposition recorded: <strong>{submittedDisposition.value}</strong></div><div className="mono mt-1 text-xs">{submittedDisposition.at}</div><div className="mt-1 text-xs">Recorded in local demo state. No further disposition can be made this session.</div></div>
          : <div>
            <div className="grid gap-2 sm:grid-cols-3">{['Confirmed Fraud','False Positive','Inconclusive'].map(d => <button key={d} aria-pressed={pendingDisposition === d} className={`btn-secondary ${pendingDisposition === d ? 'border-slate-900 ring-1 ring-slate-900' : ''}`} onClick={() => setPendingDisposition(d)}>{d}</button>)}</div>
            {pendingDisposition && <div className="mt-2.5 rounded border border-amber-300 bg-amber-50 p-3"><div className="text-sm font-semibold text-amber-900">Confirm disposition: {pendingDisposition}?</div><div className="mt-0.5 text-xs text-amber-900/80">This will be recorded in the audit trail.</div><div className="mt-2 flex gap-2"><button className="btn-primary" onClick={confirmDisposition}>Confirm and record</button><button className="btn-secondary" onClick={() => setPendingDisposition(null)}>Cancel</button></div></div>}
          </div>}
        </Panel>

        <Panel title="Audit Trail" icon={<History size={15}/>} right={<span className="mono text-xs text-slate-500">{audit.length} events</span>}>
          <ol className="relative max-h-72 overflow-y-auto">
            {audit.map((a,i) => <li key={i} className="relative grid grid-cols-[132px_1fr] gap-3 pb-2.5 last:pb-0">
              <span className="mono pt-0.5 text-[11px] text-slate-500">{a.at}</span>
              <div className="relative border-l border-slate-200 pl-3"><span className="absolute -left-[4px] top-1.5 h-[7px] w-[7px] rounded-full border border-slate-400 bg-white"/><div className="text-xs font-semibold text-slate-900">{a.action}</div><div className="text-xs text-slate-600">{a.detail}</div></div>
            </li>)}
          </ol>
        </Panel>
      </div>
    </div>
  </div>;
}
