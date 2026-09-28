import policyDocumentsData from '@/data/policy_documents.json';
import policySectionsData from '@/data/policy_snippets.json';
import { listManagedPolicyDocuments, listManagedPolicySections } from './policyKnowledgeStore';
import type { PolicyDocument, PolicyQueryContext, PolicySection } from './policyTypes';

const staticDocuments = policyDocumentsData as PolicyDocument[];
const staticSections = policySectionsData as PolicySection[];

const isEffectiveOn = (document: PolicyDocument, asOfDate?: string) => {
  if (!asOfDate) return document.status === 'Active';
  const afterStart = document.effective_date <= asOfDate;
  const beforeEnd = !document.expiration_date || asOfDate <= document.expiration_date;
  return afterStart && beforeEnd && document.status === 'Active';
};

export const listPolicyDocuments = (): PolicyDocument[] => [
  ...staticDocuments,
  ...listManagedPolicyDocuments(),
];

export const listPolicySections = (): PolicySection[] => {
  const documents = listPolicyDocuments();
  const documentById = new Map(documents.map(document => [document.document_id, document]));
  const documentByTitle = new Map(documents.map(document => [document.title, document]));
  const sections: PolicySection[] = [...staticSections, ...listManagedPolicySections()];

  return sections.map(section => {
    const document = section.document_id
      ? documentById.get(section.document_id)
      : documentByTitle.get(section.source_doc);
    return document ? { ...section, document } : { ...section };
  });
};

export const getPolicySection = (policyId: string) =>
  listPolicySections().find(section => section.snippet_id === policyId);

export function getApplicablePolicySections(context: PolicyQueryContext = {}) {
  return listPolicySections().filter(section => {
    const document = section.document;
    if (!document) return false;
    if (context.policyIds?.length && !context.policyIds.includes(section.snippet_id)) return false;
    if (context.jurisdiction && document.jurisdiction !== context.jurisdiction) return false;
    return isEffectiveOn(document, context.asOfDate);
  });
}
