import { useEffect, useMemo, useRef } from "react";
import { useRealtime } from "../context/RealtimeContext";

export function useRealtimeInvalidation(
  events: string[],
  onInvalidate: () => void,
  shouldHandle: (payload: Record<string, unknown>) => boolean = () => true,
) {
  const { lastEvent } = useRealtime();
  const handledAtRef = useRef(0);
  const onInvalidateRef = useRef(onInvalidate);
  const shouldHandleRef = useRef(shouldHandle);
  const eventSet = useMemo(() => new Set(events), [events.join("|")]);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
    shouldHandleRef.current = shouldHandle;
  }, [onInvalidate, shouldHandle]);

  useEffect(() => {
    if (!lastEvent || handledAtRef.current === lastEvent.receivedAt) {
      return;
    }

    if (!eventSet.has(lastEvent.name) || !shouldHandleRef.current(lastEvent.payload)) {
      return;
    }

    handledAtRef.current = lastEvent.receivedAt;
    onInvalidateRef.current();
  }, [eventSet, lastEvent]);
}
