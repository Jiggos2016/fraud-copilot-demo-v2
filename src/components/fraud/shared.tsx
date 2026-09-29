import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { BadgeCheck, BookOpen, CircleUserRound, Database, LayoutDashboard, ListChecks, Settings2, ShieldCheck } from 'lucide-react';
import claimantsData from '@/data/claimants.json';
import employersData from '@/data/employers.json';
import claimsData from '@/data/claims.json';
import casesData from '@/data/cases.json';
import investigatorsData from '@/data/investigators.json';
import policiesData from '@/data/policy_snippets.json';
import scriptsData from '@/data/copilotScripts.json';
import rulesData from '@/data/rules.json';
import { recordOutcomeFeedback, type FinalDisposition } from '@/domain/outcomes/outcomeFeedbackService';
import { getCurrentDemoRole, hasDemoPermission, type DemoRole } from '@/domain/access/accessControl';
import { DemoRoleProvider, useDemoRole } from './RoleContext';

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
export const riskClass = (score: number) => score < 40
  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
  : score < 70
    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
    : 'bg-red-50 text-red-800 ring-1 ring-red-200';
export const riskBar = (score: number) => score < 40 ? 'bg-emerald-500' : score < 70 ? 'bg-amber-500' : 'bg-red-600';
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
export const stamp = () => new Date().toLocaleString();

const DISP_KEY = 'fraud-copilot-session-dispositions';
const FINAL_DISPOSITIONS: FinalDisposition[] = ['Confirmed Fraud', 'False Positive', 'Inconclusive'];
export const sessionDispositions: Record<string, { value: string; at: string }> =
  typeof window !== 'undefined' ? JSON.parse(window.sessionStorage.getItem(DISP_KEY) || '{}') : {};
export const recordDisposition = (claimId: string, value: string, at: string) => {
  if (!hasDemoPermission(getCurrentDemoRole(), 'submitDisposition')) return false;
  sessionDispositions[claimId] = { value, at };
  if (typeof window !== 'undefined') window.sessionStorage.setItem(DISP_KEY, JSON.stringify(sessionDispositions));
  if (FINAL_DISPOSITIONS.includes(value as FinalDisposition)) {
    recordOutcomeFeedback({ claimId, disposition: value as FinalDisposition, decidedAt: at });
  }
  return true;
};
export const effectiveStatus = (claimId: string, status: string) =>
  sessionDispositions[claimId] ? `Closed · ${sessionDispositions[claimId].value}` : status;
export const splitSignals = (s: string) => s.split(';').filter(x => x && x !== 'none');
export const rulesForSignals = (signals: string[]) => rules.filter(rule => rule.trigger_signals.some(signal => signals.includes(signal)));

export function RiskScore({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  return <div className={`inline-flex min-w-[74px] items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${riskClass(score)}`}>
    <span className={`mono font-bold tabular-nums ${size === 'lg' ? 'text-2xl' : 'text-base'}`}>{score}</span>
    <span className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.12em]">{riskBand(score)}</span>
      <span className="h-1 w-9 overflow-hidden rounded-full bg-white/80"><span className={`block h-full rounded-full ${riskBar(score)}`} style={{ width: `${score}%` }} /></span>
    </span>
  </div>;
}

