"use client";

import { useEffect, useState } from "react";

const KEY = "predictry:watchlist:v1";

export function useWatchlist(): [Set<string>, (id: string) => void, boolean] {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(new Set(JSON.parse(raw)));
    } catch {}
    setHydrated(true);
  }, []);

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  return [ids, toggle, hydrated];
}
