export interface Evidence {
  id: string;
  source: string;
  signal_type: string;
  relevance: number;
  data: string;
  description: string;
}

export interface SuggestedAction {
  order: number;
  action: string;
  priority: 'immediate' | 'short_term' | 'long_term';
}

export interface ReasoningStep {
  step: number;
  observation: string;
}

export interface AlternativeHypothesis {
  hypothesis: string;
  confidence: number;
  reasoning: string;
}

export interface RootCauseAnalysis {
  summary: string;
  likely_cause: string;
  severity_assessment: string;
  suggested_actions: SuggestedAction[];
  confidence: number;
  evidence: Evidence[];
  reasoning_chain: ReasoningStep[];
  alternative_hypotheses: AlternativeHypothesis[];
  hallucination_disclaimer?: string;
}