export function Shell({ children }: { children: ReactNode }) {
  return <DemoRoleProvider><ShellFrame>{children}</ShellFrame></DemoRoleProvider>;
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { role, roleLabel, permissions, isReadOnly, setRole } = useDemoRole();
  const nav = [
    ['/', 'Risk Queue', LayoutDashboard, 'Investigation workload'],
    ['/policy', 'Policy Search', BookOpen, 'Grounded policy corpus'],
    ['/rules', 'Rule Catalog', ListChecks, 'Decision governance'],
    ['/admin', 'Administration', Settings2, 'Knowledge & controls'],
  ] as const;
  const visibleNav = nav.filter(([to]) => to !== '/admin' || permissions.viewAdministration);

  return <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
    <header className="border-b border-slate-800/80 bg-[#0b1630] text-white shadow-sm">
      <div className="mx-auto flex min-h-16 max-w-[1680px] items-center justify-between gap-4 px-4 py-2 md:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"><ShieldCheck size={19}/></div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">Fraud Copilot <span className="font-normal text-slate-400">/ Investigation Workbench</span></div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400">Division of Program Integrity · Synthetic demonstration environment</div>
          </div>
        </div>
        <nav className="hidden items-center gap-1 lg:hidden md:flex">{visibleNav.map(([to, label]) => <Link key={to} to={to} activeOptions={{ exact: to === '/' }} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" activeProps={{ className: 'bg-white/10 text-white' }}>{label}</Link>)}</nav>
        <div className="hidden items-center gap-3 sm:flex">
          <label className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 lg:flex">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Viewing as</span>
            <select
              aria-label="Viewing as role"
              value={role}
              onChange={e => setRole(e.target.value as DemoRole)}
              className="bg-transparent text-xs font-semibold text-white outline-none"
            >
              <option className="text-slate-900" value="investigator">Investigator</option>
              <option className="text-slate-900" value="auditor">Compliance / OIG Auditor</option>
            </select>
          </label>
          <div className={`hidden items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold xl:flex ${isReadOnly ? 'border border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200'}`}>
            <BadgeCheck size={13}/>{isReadOnly ? 'Read-only audit view' : 'Human decision required'}
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <CircleUserRound size={24} className="text-slate-400"/>
            <div className="hidden leading-tight lg:block"><div className="text-xs font-semibold text-slate-200">{roleLabel}</div><div className="text-[10px] text-slate-500">{isReadOnly ? 'Compliance / OIG' : 'Program Integrity'}</div></div>
          </div>
        </div>
      </div>
    </header>

    <div className="mx-auto flex max-w-[1680px]">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-[#101d38] px-3.5 py-5 text-slate-200 lg:flex lg:min-h-[calc(100vh-65px)] lg:flex-col">
        <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{isReadOnly ? 'Audit reconstruction' : 'Investigation workspace'}</div>
        <nav className="space-y-1">{visibleNav.map(([to, label, Icon, note]) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="group flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-slate-400 transition hover:bg-white/[0.055] hover:text-white"
            activeProps={{ className: 'bg-blue-600/15 text-white shadow-[inset_2px_0_0_0_#3b82f6]' }}
          >
            <Icon size={17} className="mt-0.5 shrink-0"/>
            <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-[10px] font-normal text-slate-500 group-hover:text-slate-400">{note}</span></span>
          </Link>
        ))}</nav>

        <div className="mt-auto space-y-3 pt-8">
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><Database size={13}/>Environment</div>
            <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Data mode</span><span className="font-semibold text-slate-200">Synthetic</span></div>
            <div className="mt-1.5 flex items-center justify-between text-xs"><span className="text-slate-400">AI provider</span><span className="font-semibold text-slate-200">Grounded mock</span></div>
            <div className="mt-1.5 flex items-center justify-between text-xs"><span className="text-slate-400">Access role</span><span className="font-semibold text-slate-200">{roleLabel}</span></div>
          </div>
          <div className="rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-3 text-[11px] leading-5 text-slate-400">
            <div className="mb-1 font-semibold text-slate-300">Governance guardrail</div>
            {isReadOnly
              ? 'Auditor mode is read-only. Copilot, memo editing, disposition, and administration controls are unavailable.'
              : 'Risk scores prioritize workload only. They do not represent probability of fraud and never trigger disposition.'}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 xl:px-8">{children}</main>
    </div>
  </div>;
}

export function PageHeader({ eyebrow, title, description, right }: { eyebrow: string; title: string; description?: ReactNode; right?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div>
      <div className="label text-blue-700">{eyebrow}</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h1>
      {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
    </div>
    {right}
  </div>;
}

export function Filter({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:(string|[string,string])[]}) {
  return <label className="flex items-center gap-2"><span className="label whitespace-nowrap">{label}</span><select className="input w-auto min-w-28 py-1.5 text-xs font-medium" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o => {const [v,l]=Array.isArray(o)?o:[o,o];return <option key={v} value={v}>{l}</option>;})}</select></label>;
}

export function Panel({title,subtitle,icon,right,children,tone='default'}:{title:string;subtitle?:string;icon:ReactNode;right?:ReactNode;children:ReactNode;tone?:'default'|'ai'}) {
  const { role } = useDemoRole();
  if (role === 'auditor' && ['Fraud Copilot', 'Draft Investigation Memo', 'Disposition'].includes(title)) return null;

  return <section className={`card overflow-hidden ${tone === 'ai' ? 'border-blue-200/90' : ''}`}>
    <div className={`flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3 ${tone === 'ai' ? 'border-blue-100 bg-blue-50/70' : 'border-slate-100 bg-white'}`}>
      <div className="flex min-w-0 items-center gap-2.5"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone === 'ai' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{icon}</span><div className="min-w-0"><h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>{subtitle && <div className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</div>}</div></div>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </section>;
}

export function EvidenceState({state}:{state:string}) {
  const c = state==='Available' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : state==='Pending' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-500';
  const dot = state==='Available' ? 'bg-emerald-500' : state==='Pending' ? 'bg-amber-500' : 'bg-slate-300';
  return <span className={`status-chip ${c}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{state}</span>;
}

const chipCls = "inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 underline-offset-2 transition hover:border-blue-300 hover:bg-blue-100 hover:underline";
export function CitationChip({citation}:{citation:Citation}) {
  const caseItem = citation.type === 'case' ? cases.find(c => c.case_id === citation.id) : undefined;
  const text = `${citation.type === 'case' ? 'Case' : 'Policy'} · ${citation.label}`;
  return citation.type === 'case' && caseItem
    ? <Link className={chipCls} to="/case/$claimId" params={{ claimId: caseItem.claim_id }}>{text}</Link>
    : <Link className={chipCls} to="/policy" search={{ search: citation.id }}>{text}</Link>;
}

export function Metric({title,value,note}:{title:string;value:string;note:string}) {
  return <div className="card relative overflow-hidden p-4"><div className="absolute inset-x-0 top-0 h-0.5 bg-blue-600/80"/><div className="label">{title}</div><div className="mono mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div><div className="mt-1.5 text-xs leading-5 text-slate-500">{note}</div></div>;
}
export function Th({children}:{children?:ReactNode}) { return <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{children}</th>; }
export function Td({children}:{children?:ReactNode}) { return <td className="px-4 py-3 align-middle text-slate-700">{children}</td>; }

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
