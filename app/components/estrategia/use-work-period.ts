"use client";
import { useRef, useSyncExternalStore } from "react";
import type { WorkPeriod } from "@/lib/estrategia/activity-status";
import { readWorkPeriod, workPeriodCookie } from "@/lib/estrategia/work-preferences";

const changeEvent = "distinto-brand-work-period";
function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("focus", onChange);
  };
}
function cookieValue(name: string) {
  return document.cookie.split("; ").find(c => c.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function useWorkPeriod(memberId: string, brandId: string, initial: WorkPeriod) {
  const name = workPeriodCookie(memberId, brandId);
  const fallback = useRef<{ name: string; value: WorkPeriod } | null>(null);
  const period = useSyncExternalStore(subscribe, () => {
    if (fallback.current?.name === name) return fallback.current.value;
    try { return readWorkPeriod(cookieValue(name)); } catch { return initial; }
  }, () => initial);

  function setPeriod(value: WorkPeriod) {
    const next = readWorkPeriod(value);
    // Keep the selector usable even if the browser blocks cookie storage.
    fallback.current = { name, value: next };
    try {
      document.cookie = `${name}=${next}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
      if (cookieValue(name) === next) fallback.current = null;
    } catch { /* Selection still works for the current view. */ }
    window.dispatchEvent(new Event(changeEvent));
  }
  return [period, setPeriod] as const;
}
