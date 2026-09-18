export interface PastIncident {
  id: string;
  title: string;
  date: string;
  summary: string;
  cause: string;
  resolution: string;
}

export interface SimilarIncident {
  incident_id: string;
  title: string;
  similarity_score: number;
  resolution: string;
  resolved_at?: string;
}

export interface SuspectCommit {
  sha: string;
  author: string;
  message: string;
  committed_at: string;
  relevance_score: number;
  files_changed: string[];
}

export interface EnrichmentContext {
  similar_past_incidents: SimilarIncident[];
  suspect_commits: SuspectCommit[];
}
