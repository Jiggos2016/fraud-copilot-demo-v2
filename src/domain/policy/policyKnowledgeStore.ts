import type { PolicyDocument, PolicySection } from './policyTypes';

const DOCUMENTS_KEY = 'fraud-copilot-policy-documents';
const SECTIONS_KEY = 'fraud-copilot-policy-sections';

export type ManagedPolicyDocument = PolicyDocument & {
  filename: string;
  file_size: number;
  section_count: number;
  chunk_count: number;
  index_status: 'Ready for review' | 'Active';
  session_only: true;
};

export type ManagedPolicySection = PolicySection & {
  document_id: string;
  chunk_index: number;
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

const chunkText = (text: string) => {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(value => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';
  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n${paragraph}` : paragraph;
    if (candidate.length > 900 && buffer) {
      chunks.push(buffer);
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length ? chunks : [text.trim()];
};

export function ingestPolicyForSession(input: PolicyIngestionInput) {
  const createdAt = new Date().toISOString();
  const idSuffix = Date.now().toString(36).toUpperCase();
  const documentId = `DOC-UPLOAD-${idSuffix}`;
  const chunks = chunkText(input.extractedText);
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
    section_count: chunks.length,
    chunk_count: chunks.length,
    index_status: 'Ready for review',
    session_only: true,
  };

  const sections: ManagedPolicySection[] = chunks.map((text, index) => ({
    snippet_id: `UPL-${idSuffix}-${index + 1}`,
    document_id: documentId,
    source_doc: input.title,
    section: `Imported chunk ${index + 1}`,
    text,
    chunk_index: index + 1,
  }));

  writeJson(DOCUMENTS_KEY, [...listManagedPolicyDocuments(), document]);
  writeJson(SECTIONS_KEY, [...listManagedPolicySections(), ...sections]);
  return { document, sections };
}

export function activateManagedPolicy(documentId: string) {
  const documents = listManagedPolicyDocuments().map(document =>
    document.document_id === documentId
      ? { ...document, status: 'Active', index_status: 'Active' as const }
      : document,
  );
  writeJson(DOCUMENTS_KEY, documents);
  return documents.find(document => document.document_id === documentId);
}

export function clearManagedPolicies() {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(DOCUMENTS_KEY);
  window.sessionStorage.removeItem(SECTIONS_KEY);
}
