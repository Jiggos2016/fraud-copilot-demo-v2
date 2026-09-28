import { ChangeEvent, useMemo, useState } from 'react';
import { CheckCircle2, Database, FileCheck2, FileSearch, FileUp, GitBranch, Layers3, RotateCcw, SearchCheck, ShieldCheck } from 'lucide-react';
import { listPolicyDocuments } from '@/domain/policy/policyService';
import { detectPolicySections, parsePolicyFile, type ParsedPolicySection } from '@/domain/policy/policyDocumentParser';
import {
  activateManagedPolicy,
  clearManagedPolicies,
  ingestPolicyForSession,
  listManagedPolicyDocuments,
  validateManagedPolicy,
  type ManagedPolicyDocument,
} from '@/domain/policy/policyKnowledgeStore';
import {
  approveRulePolicyMapping,
  clearRulePolicyMappings,
  listRulePolicyMappings,
  suggestRulePolicyMappings,
  type RulePolicyMapping,
} from '@/domain/policy/policyRuleMappingStore';
import { getRuleById } from '@/domain/rules/ruleEngine';

const DEMO_TEXT = `Section 7.3 — Shared infrastructure
A shared IP address or device identifier is an investigative lead and is not standalone proof of fraud. Investigators must corroborate the signal with independent evidence before referral for adjudication.

Section 7.4 — Device reuse
Device fingerprint reuse across claimants requires review of household relationships, authorized assistance, network context, and identity evidence before a determination is drafted.

Section 8.2 — Evidence sufficiency
Automated risk indicators prioritize investigative work only. A final disposition must be made by an authorized human investigator after review of the complete case record.`;

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
  ['Upload & parse', FileUp],
  ['Review structure', FileSearch],
  ['Chunk & stage index', Layers3],
  ['Validate governance metadata', FileCheck2],
  ['Review rule mappings', GitBranch],
  ['Activate for RAG', SearchCheck],
] as const;

