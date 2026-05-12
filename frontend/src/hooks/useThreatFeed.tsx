import { useEffect, useRef } from "react";
import { useThreatStore } from "@/stores/threatStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import type { Threat } from "@/types/threats";
import { subscribeToThreats } from "@/services/threats";

export const useThreatFeed = () => {
  const { addThreat, setConnected } = useThreatStore();
  const { isAuthenticated } = useAuthStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize critical alert sound
    audioRef.current = new Audio();
    audioRef.current.volume = 0.3;

    // Subscribe to backend WebSocket
    const unsubscribe = subscribeToThreats((threat: Threat) => {
      addThreat(threat);

      // Sound alert for critical threats
      if (threat.severity === "critical" && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      // Toast alert
      toast({
        title: `${threat.severity.toUpperCase()} Threat Detected`,
        description: threat.summary,
        variant: threat.severity === "critical" ? "destructive" : "default",
      });
    });

    setConnected(true);

    return () => {
      unsubscribe();
      setConnected(false);
    };
  }, [isAuthenticated, addThreat, setConnected]);

  return {};
};
