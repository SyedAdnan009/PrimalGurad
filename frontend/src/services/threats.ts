//frontend/src/services/threats.ts
import api from "./api";
import type { Threat } from "@/types/threats";
import { useThreatStore } from "@/stores/threatStore";

// Load threats from backend
export async function loadThreats(): Promise<Threat[]> {
  const res = await api.get("/threats");
  return res.data.threats || res.data;
}

// Live updates via WebSocket
export function subscribeToThreats(callback: (t: Threat) => void) {
  const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000";
  const ws = new WebSocket(`${WS_BASE_URL}/ws/threats`);

  ws.onopen = () => {
    console.log("WebSocket connected");
    useThreatStore.getState().setConnected(true);
  };

  ws.onmessage = (msg) => {
  try {
    const data = JSON.parse(msg.data);

    // Case 1: backend broadcast sends a single threat
    if (data.id && data.type) {
      callback(data);
      return;
    }

    // Case 2: WebSocket ingest returns array
    if (data.detected && Array.isArray(data.detected)) {
      data.detected.forEach((t: Threat) => callback(t));
      return;
    }

    console.warn("Unknown WS message format:", data);

  } catch (err) {
    console.error("WS parse error:", err);
  }
};


  ws.onclose = () => {
    console.log("WebSocket disconnected");
    useThreatStore.getState().setConnected(false);
  };

  ws.onerror = (e) => {
    console.error("WebSocket error:", e);
    useThreatStore.getState().setConnected(false);
  };

  return () => ws.close();
}