export default function PolicyKnowledgeManager() {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(initialForm);
  const [parsedSections, setParsedSections] = useState<ParsedPolicySection[]>([]);
  const [parserMeta, setParserMeta] = useState<{ parser?: string; pageCount?: number }>({});
  const [completedSteps, setCompletedSteps] = useState(0);
  const [managed, setManaged] = useState<ManagedPolicyDocument[]>(() => listManagedPolicyDocuments());
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<RulePolicyMapping[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const staticDocuments = listPolicyDocuments().filter(document => document.source_type !== 'Browser session upload');
  const selectedDocument = managed.find(document => document.document_id === selectedDocumentId);
  const approvedCount = useMemo(() => mappings.filter(mapping => mapping.status === 'Approved').length, [mappings]);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const refreshManaged = () => setManaged(listManagedPolicyDocuments());

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setParsedSections([]);
    setParserMeta({});
    setCompletedSteps(0);
    setMessage('');
    if (!next) return;

    if (!form.title) update('title', next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    setBusy(true);
    try {
      const parsed = await parsePolicyFile(next);
      update('extractedText', parsed.text);
      setParsedSections(parsed.sections);
      setParserMeta({ parser: parsed.parser, pageCount: parsed.pageCount });
      setCompletedSteps(2);
      setMessage(`Parsed ${next.name}${parsed.pageCount ? ` (${parsed.pageCount} pages)` : ''}. Review the detected sections before ingestion.`);
    } catch (error) {
      setMessage(`Unable to parse this file in the browser: ${error instanceof Error ? error.message : 'unknown parsing error'}`);
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = () => {
    const demoFile = new File([DEMO_TEXT], 'demo-ui-policy-manual.txt', { type: 'text/plain' });
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
    setParsedSections(detectPolicySections(DEMO_TEXT));
    setParserMeta({ parser: 'browser-text' });
    setCompletedSteps(2);
    setMessage('Demo policy parsed. Review the detected sections, then ingest it for governance review.');
  };

  const redetect = () => {
    const sections = detectPolicySections(form.extractedText);
    setParsedSections(sections);
    setCompletedSteps(sections.length ? Math.max(completedSteps, 2) : 1);
    setMessage(`Detected ${sections.length} policy section${sections.length === 1 ? '' : 's'} from the current text.`);
  };

  const ingest = () => {
    if (!file || !form.title.trim() || !form.version.trim() || !form.effectiveDate || !form.extractedText.trim()) {
      setMessage('Select a PDF/TXT/HTML file and provide title, version, effective date, and searchable policy text.');
      return;
    }
    if (!parsedSections.length) {
      setMessage('Review or re-detect document structure before ingestion.');
      return;
    }

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
      parsedSections,
      ...(parserMeta.pageCount ? { pageCount: parserMeta.pageCount } : {}),
      ...(parserMeta.parser ? { parser: parserMeta.parser } : {}),
    });
    setSelectedDocumentId(document.document_id);
    setMappings([]);
    setCompletedSteps(3);
    refreshManaged();
    setMessage(`${document.title} was section-aware chunked and staged. Run validation before proposing rule mappings.`);
  };

  const validate = (documentId: string) => {
    const result = validateManagedPolicy(documentId);
    refreshManaged();
    setSelectedDocumentId(documentId);
    if (!result) return;
    if (result.validation_status === 'Passed') {
      const proposed = suggestRulePolicyMappings(documentId);
      setMappings(proposed);
      setCompletedSteps(Math.max(completedSteps, 4));
      setMessage(`Validation passed. ${proposed.length} candidate rule-to-policy mapping${proposed.length === 1 ? '' : 's'} found for administrator review.`);
    } else {
      setMappings([]);
      setMessage(`Validation needs attention: ${result.validation_messages.join(' ')}`);
    }
  };

  const reviewMappings = (documentId: string) => {
    setSelectedDocumentId(documentId);
    const existing = listRulePolicyMappings(documentId);
    const next = existing.length ? existing : suggestRulePolicyMappings(documentId);
    setMappings(next);
    setCompletedSteps(Math.max(completedSteps, 5));
    setMessage(next.length ? 'Review and approve only the rule-to-policy mappings that are substantively correct.' : 'No candidate rule mappings were detected. The policy can still support general policy search after validation.');
  };

  const approve = (mappingId: string) => {
    approveRulePolicyMapping(mappingId);
    if (selectedDocumentId) setMappings(listRulePolicyMappings(selectedDocumentId));
    setCompletedSteps(Math.max(completedSteps, 5));
    setMessage('Mapping approved. The mapped uploaded section can now be retrieved when that deterministic rule is triggered.');
  };

  const activate = (documentId: string) => {
    const documentMappings = listRulePolicyMappings(documentId);
    const hasSuggestions = documentMappings.length > 0;
    const hasApproved = documentMappings.some(mapping => mapping.status === 'Approved');
    if (hasSuggestions && !hasApproved) {
      setSelectedDocumentId(documentId);
      setMappings(documentMappings);
      setMessage('Approve at least one relevant rule mapping before activation, or remove/review the candidate mappings.');
      return;
    }

    const activated = activateManagedPolicy(documentId);
    refreshManaged();
    if (!activated) {
      setMessage('Activation is blocked until governance validation passes.');
      return;
    }
    setCompletedSteps(6);
    setMessage('Policy activated. Its chunks are now available to Policy Search and RAG; approved mappings also participate in case rule-to-policy retrieval.');
  };

  const clearSession = () => {
    clearManagedPolicies();
    clearRulePolicyMappings();
    setManaged([]);
    setMappings([]);
    setSelectedDocumentId(null);
    setCompletedSteps(0);
    setFile(null);
    setParsedSections([]);
    setParserMeta({});
    setForm(initialForm);
    setMessage('Session policy uploads and their rule mappings were cleared. The built-in corpus was not changed.');
  };

  return <section className="card mt-4 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
      <div>
        <div className="label text-blue-700">Policy knowledge operations</div>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.015em] text-slate-950">Policy Knowledge Manager</h2>
        <p className="mt-1.5 max-w-4xl text-sm leading-6 text-slate-600">Upload policy, inspect extracted structure, stage searchable chunks, validate governance metadata, approve rule mappings, and then activate it for RAG.</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"><ShieldCheck size={14}/>Browser-session governance</span>
    </div>

    <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-3 text-xs leading-5 text-blue-950">
      <strong>PDF, TXT, and HTML are parsed locally in the browser.</strong> Uploaded files are not sent to a server in this static MVP. The searchable index is local keyword/hybrid scaffolding; production embeddings and Snowflake/Cortex indexing remain a later connector swap.
    </div>

    <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><div className="text-sm font-semibold text-slate-950">1. Upload and parse</div><div className="mt-0.5 text-xs text-slate-500">Use a real policy PDF/TXT/HTML or the synthetic demo manual.</div></div>
          <button type="button" className="btn-secondary" onClick={loadDemo}>Load demo policy</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">Policy file</span><input className="input mt-1.5" type="file" accept=".pdf,.html,.htm,.txt,application/pdf,text/plain,text/html" onChange={event => void onFile(event)} disabled={busy}/><span className="mt-1.5 block text-[11px] text-slate-500">Supported now: PDF, TXT, HTML. PDF text extraction uses browser-side PDF.js.</span></label>
          <label><span className="label">Document title</span><input className="input mt-1.5" value={form.title} onChange={e => update('title', e.target.value)} placeholder="State UI Policy Manual"/></label>
          <label><span className="label">Version</span><input className="input mt-1.5" value={form.version} onChange={e => update('version', e.target.value)} placeholder="2026.2"/></label>
          <label><span className="label">Jurisdiction</span><input className="input mt-1.5" value={form.jurisdiction} onChange={e => update('jurisdiction', e.target.value)}/></label>
          <label><span className="label">Authority</span><input className="input mt-1.5" value={form.authority} onChange={e => update('authority', e.target.value)}/></label>
          <label><span className="label">Effective date</span><input className="input mt-1.5" type="date" value={form.effectiveDate} onChange={e => update('effectiveDate', e.target.value)}/></label>
          <label><span className="label">Expiration date</span><input className="input mt-1.5" type="date" value={form.expirationDate} onChange={e => update('expirationDate', e.target.value)}/></label>
          <label className="sm:col-span-2"><span className="label">Extracted text</span><textarea className="input mt-1.5 min-h-40 resize-y leading-6" value={form.extractedText} onChange={e => update('extractedText', e.target.value)} placeholder="Parsed policy text appears here."/></label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className="btn-secondary" onClick={redetect} disabled={!form.extractedText.trim()}>Re-detect structure</button><span className="text-xs text-slate-500">{parserMeta.parser ? `${parserMeta.parser}${parserMeta.pageCount ? ` · ${parserMeta.pageCount} pages` : ''}` : 'No parser run yet'}</span></div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-950">2. Review extracted structure</div><div className="mt-0.5 text-xs text-slate-500">Confirm headings and content before chunking.</div></div><span className="mono text-xs text-slate-500">{parsedSections.length} sections</span></div>
          {parsedSections.length ? <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2">{parsedSections.slice(0, 30).map((section, index) => <div key={`${section.heading}-${index}`} className="rounded-md border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold text-slate-900">{section.heading}</div>{section.page && <span className="mono text-[10px] text-slate-500">p. {section.page}</span>}</div><div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{section.text}</div></div>)}</div> : <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Upload and parse a document to review its detected structure.</div>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="btn-primary" onClick={ingest} disabled={busy}>Chunk & stage for review</button><button type="button" className="btn-secondary" onClick={clearSession}><RotateCcw size={13}/>Clear session uploads</button></div>
        {message && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-xs leading-5 text-slate-700">{message}</div>}
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="label mb-3">Governed ingestion pipeline</div>
          <ol className="space-y-2.5">{steps.map(([label, Icon], index) => {
            const done = completedSteps > index;
            return <li key={label} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-500'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}><Icon size={14}/></span><span className="flex-1 font-medium">{label}</span>{done && <CheckCircle2 size={16} className="text-emerald-600"/>}</li>;
          })}</ol>
        </div>

        <div>
          <div className="label mb-2">Built-in policy corpus</div>
          <div className="space-y-2">{staticDocuments.map(document => <div key={document.document_id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold text-slate-900">{document.title}</div><span className="status-chip border-emerald-200 bg-emerald-50 text-emerald-800">{document.status}</span></div><div className="mono mt-1.5 text-[11px] text-slate-500">v{document.version} · effective {document.effective_date}</div></div>)}</div>
        </div>
      </div>
    </div>

    {selectedDocument && <div className="border-t border-slate-100 px-5 py-5">
      <div className="mb-3"><div className="label text-violet-700">Rule mapping review</div><h3 className="mt-1 text-base font-semibold text-slate-950">{selectedDocument.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">Candidate mappings are suggestions only. An administrator must approve a mapping before the uploaded section can be retrieved as policy support for that rule.</p></div>
      {mappings.length ? <div className="grid gap-2 lg:grid-cols-2">{mappings.map(mapping => {
        const rule = getRuleById(mapping.rule_id);
        return <div key={mapping.mapping_id} className={`rounded-lg border p-3 ${mapping.status === 'Approved' ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}><div className="flex items-start justify-between gap-3"><div><div className="mono text-[11px] font-bold text-slate-500">{mapping.rule_id}</div><div className="mt-0.5 text-sm font-semibold text-slate-900">{rule?.name ?? mapping.rule_id}</div></div><span className={`status-chip ${mapping.status === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{mapping.status}</span></div><div className="mt-2 text-xs font-semibold text-violet-800">{mapping.section_heading}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">{mapping.reason} · score {mapping.score}</div>{mapping.status !== 'Approved' && <button type="button" className="btn-secondary mt-2" onClick={() => approve(mapping.mapping_id)}>Approve mapping</button>}</div>;
      })}</div> : <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Run validation/review mappings to generate candidate rule relationships.</div>}
      {mappings.length > 0 && <div className="mt-3 text-xs text-slate-500">Approved mappings: <strong className="text-slate-800">{approvedCount}</strong></div>}
    </div>}

    <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-4">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Database size={15}/></span><div><h3 className="text-sm font-semibold text-slate-900">Session-ingested documents</h3><div className="mt-0.5 text-[11px] text-slate-500">Validate, review rule mappings, then activate for RAG.</div></div></div>
      {managed.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">No browser-session policy documents have been ingested yet.</div> : <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left"><tr><th className="px-3 py-2.5 label">Document</th><th className="px-3 py-2.5 label">Structure</th><th className="px-3 py-2.5 label">Validation</th><th className="px-3 py-2.5 label">Status</th><th className="px-3 py-2.5 label">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{managed.map(document => <tr key={document.document_id}><td className="px-3 py-3"><div className="font-semibold text-slate-900">{document.title}</div><div className="mono mt-0.5 text-[11px] text-slate-500">v{document.version} · {document.filename}</div></td><td className="px-3 py-3 text-xs text-slate-600">{document.section_count} sections · {document.chunk_count} chunks{document.page_count ? ` · ${document.page_count} pages` : ''}</td><td className="px-3 py-3"><span className={`status-chip ${document.validation_status === 'Passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : document.validation_status === 'Warning' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{document.validation_status}</span></td><td className="px-3 py-3"><span className={`status-chip ${document.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{document.index_status}</span></td><td className="px-3 py-3"><div className="flex flex-wrap gap-1.5">{document.status === 'Active' ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13}/>RAG active</span> : <><button type="button" className="btn-secondary" onClick={() => validate(document.document_id)}>Validate</button>{document.validation_status === 'Passed' && <button type="button" className="btn-secondary" onClick={() => reviewMappings(document.document_id)}>Rule mappings</button>}<button type="button" className="btn-primary" onClick={() => activate(document.document_id)}>Activate</button></>}</div></td></tr>)}</tbody></table></div></div>}
    </div>
  </section>;
}
