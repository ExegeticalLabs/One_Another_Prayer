import React, { useState, useEffect } from "react";

export const dayKey = (t: any) => {
  if (!t) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const secondsToMinutes = (s: number) => Math.max(0, Math.round(s / 60));
export const fmtMin = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

export const formatTimeAgo = (ts: any) => {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export function useLS<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const isBrowser = typeof window !== "undefined";
  const [v, setV] = useState<T>(() => {
    if (!isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  });
  useEffect(() => {
    if (!isBrowser) return;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v, isBrowser]);
  return [v, setV];
}
