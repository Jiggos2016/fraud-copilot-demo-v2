import { ChangeEvent, useState } from 'react';
import { CheckCircle2, Database, FileCheck2, FileUp, Layers3, RotateCcw, SearchCheck, ShieldCheck } from 'lucide-react';
import { listPolicyDocuments } from '@/domain/policy/policyService';
import {
  activateManagedPolicy,
  clearManagedPolicies,
  ingestPolicyForSession,
  listManagedPolicyDocuments,
  type ManagedPolicyDocument,
} from '@/domain/policy/policyKnowledgeStore';

const DEMO_TEXT = `Section 7.3 — Shared infrastructure. A shared IP address or device identifier is an investigative lead and is not standalone proof of fraud. Investigators must corroborate the signal with independent evidence before referral for adjudication.

Section 7.4 — Device reuse. Device fingerprint reuse across claimants requires review of household relationships, authorized assistance, network context, and identity evidence before a determination is drafted.

Section 8.2 — Evidence sufficiency. Automated risk indicators prioritize investigative work only. A final disposition must be made by an authorized human investigator after review of the complete case record.`;

const initialForm = {
  title: '',
  version: '2026.1',
  jurisdiction: 'Demo State',
  authority: 'Program Integrity',
  effectiveDate: '2026-01-01',
  expirationDate: '',
  extractedText: '',
};

const steps = [
  ['File staged', FileUp],
  ['Metadata validated', FileCheck2],
  ['Sections / chunks created', Layers3],
  ['Local retrieval index ready', SearchCheck],
] as const;

