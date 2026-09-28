import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Activity, AlertTriangle, ChevronRight, CircleDot, Info, ShieldCheck } from 'lucide-react';
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
  })).map(r => ({ ...r, displayStatus: effectiveStatus(r.claim_id, r.status) }))
    .filter(r => band === 'All' || riskBand(r.risk_score) === band)
    .filter(r => status === 'All' || r.displayStatus === status || (status === 'Closed' && r.displayStatus.startsWith('Closed')))
    .sort((a,b) => sort === 'risk' ? b.risk_score-a.risk_score : b.filed_date.localeCompare(a.filed_date)), [band,status,sort]);

  const count = (b: string) => claims.filter(c => riskBand(c.risk_score) === b).length;
  const stats = [
    { label: 'Total workload', value: claims.length, note: 'Claims in review scope', icon: Activity, iconClass: 'bg-slate-100 text-slate-700' },
    { label: 'High priority', value: count('High'), note: 'Immediate investigator attention', icon: AlertTriangle, iconClass: 'bg-red-50 text-red-700' },
    { label: 'Medium priority', value: count('Medium'), note: 'Review after high-priority queue', icon: CircleDot, iconClass: 'bg-amber-50 text-amber-700' },
    { label: 'Low priority', value: count('Low'), note: 'Routine review workload', icon: ShieldCheck, iconClass: 'bg-emerald-50 text-emerald-700' },
  ];

  const open = (id: string) => navigate({ to: '/case/$claimId', params: { claimId: id } });

  return <div>
    <PageHeader
      eyebrow="Investigation operations"
      title="Risk Queue"
      description="Prioritized unemployment-insurance claims awaiting investigator review. Open a case to inspect evidence, triggered rules, applicable policy, and grounded Copilot guidance."
      right={<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm"><div className="label">Queue mode</div><div className="mt-0.5 text-xs font-semibold text-slate-800">Human-led investigation</div></div>}
    />

    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(({ label, value, note, icon: Icon, iconClass }) => <div key={label} className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div><div className="label">{label}</div><div className="mono mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div></div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}><Icon size={17}/></div>
        </div>
        <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div>
      </div>)}
    </div>

    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-blue-950">
      <Info size={15} className="mt-0.5 shrink-0 text-blue-700" />
      <span><strong>Risk score represents investigation priority, not probability of fraud.</strong> Scores order the workload only. Every investigative conclusion and final disposition remains a human decision.</span>
    </div>

    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Filter label="Risk band" value={band} onChange={setBand} options={['All','Low','Medium','High']} />
          <Filter label="Status" value={status} onChange={setStatus} options={['All','Open','Under Investigation','Closed']} />
          <Filter label="Sort" value={sort} onChange={setSort} options={[["risk","Risk score"],["date","Filed date"]]} />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500"/><span className="mono">{rows.length}</span> of <span className="mono">{claims.length}</span> claims shown</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-white"><tr><Th>Priority</Th><Th>Claimant / Claim</Th><Th>Employer</Th><Th>Filed</Th><Th>Weekly benefit</Th><Th>Signals</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(r => {
            const sig = splitSignals(r.top_signals);
            return <tr key={r.claim_id} tabIndex={0} role="link" aria-label={`Open investigation for ${r.claim_id}`} className="group cursor-pointer bg-white outline-none transition hover:bg-blue-50/35 focus-visible:bg-blue-50/50" onClick={() => open(r.claim_id)} onKeyDown={e => e.key === 'Enter' && open(r.claim_id)}>
              <Td><RiskScore score={r.risk_score} /></Td>
              <Td><div className="font-semibold text-slate-950 group-hover:text-blue-800 group-hover:underline group-hover:underline-offset-2">{r.claimant.name}</div><div className="mono mt-0.5 text-[11px] text-slate-500">{r.claim_id}</div></Td>
              <Td><div className="max-w-44 font-medium text-slate-700">{r.employer.name}</div></Td>
              <Td><span className="mono whitespace-nowrap text-xs text-slate-600">{r.filed_date}</span></Td>
              <Td><span className="mono text-xs font-medium text-slate-700">{money(r.weekly_benefit_amount)}</span></Td>
              <Td><div className="flex max-w-md flex-wrap gap-1.5">{sig.length ? sig.map(s => <span key={s} title={s} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10.5px] font-medium leading-none text-slate-700">{signalLabel(s)}</span>) : <span className="text-xs text-slate-400">No active signals</span>}</div></Td>
              <Td><span className="status-chip border-slate-200 bg-slate-50 text-slate-700">{r.displayStatus}</span></Td>
              <Td><span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700">Open case <ChevronRight size={14} /></span></Td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  </div>;
}
