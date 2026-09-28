import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { BookOpen, LayoutDashboard, ListChecks, ShieldCheck } from 'lucide-react';
import claimantsData from '@/data/claimants.json';
import employersData from '@/data/employers.json';
import claimsData from '@/data/claims.json';
import casesData from '@/data/cases.json';
import investigatorsData from '@/data/investigators.json';
import policiesData from '@/data/policy_snippets.json';
import scriptsData from '@/data/copilotScripts.json';
import rulesData from '@/data/rules.json';

export type Citation = { type: 'case' | 'policy'; id: string; label: string };
export type Script = { match: string; answer: string; citations: Citation[] };
export type AuditEntry = { at: string; action: string; detail: string };
export type Rule = (typeof rulesData)[number];

export const claimants = claimantsData;
export const employers = employersData;
export const claims = claimsData;
export const cases = casesData;
export const investigators = investigatorsData;
export const policies = policiesData;
export const scripts = scriptsData as Record<string, Script[]>;
export const rules = rulesData;

export const riskBand = (score: number) => score < 40 ? 'Low' : score < 70 ? 'Medium' : 'High';
export const riskClass = (score: number) => score < 40 ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : score < 70 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-red-50 text-red-800 ring-1 ring-red-200';
export const riskBar = (score: number) => score < 40 ? 'bg-emerald-500' : score < 70 ? 'bg-amber-500' : 'bg-red-600';
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
export const stamp = () => new Date().toLocaleString();

const DISP_KEY = 'fraud-copilot-session-dispositions';
export const sessionDispositions: Record<string, { value: string; at: string }> =
  typeof window !== 'undefined' ? JSON.parse(window.sessionStorage.getItem(DISP_KEY) || '{}') : {};
export const recordDisposition = (claimId: string, value: string, at: string) => {
  sessionDispositions[claimId] = { value, at };
  if (typeof window !== 'undefined') window.sessionStorage.setItem(DISP_KEY, JSON.stringify(sessionDispositions));
};
export const effectiveStatus = (claimId: string, status: string) =>
  sessionDispositions[claimId] ? `Closed · ${sessionDispositions[claimId].value}` : status;
export const splitSignals = (s: string) => s.split(';').filter(x => x && x !== 'none');
export const rulesForSignals = (signals: string[]) => rules.filter(rule => rule.trigger_signals.some(signal => signals.includes(signal)));

export function RiskScore({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  return <div className={`inline-flex items-center gap-2 rounded px-2 py-1 ${riskClass(score)}`}>
    <span className={`mono font-semibold tabular-nums ${size === 'lg' ? 'text-2xl' : 'text-base'}`}>{score}</span>
    <span className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider">{riskBand(score)}</span>
      <span className="h-1 w-10 rounded-full bg-white/80"><span className={`block h-1 rounded-full ${riskBar(score)}`} style={{ width: `${score}%` }} /></span>
    </span>
  </div>;
}

export function Shell({ children }: { children: ReactNode }) {
  const nav = [
    ['/', 'Risk Queue', LayoutDashboard],
    ['/policy', 'Policy Search', BookOpen],
    ['/rules', 'Rule Catalog', ListChecks],
    ['/admin', 'Admin', ShieldCheck],
  ] as const;
  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800"><ShieldCheck size={17}/></div>
          <div className="leading-tight"><div className="text-sm font-semibold tracking-tight">Fraud Copilot <span className="font-normal text-slate-400">/ UI Investigation Workbench</span></div><div className="text-[11px] text-slate-400">Division of Program Integrity · Synthetic demo data</div></div>
        </div>
        <nav className="flex items-center gap-1 md:hidden">{nav.map(([to, label]) => <Link key={to} to={to} activeOptions={{ exact: to === '/' }} className="rounded px-2 py-1 text-xs text-slate-300" activeProps={{ className: 'bg-slate-700 text-white' }}>{label}</Link>)}</nav>
        <div className="hidden items-center gap-2 rounded border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Human decision required</div>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1600px]">
      <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-white px-3 py-4 md:block md:min-h-[calc(100vh-49px)]">
        <div className="label mb-2 px-2">Workspace</div>
        <nav className="space-y-0.5">{nav.map(([to, label, Icon]) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            activeProps={{ className: 'flex items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold bg-slate-100 text-slate-900 shadow-[inset_2px_0_0_0_var(--color-slate-900)]' }}
          >
            <Icon size={16}/>{label}
          </Link>
        ))}</nav>
        <div className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-600"><div className="label mb-1">Guardrail</div>Risk scores prioritize investigation workload. They do not represent probability of fraud and never trigger a disposition.</div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-5">{children}</main>
    </div>
  </div>;
}

