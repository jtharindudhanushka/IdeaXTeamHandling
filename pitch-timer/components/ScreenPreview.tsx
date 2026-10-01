"use client";

import { useEffect, useRef, useState } from "react";

// Live thumbnail of a display screen: the real page rendered at 1920×1080 in
// an iframe and scaled down to fit. `?preview=1` makes that page silent and
// hides its corner controls. Clicking opens the full screen in a new tab.
const W = 1920;
const H = 1080;

export function ScreenPreview({ href, label }: { href: string; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block" title={`Open the ${label.toLowerCase()} screen`}>
      <div ref={boxRef} className="relative aspect-video overflow-hidden rounded-xl border border-line bg-canvas">
        {scale > 0 && (
          <iframe
            src={`${href}?preview=1`}
            title={`${label} preview`}
            tabIndex={-1}
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
            style={{ width: W, height: H, transform: `scale(${scale})` }}
          />
        )}
        <div className="absolute inset-0 rounded-xl ring-2 ring-transparent transition group-hover:ring-fill" />
      </div>
    </a>
  );
}

// True when the page is shown inside a ScreenPreview thumbnail.
export function useIsPreview() {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).has("preview"));
  }, []);
  return preview;
}
