export type ThreatStatus = "new" | "investigating" | "resolved";
export type Severity = "low" | "medium" | "high" | "critical";
export type ThreatType =
  | "phishing"
  | "brute_force"
  | "malware"
  | "safe_traffic"
  | "auth_traffic"
  | "file_scan";


export interface ThreatEvent {
  id: string;
  timestamp: string;
  type: 'status_change' | 'assignment' | 'created';
  actor: string;
  details: {
    old_value?: string;
    new_value?: string;
    message?: string;
  };
}

export interface Threat {
  id: string;
  timestamp: string;
  source: string; // ip/domain/url
  type: ThreatType;
  severity: Severity;
  confidence: number;
  status: ThreatStatus;
  assigned_to: string | null;
  summary: string;
  details: Record<string, unknown>;
  events: ThreatEvent[];
}

export interface ThreatFilters {
  severity?: Severity[];
  status?: ThreatStatus[];
  type?: ThreatType[];
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ThreatAssignRequest {
  assigned_to: string;
}

export interface ThreatStatusRequest {
  status: ThreatStatus;
}

export interface ThreatStats {
  total: number;
  new: number;
  investigating: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}