export type PolicyDocument = {
  document_id: string;
  title: string;
  version: string;
  jurisdiction: string;
  effective_date: string;
  expiration_date: string | null;
  status: string;
  authority: string;
  source_type: string;
  source_uri: string | null;
  ingested_at: string;
};

export type PolicySection = {
  snippet_id: string;
  source_doc: string;
  section: string;
  text: string;
  document?: PolicyDocument;
};

export type PolicyQueryContext = {
  policyIds?: string[];
  asOfDate?: string;
  jurisdiction?: string;
};