export default function PolicyKnowledgeManager() {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(initialForm);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [managed, setManaged] = useState<ManagedPolicyDocument[]>(() => listManagedPolicyDocuments());
  const [message, setMessage] = useState('');

  const staticDocuments = listPolicyDocuments().filter(document => document.source_type !== 'Browser session upload');
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setCompletedSteps(next ? 1 : 0);
    setMessage('');
    if (!next) return;

    if (!form.title) update('title', next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    const lower = next.name.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.txt')) {
      const raw = await next.text();
      const text = lower.endsWith('.txt') ? raw : new DOMParser().parseFromString(raw, 'text/html').body.textContent || '';
      update('extractedText', text.trim());
    }
  };

  const loadDemo = () => {
    const demoFile = new File([DEMO_TEXT], 'demo-ui-policy-manual.html', { type: 'text/html' });
    setFile(demoFile);
    setForm({
      title: 'Demo UI Policy Manual — Imported Version',
      version: '2026.2-demo',
      jurisdiction: 'Demo State',
      authority: 'Program Integrity',
      effectiveDate: '2026-01-01',
      expirationDate: '',
      extractedText: DEMO_TEXT,
    });
    setCompletedSteps(1);
    setMessage('Demo policy loaded. Click “Ingest for review” to test the workflow.');
  };

  const ingest = () => {
    if (!file || !form.title.trim() || !form.version.trim() || !form.effectiveDate || !form.extractedText.trim()) {
      setMessage('Select a file and provide title, version, effective date, and extracted policy text.');
      return;
    }

    setCompletedSteps(2);
    const expiration = form.expirationDate.trim();
    const { document } = ingestPolicyForSession({
      filename: file.name,
      fileSize: file.size,
      title: form.title.trim(),
      version: form.version.trim(),
      jurisdiction: form.jurisdiction.trim() || 'Demo State',
      authority: form.authority.trim() || 'Program Integrity',
      effectiveDate: form.effectiveDate,
      ...(expiration ? { expirationDate: expiration } : {}),
      extractedText: form.extractedText.trim(),
    });
    setCompletedSteps(4);
    setManaged(listManagedPolicyDocuments());
    setMessage(`${document.title} was chunked and staged for local review. Activate it to make its chunks searchable in this browser session.`);
  };

  const activate = (documentId: string) => {
    activateManagedPolicy(documentId);
    setManaged(listManagedPolicyDocuments());
    setMessage('Policy activated for this browser session. Policy Search and local keyword retrieval can now use its chunks when effective-date and query filters match.');
  };

  const clearSession = () => {
    clearManagedPolicies();
    setManaged([]);
    setCompletedSteps(0);
    setFile(null);
    setForm(initialForm);
    setMessage('Session policy uploads cleared. The built-in synthetic corpus was not changed.');
  };

  return <section className="card mt-4 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
      <div>
        <div className="label text-blue-700">Policy knowledge operations</div>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.015em] text-slate-950">Policy Knowledge Manager</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">Stage, validate, chunk, and activate governed policy content before it becomes available to the local retrieval layer.</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"><ShieldCheck size={14}/>Session-only MVP</span>
    </div>

    <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-3 text-xs leading-5 text-blue-950">
      <strong>Browser-local processing only.</strong> HTML/TXT can be read locally. For PDF or DOCX, paste extracted text below. Production parsing, embeddings, object storage, and Cortex/vector indexing remain intentionally disconnected.
    </div>

    <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><div className="text-sm font-semibold text-slate-950">Ingest policy document</div><div className="mt-0.5 text-xs text-slate-500">Create a governed, reviewable policy version for local RAG testing.</div></div>
          <button type="button" className="btn-secondary" onClick={loadDemo}>Load demo policy</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">Policy file</span><input className="input mt-1.5" type="file" accept=".pdf,.docx,.html,.htm,.txt" onChange={event => void onFile(event)}/><span className="mt-1.5 block text-[11px] text-slate-500">PDF, DOCX, HTML, TXT. PDF/DOCX parsing is simulated through pasted extracted text.</span></label>
          <label><span className="label">Document title</span><input className="input mt-1.5" value={form.title} onChange={e => update('title', e.target.value)} placeholder="State UI Policy Manual"/></label>
          <label><span className="label">Version</span><input className="input mt-1.5" value={form.version} onChange={e => update('version', e.target.value)} placeholder="2026.2"/></label>
          <label><span className="label">Jurisdiction</span><input className="input mt-1.5" value={form.jurisdiction} onChange={e => update('jurisdiction', e.target.value)}/></label>
          <label><span className="label">Authority</span><input className="input mt-1.5" value={form.authority} onChange={e => update('authority', e.target.value)}/></label>
          <label><span className="label">Effective date</span><input className="input mt-1.5" type="date" value={form.effectiveDate} onChange={e => update('effectiveDate', e.target.value)}/></label>
          <label><span className="label">Expiration date</span><input className="input mt-1.5" type="date" value={form.expirationDate} onChange={e => update('expirationDate', e.target.value)}/></label>
          <label className="sm:col-span-2"><span className="label">Extracted policy text / preview</span><textarea className="input mt-1.5 min-h-44 resize-y leading-6" value={form.extractedText} onChange={e => update('extractedText', e.target.value)} placeholder="Paste extracted text for PDF/DOCX, or upload HTML/TXT to populate this automatically."/></label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="btn-primary" onClick={ingest}>Ingest for review</button><button type="button" className="btn-secondary" onClick={clearSession}><RotateCcw size={13}/>Clear session uploads</button></div>
        {message && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-xs leading-5 text-slate-700">{message}</div>}
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="label mb-3">Ingestion pipeline</div>
          <ol className="space-y-2.5">{steps.map(([label, Icon], index) => {
            const done = completedSteps > index;
            return <li key={label} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-500'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}><Icon size={14}/></span><span className="flex-1 font-medium">{label}</span>{done && <CheckCircle2 size={16} className="text-emerald-600"/>}</li>;
          })}</ol>
          <div className="mt-3 text-[11px] leading-5 text-slate-500">Production embeddings and vector indexing are deliberately excluded from this static deployment.</div>
        </div>

        <div>
          <div className="label mb-2">Built-in policy corpus</div>
          <div className="space-y-2">{staticDocuments.map(document => <div key={document.document_id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold text-slate-900">{document.title}</div><span className="status-chip border-emerald-200 bg-emerald-50 text-emerald-800">{document.status}</span></div><div className="mono mt-1.5 text-[11px] text-slate-500">v{document.version} · effective {document.effective_date}</div></div>)}</div>
        </div>
      </div>
    </div>

    <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-4">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Database size={15}/></span><div><h3 className="text-sm font-semibold text-slate-900">Session-ingested documents</h3><div className="mt-0.5 text-[11px] text-slate-500">Activation controls whether staged chunks participate in local retrieval.</div></div></div>
      {managed.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">No browser-session policy documents have been ingested yet.</div> : <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left"><tr><th className="px-3 py-2.5 label">Document</th><th className="px-3 py-2.5 label">Version</th><th className="px-3 py-2.5 label">Effective</th><th className="px-3 py-2.5 label">Chunks</th><th className="px-3 py-2.5 label">Status</th><th className="px-3 py-2.5 label">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{managed.map(document => <tr key={document.document_id}><td className="px-3 py-3"><div className="font-semibold text-slate-900">{document.title}</div><div className="mono mt-0.5 text-[11px] text-slate-500">{document.filename}</div></td><td className="mono px-3 py-3 text-xs">{document.version}</td><td className="mono px-3 py-3 text-xs">{document.effective_date}</td><td className="mono px-3 py-3 text-xs">{document.chunk_count}</td><td className="px-3 py-3"><span className={`status-chip ${document.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{document.index_status}</span></td><td className="px-3 py-3">{document.status === 'Active' ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13}/>Searchable</span> : <button type="button" className="btn-secondary" onClick={() => activate(document.document_id)}>Activate for local RAG</button>}</td></tr>)}</tbody></table></div></div>}
    </div>
  </section>;
}
