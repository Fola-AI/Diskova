"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave (§8.9). Calls `save(values)` 800 ms after the last change; `flush()` saves now
 * (used before navigating to the next step). Field errors from the server are surfaced.
 */
export function useAutosave<T>(
  values: T,
  save: (values: T) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string[]> }>,
  delay = 800,
) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const first = useRef(true);
  const latest = useRef(values);
  latest.current = values;

  const run = useCallback(async () => {
    setState("saving");
    const res = await save(latest.current);
    if (res.ok) {
      setState("saved");
      setError(null);
      setFieldErrors({});
    } else {
      setState("error");
      setError(res.error ?? "Couldn't save.");
      setFieldErrors(res.fieldErrors ?? {});
    }
    return res.ok;
  }, [save]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void run(), delay);
    return () => clearTimeout(t);
  }, [values, delay, run]);

  return { state, error, fieldErrors, flush: run };
}
