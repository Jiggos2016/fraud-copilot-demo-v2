import { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { listPolicySections } from '@/domain/policy/policyService';
import { PageHeader } from './shared';

const policies = listPolicySections();

export default function PolicySearch({ initialSearch }: { initialSearch: string }) {
  const [q, setQ] = useState(initialSearch);
  useEffect(() => { setQ(initialSearch); }, [initialSearch]);
  const results = policies.filter(p => !q.trim() || `${p.snippet_id} ${p.section} ${p.text} ${p.source_doc} ${p.document?.version ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return <div>
    <PageHeader eyebrow="Policy research" title="Policy Search" description="Search the versioned synthetic policy corpus. Each result retains source document, section, version, jurisdiction, and effective-date attribution." />
    <div className="card mb-3 flex items-center gap-3 p-2.5">
      <div className="relative flex-1"><Search className="absolute left-2.5 top-2 text-slate-400" size={16}/><input autoFocus className="input pl-8" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by keyword or ID — shared IP, earnings, appeal, POL-3…"/></div>
      <div className="mono whitespace-nowrap text-xs text-slate-500">{results.length} result{results.length === 1 ? '' : 's'}</div>
    </div>
    <div className="space-y-2">
      {results.map(p => <article key={p.snippet_id} id={p.snippet_id} className="card overflow-hidden">
        <div className="grid gap-2 border-b border-slate-100 bg-slate-50 px-3.5 py-2 sm:grid-cols-[auto_1fr_1fr_1fr]">
          <span className="mono self-center rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">{p.snippet_id}</span>
          <div><div className="label">Source document</div><div className="flex items-center gap-1.5 text-sm font-semibold"><FileText size={13} className="text-slate-500"/>{p.source_doc}</div></div>
          <div><div className="label">Section</div><div className="text-sm font-semibold">{p.section}</div></div>
          <div><div className="label">Policy version</div><div className="mono text-xs font-semibold">v{p.document?.version ?? '—'}</div><div className="mt-0.5 text-[11px] text-slate-500">Effective {p.document?.effective_date ?? '—'} · {p.document?.jurisdiction ?? '—'}</div></div>
        </div>
        <div className="px-3.5 py-3"><div className="label mb-1">Snippet</div><blockquote className="border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-800">{p.text}</blockquote></div>
      </article>)}
      {!results.length && <div className="card p-6 text-center text-sm text-slate-500">No policy snippet matched this keyword search.</div>}
    </div>
  </div>;
}
