export interface MLModel {
  id: string;
  name: string;
  created_at: string;
  active: boolean;
  file_size: number;
  accuracy?: number;
}

export interface ModelUploadRequest {
  name: string;
  file: File;
}

export interface FeatureExplanation {
  feature: string;
  value: number | string;
  weight: number;
  contribution: number;
}

export interface ThreatExplanation {
  threat_id: string;
  model_used: string;
  prediction: string;
  confidence: number;
  features: FeatureExplanation[];
  created_at: string;
}

export interface IntelFeedStatus {
  abuse_ips: number;
  blacklist_hashes: number;
  blacklist_domains: number;
  last_updated: string;
}

export interface IntelImportResult {
  imported: number;
  duplicates: number;
  errors: number;
}