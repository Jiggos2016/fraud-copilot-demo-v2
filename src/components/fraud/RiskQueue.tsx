import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, Info } from 'lucide-react';
import { Filter, PageHeader, RiskScore, Td, Th, claims, claimants, effectiveStatus, employers, money, riskBand, signalLabel, splitSignals } from './shared';

export default function RiskQueue() {
  const navigate = useNavigate();
  const [band, setBand] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('risk');
  const rows = useMemo(() => claims.map(c => ({
    ...c,
    claimant: claimants.find(x => x.claimant_id === c.claimant_id)!,
    employer: employers.find(x => x.employer_id === c.employer_id)!,
  })).map(r => ({ ...r, displayStatus: effectiveStatus(r.claim_id, r.status) })).filter(r => band === 'All' || riskBand(r.risk_score) === band).filter(r => status === 'All' || r.displayStatus === status || (status === 'Closed' && r.displayStatus.startsWith('Closed'))).sort((a,b) => sort === 'risk' ? b.risk_score-a.risk_score : b.filed_date.localeCompare(a.filed_date)), [band,status,sort]);
  const count = (b: string) => claims.filter(c => riskBand(c.risk_score) === b).length;
  const stats: [string, number, string][] = [
    ['Total cases', claims.length, 'border-l-slate-800'],
    ['High', count('High'), 'border-l-red-600'],
    ['Medium', count('Medium'), 'border-l-amber-500'],
    ['Low', count('Low'), 'border-l-emerald-500'],
  ];
  const open = (id: string) => navigate({ to: '/case/$claimId', params: { claimId: id } });
  return <div>
    <PageHeader eyebrow="Investigation queue" title="Risk Queue" description="Claims ranked by investigation priority. Select a row to open the investigation workspace." />
    <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {stats.map(([l, v, c]) => <div key={l} className={`card border-l-4 px-3.5 py-1.5 ${c}`}><div className="label">{l}{l !== 'Total cases' && ' priority'}</div><div className="mono text-xl font-semibold leading-7">{v}</div></div>)}
    </div>
    <div className="mb-3 flex items-start gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">
      <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
      <span><strong>Risk score represents investigation priority, not probability of fraud.</strong> Scores order the workload; every disposition is made by a human investigator.</span>
    </div>
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-4">
          <Filter label="Risk band" value={band} onChange={setBand} options={['All','Low','Medium','High']} />
          <Filter label="Status" value={status} onChange={setStatus} options={['All','Open','Under Investigation','Closed']} />
          <Filter label="Sort" value={sort} onChange={setSort} options={[["risk","Risk score"],["date","Filed date"]]} />
        </div>
        <div className="mono text-xs text-slate-500">{rows.length} / {claims.length} claims</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-[10.5px] uppercase tracking-[0.08em] text-slate-500"><tr><Th>Priority</Th><Th>Claimant / Claim</Th><Th>Employer</Th><Th>Filed</Th><Th>Weekly benefit</Th><Th>Signals</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(r => {
            const sig = splitSignals(r.top_signals);
            return <tr key={r.claim_id} tabIndex={0} role="link" aria-label={`Open investigation for ${r.claim_id}`} className="group cursor-pointer outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50" onClick={() => open(r.claim_id)} onKeyDown={e => e.key === 'Enter' && open(r.claim_id)}>
              <Td><RiskScore score={r.risk_score} /></Td>
              <Td><div className="font-semibold text-slate-900 group-hover:underline">{r.claimant.name}</div><div className="mono text-[11px] text-slate-500">{r.claim_id}</div></Td>
              <Td>{r.employer.name}</Td>
              <Td><span className="mono whitespace-nowrap text-xs">{r.filed_date}</span></Td>
              <Td><span className="mono text-xs">{money(r.weekly_benefit_amount)}</span></Td>
              <Td><div className="flex max-w-sm flex-wrap gap-1">{sig.length ? sig.map(s => <span key={s} title={s} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700">{signalLabel(s)}</span>) : <span className="text-xs text-slate-400">No active signals</span>}</div></Td>
              <Td><span className="whitespace-nowrap rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">{r.displayStatus}</span></Td>
              <Td><span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-400 group-hover:text-slate-900">Open <ChevronRight size={14} /></span></Td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  </div>;
}
