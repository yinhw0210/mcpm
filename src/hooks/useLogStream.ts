// useLogStream: 实时监听 MCP Server 日志流

import { useCallback, useEffect, useRef, useState } from "react";
import { listenToLogStream } from "@/lib/tauri";
import type { LogPayload } from "@/lib/types";

const MAX_LOGS = 5000;

export function useLogStream(serverName: string | null) {
  const [logs, setLogs] = useState<LogPayload[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(async () => {
    if (!serverName) return;

    unlistenRef.current?.();

    const unlisten = await listenToLogStream(serverName, (payload) => {
      setLogs((prev) => {
        const next = [...prev, payload];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    });

    unlistenRef.current = unlisten;
    setIsStreaming(true);
  }, [serverName]);

  const stopListening = useCallback(() => {
    unlistenRef.current?.();
    unlistenRef.current = null;
    setIsStreaming(false);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, [startListening, stopListening]);

  return { logs, isStreaming, clearLogs, startListening, stopListening };
}
