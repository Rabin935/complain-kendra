import { useEffect, useRef } from "react";
import { useRealtime } from "../context/RealtimeContext";

export function useRealtimeInvalidation(
  events: string[],
  onInvalidate: () => void,
  shouldHandle: (payload: Record<string, unknown>) => boolean = () => true,
) {
  const { lastEvent } = useRealtime();
  const handledAtRef = useRef(0);

  useEffect(() => {
    if (!lastEvent || handledAtRef.current === lastEvent.receivedAt) {
      return;
    }

    if (!events.includes(lastEvent.name) || !shouldHandle(lastEvent.payload)) {
      return;
    }

    handledAtRef.current = lastEvent.receivedAt;
    onInvalidate();
  }, [events, lastEvent, onInvalidate, shouldHandle]);
}
