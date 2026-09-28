import type { PolicyDocument, PolicySection } from './policyTypes';

export type ParsedPolicySection = {
  sectionId: string;
  sectionNumber: string;
  heading: string;
  page?: number;
  text: string;
};

export type ParsedPolicyDocument = {
  metadata: PolicyDocument;
  sections: ParsedPolicySection[];
};

export type IngestedPolicyBundle = {
  document: PolicyDocument;
  sections: PolicySection[];
};

export function normalizeParsedPolicy(input: ParsedPolicyDocument): IngestedPolicyBundle {
  const sections = input.sections
    .filter(section => section.text.trim().length > 0)
    .map(section => ({
      snippet_id: section.sectionId,
      source_doc: input.metadata.title,
      section: `${section.sectionNumber} - ${section.heading}`,
      text: section.text.trim(),
      document: input.metadata,
    }));

  return { document: input.metadata, sections };
}

// Production adapters should parse PDF/DOCX/HTML outside the browser and pass
// structured sections into normalizeParsedPolicy. The normalized bundle can then
// be written to Snowflake/Cortex Search or another approved retrieval store.
