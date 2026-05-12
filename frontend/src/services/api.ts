import axios from "axios";
import type {
  LoginForm,
  AuthResponse,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
} from "@/types/auth";
import type { Config, ConfigUpdateRequest } from "@/types/config";
import type {
  Threat,
  ThreatFilters,
  ThreatAssignRequest,
  ThreatStatusRequest,
} from "@/types/threats";
import type {
  MLModel,
  ThreatExplanation,
  IntelFeedStatus,
  IntelImportResult,
} from "@/types/ml";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://oasis-vincent-lauderdale-dock.trycloudflare.com";


// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor → attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor → handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

//
// =============== AUTH API ===============
//
export const authAPI = {
  login: async (credentials: LoginForm): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", credentials);
    const data = res.data;

    if (data?.access_token) localStorage.setItem("auth_token", data.access_token);
    if (data?.role) localStorage.setItem("user_role", data.role);

    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },

  seedAdmin: async (): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/auth/seed-admin");
    return res.data;
  },

  health: async (): Promise<{ status: string }> => {
    try {
      const res = await api.get<{ status: string }>("/health");
      return res.data;
    } catch {
      return { status: "unhealthy" };
    }
  },
};

//
// =============== ADMIN API ===============
//
export const adminAPI = {
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>("/admin/users");
    return res.data;
  },

  createUser: async (userData: CreateUserRequest): Promise<User> => {
    const res = await api.post<User>("/admin/users", userData);
    return res.data;
  },

  updateUser: async (
    username: string,
    updates: UpdateUserRequest
  ): Promise<User> => {
    const res = await api.put<User>(`/admin/users/${username}`, updates);
    return res.data;
  },

  resetPassword: async (
    username: string,
    passwordData: ResetPasswordRequest
  ): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(
      `/admin/users/${username}/reset-password`,
      passwordData
    );
    return res.data;
  },

  getConfig: async (): Promise<Config> => {
    const res = await api.get<Config>("/admin/config");
    return res.data;
  },

  updateConfig: async (config: Config): Promise<Config> => {
    const res = await api.put<Config>("/admin/config", config);
    return res.data;
  },

  patchConfig: async (updates: ConfigUpdateRequest): Promise<Config> => {
    const res = await api.patch<Config>("/admin/config", updates);
    return res.data;
  },

  exportConfig: async (): Promise<Blob> => {
    const res = await api.get("/admin/config/export", { responseType: "blob" });
    return res.data;
  },

  importConfig: async (file: File): Promise<Config> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<Config>("/admin/config/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

//
// =============== THREATS API ===============
//
export const threatsAPI = {
  getThreat: async (id: string): Promise<Threat> => {
    const res = await api.get<Threat>(`/threats/${id}`);
    return res.data;
  },

  getThreats: async (
    filters?: ThreatFilters
  ): Promise<{ threats: Threat[]; total: number }> => {
    const res = await api.get<{ threats: Threat[]; total: number }>("/threats", {
      params: filters,
    });
    return res.data;
  },

  assignThreat: async (id: string, data: ThreatAssignRequest): Promise<Threat> => {
    const res = await api.post<Threat>(`/threats/${id}/assign`, data);
    return res.data;
  },

  updateThreatStatus: async (
    id: string,
    data: ThreatStatusRequest
  ): Promise<Threat> => {
    const res = await api.post<Threat>(`/threats/${id}/status`, data);
    return res.data;
  },
};

//
// =============== ML API ===============
//
export const mlAPI = {
  getModels: async (): Promise<MLModel[]> => {
    const res = await api.get<MLModel[]>("/ml/models");
    return res.data;
  },

  uploadModel: async (name: string, file: File): Promise<MLModel> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    const res = await api.post<MLModel>("/ml/models/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  activateModel: async (modelId: string): Promise<MLModel> => {
    const res = await api.post<MLModel>(`/ml/models/${modelId}/activate`);
    return res.data;
  },

  explainThreat: async (threatId: string): Promise<ThreatExplanation> => {
    const res = await api.get<ThreatExplanation>(
      `/ml/explain/${threatId}`
    );
    return res.data;
  },
};

//
// =============== INTEL API ===============
//
export const intelAPI = {
  getStatus: async (): Promise<IntelFeedStatus> => {
    const res = await api.get<IntelFeedStatus>("/intel/status");
    return res.data;
  },

  importAbuseIPDB: async (file: File): Promise<IntelImportResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<IntelImportResult>(
      "/intel/import/abuseipdb",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  importBlacklistHashes: async (file: File): Promise<IntelImportResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<IntelImportResult>(
      "/intel/import/hashes",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },
};

//
// =============== AI API (Decision Support) ===============
//
export interface AiAnalysisRequest {
  url: string;
  type: string;
  confidence: number;
}
export interface AiAnalysisResponse {
  reason: string;
  recommendation: string;
}

export const aiAPI = {
  analyze: async (data: AiAnalysisRequest): Promise<AiAnalysisResponse> => {
    const res = await api.post<AiAnalysisResponse>("/ai-analysis", data);
    return res.data;
  },
};

//
// =============== FALSE POSITIVES API ===============
//
export interface FPReport {
  id?: string;
  url: string;
  type: string;
  confidence: number;
  timestamp: string;
  status: string;
}

export const fpAPI = {
  getReported: async (): Promise<FPReport[]> => {
    const res = await api.get<FPReport[]>("/false-positives");
    return res.data;
  },
  action: async (url: string, action: "resolve" | "whitelist"): Promise<{message: string}> => {
    const res = await api.post("/false-positive/action", { url, action });
    return res.data;
  }
};

export default api;
