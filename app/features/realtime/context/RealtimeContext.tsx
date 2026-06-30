import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { baseURL } from "../../../utils/api";
import { useAuth } from "../../auth/context/AuthContext";

export interface RealtimeEvent {
  name: string;
  payload: Record<string, unknown>;
  receivedAt: number;
}

interface RealtimeContextValue {
  connected: boolean;
  lastEvent: RealtimeEvent | null;
  joinComplaint: (complaintId: string) => void;
  joinWard: (wardId?: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const realtimeEvents = [
  "complaint:created",
  "complaint:ai_complete",
  "complaint:status_updated",
  "complaint:resolved",
  "complaint:new_comment",
  "complaint:upvoted",
  "complaint:upvote_removed",
  "notification:new",
  "officer:queue_updated",
];

export function RealtimeProvider({ children }: PropsWithChildren) {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(baseURL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 800,
      timeout: 8000,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);

      if (user?.wardId) {
        socket.emit("join:ward", user.wardId);
      }
    });
    socket.on("disconnect", () => setConnected(false));

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, (payload: Record<string, unknown> = {}) => {
        // Screens use this signal to refetch through REST, keeping sockets as a live invalidation layer.
        setLastEvent({ name: eventName, payload, receivedAt: Date.now() });
      });
    });

    return () => {
      realtimeEvents.forEach((eventName) => socket.off(eventName));
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, user?.wardId]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connected,
      lastEvent,
      joinComplaint(complaintId: string) {
        if (complaintId) {
          socketRef.current?.emit("join:complaint", complaintId);
        }
      },
      joinWard(wardId?: string) {
        if (wardId) {
          socketRef.current?.emit("join:ward", wardId);
        }
      },
    }),
    [connected, lastEvent],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider.");
  }

  return context;
}
