import type { PolicyDocument, PolicySection } from './policyTypes';
import type { ParsedPolicySection } from './policyDocumentParser';

const DOCUMENTS_KEY = 'fraud-copilot-policy-documents';
const SECTIONS_KEY = 'fraud-copilot-policy-sections';

export type ManagedPolicyDocument = PolicyDocument & {
  filename: string;
  file_size: number;
  section_count: number;
  chunk_count: number;
  page_count?: number;
  parser?: string;
  index_status: 'Ready for review' | 'Validated' | 'Active';
  validation_status: 'Not run' | 'Passed' | 'Warning';
  validation_messages: string[];
  session_only: true;
};

export type ManagedPolicySection = PolicySection & {
  document_id: string;
  chunk_index: number;
  source_page?: number;
};

export type PolicyIngestionInput = {
  filename: string;
  fileSize: number;
  title: string;
  version: string;
  jurisdiction: string;
  effectiveDate: string;
  expirationDate?: string;
  authority: string;
  extractedText: string;
  parsedSections?: ParsedPolicySection[];
  pageCount?: number;
  parser?: string;
};

const canUseSessionStorage = () => typeof window !== 'undefined' && !!window.sessionStorage;

const readJson = <T,>(key: string, fallback: T): T => {
  if (!canUseSessionStorage()) return fallback;
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (canUseSessionStorage()) window.sessionStorage.setItem(key, JSON.stringify(value));
};

export const listManagedPolicyDocuments = () => readJson<ManagedPolicyDocument[]>(DOCUMENTS_KEY, []);
export const listManagedPolicySections = () => readJson<ManagedPolicySection[]>(SECTIONS_KEY, []);
export const getManagedPolicySections = (documentId: string) => listManagedPolicySections().filter(section => section.document_id === documentId);

const splitLongText = (text: string, limit = 950) => {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length > limit && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length ? chunks : [text.trim()];
};

const buildChunks = (sections: ParsedPolicySection[], fallbackText: string) => {
  const source = sections.length ? sections : [{ heading: 'Imported policy text', text: fallbackText }];
  return source.flatMap((section, sectionIndex) =>
    splitLongText(section.text).map((text, partIndex) => ({
      heading: section.heading || `Imported section ${sectionIndex + 1}`,
      text,
      page: section.page,
      part: partIndex + 1,
    })),
  );
};

export function ingestPolicyForSession(input: PolicyIngestionInput) {
  const createdAt = new Date().toISOString();
  const idSuffix = Date.now().toString(36).toUpperCase();
  const documentId = `DOC-UPLOAD-${idSuffix}`;
  const sourceSections = input.parsedSections?.filter(section => section.text.trim()) ?? [];
  const chunks = buildChunks(sourceSections, input.extractedText);
  const document: ManagedPolicyDocument = {
    document_id: documentId,
    title: input.title,
    version: input.version,
    jurisdiction: input.jurisdiction,
    effective_date: input.effectiveDate,
    expiration_date: input.expirationDate || null,
    status: 'Draft',
    authority: input.authority,
    source_type: 'Browser session upload',
    source_uri: null,
    ingested_at: createdAt,
    filename: input.filename,
    file_size: input.fileSize,
    section_count: sourceSections.length || chunks.length,
    chunk_count: chunks.length,
    ...(input.pageCount ? { page_count: input.pageCount } : {}),
    ...(input.parser ? { parser: input.parser } : {}),
    index_status: 'Ready for review',
    validation_status: 'Not run',
    validation_messages: [],
    session_only: true,
  };

  const sections: ManagedPolicySection[] = chunks.map((chunk, index) => ({
    snippet_id: `UPL-${idSuffix}-${index + 1}`,
    document_id: documentId,
    source_doc: input.title,
    section: chunk.part > 1 ? `${chunk.heading} · part ${chunk.part}` : chunk.heading,
    text: chunk.text,
    chunk_index: index + 1,
    ...(chunk.page ? { source_page: chunk.page } : {}),
  }));

  writeJson(DOCUMENTS_KEY, [...listManagedPolicyDocuments(), document]);
  writeJson(SECTIONS_KEY, [...listManagedPolicySections(), ...sections]);
  return { document, sections };
}

export function validateManagedPolicy(documentId: string) {
  const sections = getManagedPolicySections(documentId);
  const documents = listManagedPolicyDocuments();
  const target = documents.find(document => document.document_id === documentId);
  if (!target) return undefined;

  const messages: string[] = [];
  if (!target.title.trim()) messages.push('Document title is missing.');
  if (!target.version.trim()) messages.push('Version is missing.');
  if (!target.effective_date) messages.push('Effective date is missing.');
  if (!target.jurisdiction.trim()) messages.push('Jurisdiction is missing.');
  if (!sections.length) messages.push('No searchable policy chunks were created.');
  if (sections.some(section => section.text.length < 40)) messages.push('One or more chunks are unusually short and should be reviewed.');
  if (target.expiration_date && target.expiration_date < target.effective_date) messages.push('Expiration date precedes effective date.');

  const blocking = messages.some(message => message.includes('missing') || message.includes('No searchable') || message.includes('precedes'));
  const validationStatus: ManagedPolicyDocument['validation_status'] = blocking ? 'Warning' : 'Passed';
  const validationMessages = messages.length ? messages : ['Metadata and searchable chunks passed local validation.'];

  const updated = documents.map(document =>
    document.document_id === documentId
      ? { ...document, validation_status: validationStatus, validation_messages: validationMessages, index_status: 'Validated' as const }
      : document,
  );
  writeJson(DOCUMENTS_KEY, updated);
  return updated.find(document => document.document_id === documentId);
}

export function activateManagedPolicy(documentId: string) {
  const documents = listManagedPolicyDocuments();
  const target = documents.find(document => document.document_id === documentId);
  if (!target || target.validation_status !== 'Passed') return undefined;

  const updated = documents.map(document =>
    document.document_id === documentId
      ? { ...document, status: 'Active', index_status: 'Active' as const }
      : document,
  );
  writeJson(DOCUMENTS_KEY, updated);
  return updated.find(document => document.document_id === documentId);
}

export function clearManagedPolicies() {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(DOCUMENTS_KEY);
  window.sessionStorage.removeItem(SECTIONS_KEY);
}
