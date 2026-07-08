// useTauriEvent: 通用的 Tauri Event 监听 Hook

import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function useTauriEvent<T>(
  eventName: string | null,
  callback: (payload: T) => void,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!eventName) return;

    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      unlisten = await listen<T>(eventName, (event) => {
        callbackRef.current(event.payload);
      });
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [eventName]);
}
