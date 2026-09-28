import policyDocumentsData from '@/data/policy_documents.json';
import policySectionsData from '@/data/policy_snippets.json';
import type { PolicyDocument, PolicyQueryContext, PolicySection } from './policyTypes';

const documents = policyDocumentsData as PolicyDocument[];
const sections = policySectionsData as PolicySection[];

const documentByTitle = new Map(documents.map(document => [document.title, document]));

const isEffectiveOn = (document: PolicyDocument, asOfDate?: string) => {
  if (!asOfDate) return document.status === 'Active';
  const afterStart = document.effective_date <= asOfDate;
  const beforeEnd = !document.expiration_date || asOfDate <= document.expiration_date;
  return afterStart && beforeEnd;
};

export const listPolicyDocuments = () => documents;

export const listPolicySections = (): PolicySection[] => sections.map(section => ({
  ...section,
  document: documentByTitle.get(section.source_doc),
}));

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
