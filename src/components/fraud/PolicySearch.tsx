import { useEffect, useState } from 'react';
import { CalendarRange, FileText, Search, ShieldCheck } from 'lucide-react';
import { listPolicySections } from '@/domain/policy/policyService';
import { PageHeader } from './shared';

export default function PolicySearch({ initialSearch }: { initialSearch: string }) {
  const [q, setQ] = useState(initialSearch);
  useEffect(() => { setQ(initialSearch); }, [initialSearch]);
  const policies = listPolicySections();
  const results = policies.filter(p => !q.trim() || `${p.snippet_id} ${p.section} ${p.text} ${p.source_doc} ${p.document?.version ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  return <div>
    <PageHeader
      eyebrow="Policy intelligence"
      title="Policy Search"
      description="Search active, versioned policy sources used by Fraud Copilot. Every result preserves source, section, effective date, jurisdiction, and version metadata for auditability."
      right={<span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck size={14}/>Grounded sources only</span>}
    />

    <div className="card mb-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={17}/><input autoFocus className="input pl-9" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search policy by keyword, section, source, or ID — e.g. shared IP, earnings, POL-3"/></div>
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="text-xs text-slate-500"><span className="mono font-semibold text-slate-800">{results.length}</span> result{results.length === 1 ? '' : 's'}</div>
          <div className="text-xs text-slate-500"><span className="mono font-semibold text-slate-800">{policies.length}</span> indexed sections</div>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      {results.map(p => <article key={p.snippet_id} id={p.snippet_id} className="card overflow-hidden transition hover:border-slate-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 border-b border-slate-100 bg-slate-50/70 px-4 py-3 md:grid-cols-[110px_1.3fr_1fr_1fr] md:items-center">
          <div><div className="label mb-1">Policy ID</div><span className="mono inline-flex rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">{p.snippet_id}</span></div>
          <div><div className="label">Source document</div><div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText size={14} className="text-slate-500"/>{p.source_doc}</div></div>
          <div><div className="label">Section</div><div className="mt-1 text-sm font-semibold text-slate-900">{p.section}</div></div>
          <div><div className="label">Governance metadata</div><div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800"><CalendarRange size={13} className="text-slate-500"/>v{p.document?.version ?? '—'} · effective {p.document?.effective_date ?? '—'}</div><div className="mt-1 text-[11px] text-slate-500">{p.document?.jurisdiction ?? '—'} · {p.document?.status ?? 'Unknown'}</div></div>
        </div>
        <div className="px-4 py-4"><div className="label mb-2">Applicable policy text</div><blockquote className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">{p.text}</blockquote></div>
      </article>)}
      {!results.length && <div className="card p-10 text-center"><Search size={22} className="mx-auto text-slate-300"/><div className="mt-3 text-sm font-semibold text-slate-800">No matching active policy section</div><div className="mt-1 text-xs text-slate-500">Try a policy ID, rule-related term, or broader keyword.</div></div>}
    </div>
  </div>;
}
