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
      const text = lower.endsWith('.txt')
        ? raw
        : new DOMParser().parseFromString(raw, 'text/html').body.textContent || '';
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

  return <section className="card mt-3 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div>
        <div className="label">Policy knowledge</div>
        <h2 className="mt-0.5 text-base font-semibold">Policy Knowledge Manager</h2>
        <p className="mt-1 text-xs text-slate-500">Test document governance, chunking, activation, and local retrieval before connecting production ingestion and vector search.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900"><ShieldCheck size={13}/>Session-only MVP</span>
    </div>

    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
      <strong>No uploaded file leaves the browser in this MVP.</strong> HTML/TXT text can be read locally. For PDF or DOCX, paste extracted text below so the local RAG simulation has searchable content. Production parsing, embeddings, object storage, and Cortex/vector indexing are not connected yet.
    </div>

    <div className="grid gap-5 p-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Ingest policy document</div>
          <button type="button" className="btn-secondary" onClick={loadDemo}>Load demo policy</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">Policy file</span><input className="input mt-1" type="file" accept=".pdf,.docx,.html,.htm,.txt" onChange={event => void onFile(event)}/><span className="mt-1 block text-[11px] text-slate-500">Accepted for this workflow: PDF, DOCX, HTML, TXT. PDF/DOCX parsing is simulated via pasted extracted text.</span></label>
          <label><span className="label">Document title</span><input className="input mt-1" value={form.title} onChange={e => update('title', e.target.value)} placeholder="State UI Policy Manual"/></label>
          <label><span className="label">Version</span><input className="input mt-1" value={form.version} onChange={e => update('version', e.target.value)} placeholder="2026.2"/></label>
          <label><span className="label">Jurisdiction</span><input className="input mt-1" value={form.jurisdiction} onChange={e => update('jurisdiction', e.target.value)}/></label>
          <label><span className="label">Authority</span><input className="input mt-1" value={form.authority} onChange={e => update('authority', e.target.value)}/></label>
          <label><span className="label">Effective date</span><input className="input mt-1" type="date" value={form.effectiveDate} onChange={e => update('effectiveDate', e.target.value)}/></label>
          <label><span className="label">Expiration date</span><input className="input mt-1" type="date" value={form.expirationDate} onChange={e => update('expirationDate', e.target.value)}/></label>
          <label className="sm:col-span-2"><span className="label">Extracted policy text / preview</span><textarea className="input mt-1 min-h-40" value={form.extractedText} onChange={e => update('extractedText', e.target.value)} placeholder="Paste extracted text for PDF/DOCX, or upload HTML/TXT to populate this automatically."/></label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-primary" onClick={ingest}>Ingest for review</button><button type="button" className="btn-secondary" onClick={clearSession}><RotateCcw size={13}/>Clear session uploads</button></div>
        {message && <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{message}</div>}
      </div>

      <div className="space-y-4">
        <div>
          <div className="label mb-2">Ingestion pipeline</div>
          <ol className="space-y-2">{steps.map(([label, Icon], index) => {
            const done = completedSteps > index;
            return <li key={label} className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-500'}`}><Icon size={15}/><span className="flex-1">{label}</span>{done && <CheckCircle2 size={15}/>}</li>;
          })}</ol>
          <div className="mt-2 text-[11px] leading-5 text-slate-500">Embedding generation and production vector indexing remain intentionally disabled in this static deployment.</div>
        </div>

        <div>
          <div className="label mb-2">Built-in policy corpus</div>
          <div className="space-y-2">{staticDocuments.map(document => <div key={document.document_id} className="rounded border border-slate-200 bg-white p-2.5"><div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold">{document.title}</div><span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">{document.status}</span></div><div className="mono mt-1 text-[11px] text-slate-500">{document.version} · effective {document.effective_date}</div></div>)}</div>
        </div>
      </div>
    </div>

    <div className="border-t border-slate-100 px-4 py-4">
      <div className="mb-2 flex items-center gap-2"><Database size={15} className="text-slate-500"/><h3 className="text-sm font-semibold">Session-ingested documents</h3></div>
      {managed.length === 0 ? <div className="rounded border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">No browser-session policy documents have been ingested yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-[10.5px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-2 py-2">Document</th><th className="px-2 py-2">Version</th><th className="px-2 py-2">Effective</th><th className="px-2 py-2">Chunks</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{managed.map(document => <tr key={document.document_id}><td className="px-2 py-2"><div className="font-semibold">{document.title}</div><div className="mono text-[11px] text-slate-500">{document.filename}</div></td><td className="mono px-2 py-2 text-xs">{document.version}</td><td className="mono px-2 py-2 text-xs">{document.effective_date}</td><td className="mono px-2 py-2 text-xs">{document.chunk_count}</td><td className="px-2 py-2"><span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${document.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{document.index_status}</span></td><td className="px-2 py-2">{document.status === 'Active' ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13}/>Searchable</span> : <button type="button" className="btn-secondary" onClick={() => activate(document.document_id)}>Activate for local RAG</button>}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
