'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

/**
 * Reloads today's data.
 *
 * Pinned to the home screen the app runs standalone, with no browser chrome and
 * no reliable pull-to-refresh, so the only way back to fresh data was to close
 * and reopen it. This is that control.
 *
 * It refreshes the route rather than reloading the document: the server
 * component refetches and React swaps the new data in, which keeps the session
 * and avoids a white flash on a slow connection.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  // The transition can finish faster than the eye can follow, which reads as
  // "nothing happened". Hold the spin briefly so the tap is always acknowledged.
  useEffect(() => {
    if (!spinning) return;
    const t = setTimeout(() => setSpinning(false), 550);
    return () => clearTimeout(t);
  }, [spinning]);

  const busy = pending || spinning;

  return (
    <button
      type="button"
      aria-label="Refresh data"
      aria-busy={busy}
      disabled={busy}
      onClick={() => {
        setSpinning(true);
        startTransition(() => router.refresh());
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-3.5-7.1" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
