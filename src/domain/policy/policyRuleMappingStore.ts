export type RulePolicyMapping = {
  mapping_id: string;
  rule_id: string;
  document_id: string;
  section_id: string;
  section_heading: string;
  score: number;
  reason: string;
  status: 'Suggested' | 'Approved';
  created_at: string;
  approved_at?: string;
};