export function PageHeader({ eyebrow, title, description, right }: { eyebrow: string; title: string; description?: ReactNode; right?: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
    <div><div className="label">{eyebrow}</div><h1 className="mt-0.5 text-xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}</div>
    {right}
  </div>;
}

export function Filter({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:(string|[string,string])[]}) { return <label className="flex items-center gap-2"><span className="label whitespace-nowrap">{label}</span><select className="input w-auto py-1" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o => {const [v,l]=Array.isArray(o)?o:[o,o];return <option key={v} value={v}>{l}</option>;})}</select></label>; }
export function Panel({title,subtitle,icon,right,children,tone='default'}:{title:string;subtitle?:string;icon:ReactNode;right?:ReactNode;children:ReactNode;tone?:'default'|'ai'}) {
  return <section className={`card ${tone === 'ai' ? 'border-violet-200' : ''}`}>
    <div className={`flex items-center justify-between gap-2 border-b px-3.5 py-2.5 ${tone === 'ai' ? 'border-violet-100 bg-violet-50/60' : 'border-slate-100'}`}>
      <div className="flex items-center gap-2"><span className={tone === 'ai' ? 'text-violet-600' : 'text-slate-500'}>{icon}</span><h2 className="text-sm font-semibold">{title}</h2>{subtitle && <span className="hidden text-xs text-slate-500 lg:inline">· {subtitle}</span>}</div>
      {right}
    </div>
    <div className="p-3.5">{children}</div>
  </section>;
}
export function EvidenceState({state}:{state:string}) { const c=state==='Available'?'border-slate-300 bg-white text-slate-800':state==='Pending'?'border-slate-300 bg-slate-50 text-slate-600 border-dashed':'border-slate-200 bg-slate-100 text-slate-400'; const dot=state==='Available'?'bg-slate-800':state==='Pending'?'bg-slate-400':'bg-slate-300'; return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold ${c}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{state}</span>; }
const chipCls = "inline-flex items-center gap-1 rounded border border-violet-300 bg-white px-2 py-0.5 text-xs font-semibold text-violet-800 underline-offset-2 hover:bg-violet-100 hover:underline";
export function CitationChip({citation}:{citation:Citation}) { const caseItem = citation.type === 'case' ? cases.find(c => c.case_id === citation.id) : undefined; const text = `${citation.type === 'case' ? 'Case' : 'Policy'} · ${citation.label}`; return citation.type === 'case' && caseItem ? <Link className={chipCls} to="/case/$claimId" params={{ claimId: caseItem.claim_id }}>{text}</Link> : <Link className={chipCls} to="/policy" search={{ search: citation.id }}>{text}</Link>; }
export function Metric({title,value,note}:{title:string;value:string;note:string}) { return <div className="card p-3.5"><div className="label">{title}</div><div className="mono mt-1.5 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>; }
export function Th({children}:{children?:ReactNode}) { return <th className="whitespace-nowrap px-3 py-1.5 font-semibold">{children}</th>; }
export function Td({children}:{children?:ReactNode}) { return <td className="px-3 py-1.5 align-middle text-slate-700">{children}</td>; }
const SIGNAL_LABELS: Record<string,string> = {
  same_ip_multi_claimant: 'Shared IP across multiple claimants',
  device_fingerprint_reuse: 'Device fingerprint reused',
  cross_country_ip_mismatch: 'Cross-country filing location mismatch',
  cross_state_ip_mismatch: 'Cross-state filing location mismatch',
  sequential_ip_cluster: 'Sequential IP cluster',
  blocklisted_ip_range: 'Blocklisted IP range',
  undeclared_wage_match: 'Undeclared wage match',
  new_hire_registry_lag: 'New hire registry timing signal',
};
export const signalLabel = (key: string) => SIGNAL_LABELS[key] || key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
export function signalExplanation(signal:string, claimantId:string, ipRelated:string[], deviceRelated:string[]) {
  const map:Record<string,string> = {
    same_ip_multi_claimant: `The filing IP is also used by ${ipRelated.join(', ') || 'another claimant'}. Shared infrastructure requires corroboration.`,
    device_fingerprint_reuse: `The device fingerprint is also associated with ${deviceRelated.join(', ') || 'another claimant'}. Shared household devices can create legitimate matches.`,
    cross_state_ip_mismatch: 'Filing network geography differs from the claimant residence state. VPN, travel, relocation, or authorized assistance may explain the mismatch.',
    cross_country_ip_mismatch: 'The source data flags a cross-country network mismatch. Validate identity and network context before drawing conclusions.',
    blocklisted_ip_range: 'The filing network is tagged as a higher-risk range in the demo data. This remains an investigative lead only.',
    sequential_ip_cluster: 'The filing IP appears within a sequential cluster linked to another claim. Review related cases and independent evidence.',
    undeclared_wage_match: 'Wage data appears to overlap a claimed benefit period. Reconcile reported earnings, wage records, and claimant response.',
    new_hire_registry_lag: 'A new-hire registry signal may reflect timing differences. Verify employment dates before using it in adjudication.',
  };
  return map[signal] || `Signal ${signal} requires investigator review and corroboration.`;
}
