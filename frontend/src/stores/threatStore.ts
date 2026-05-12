//frontend/src/stores/threatStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Threat, ThreatFilters, ThreatStats } from '@/types/threats';

interface ThreatStore {
  threats: Threat[];
  stats: ThreatStats;
  filters: ThreatFilters;
  isConnected: boolean;
  addThreat: (threat: Threat) => void;
  updateThreat: (id: string, updates: Partial<Threat>) => void;
  setFilters: (filters: ThreatFilters) => void;
  clearFilters: () => void;
  setConnected: (connected: boolean) => void;
  getFilteredThreats: () => Threat[];
  calculateStats: () => void;
}

export const useThreatStore = create<ThreatStore>()(
  subscribeWithSelector((set, get) => ({
    threats: [],
    stats: {
      total: 0,
      new: 0,
      investigating: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    filters: {},
    isConnected: false,

    addThreat: (threat) => {
  set((state) => ({
    threats: [threat, ...state.threats],
  }));

  // Recalculate stats including safe events
  get().calculateStats();
},


    updateThreat: (id, updates) => {
      set((state) => ({
        threats: state.threats.map((threat) =>
          threat.id === id ? { ...threat, ...updates } : threat
        ),
      }));
      get().calculateStats();
    },

    setFilters: (filters) => {
      set({ filters });
    },

    clearFilters: () => {
      set({ filters: {} });
    },

    setConnected: (connected) => {
      set({ isConnected: connected });
    },

    getFilteredThreats: () => {
  const { threats, filters } = get();

  return threats.filter((threat) => {
    // severity filter
    if (filters.severity && !filters.severity.includes(threat.severity)) {
      return false;
    }

    // status filter
    if (filters.status && !filters.status.includes(threat.status)) {
      return false;
    }

    // type filter (NOW ALLOWS SAFE TYPES)
    if (filters.type && !filters.type.includes(threat.type)) {
      return false;
    }

    // search text
    if (filters.q) {
      const query = filters.q.toLowerCase();
      return (
        threat.source.toLowerCase().includes(query) ||
        threat.summary.toLowerCase().includes(query) ||
        threat.type.toLowerCase().includes(query)
      );
    }

    return true;
  });
},



    calculateStats: () => {
      const { threats } = get();
      
      const stats: ThreatStats = {
        total: threats.length,
        new: threats.filter(t => t.status === 'new').length,
        investigating: threats.filter(t => t.status === 'investigating').length,
        resolved: threats.filter(t => t.status === 'resolved').length,
        critical: threats.filter(t => t.severity === 'critical').length,
        high: threats.filter(t => t.severity === 'high').length,
        medium: threats.filter(t => t.severity === 'medium').length,
        low: threats.filter(t => t.severity === 'low').length,
      };

      set({ stats });
    },
  }))
);