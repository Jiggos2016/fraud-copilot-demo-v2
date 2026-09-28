export type InvestigationRule = {
  rule_id: string;
  name: string;
  description: string;
  trigger_signals: string[];
  trigger_logic: string;
  policy_ids: string[];
  evidence_required: string[];
  system_action: string;
  prohibited_action: string;
  owner: string;
  status: string;
};

export type TriggeredRule = {
  rule: InvestigationRule;
  matchedSignals: string[];
};
