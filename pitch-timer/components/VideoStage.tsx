"use client";

import { useEffect, useRef } from "react";

// Looping background video (muted, inline) with a darkening scrim on the
// left and bottom so overlaid text stays readable. Shows the poster frame
// while loading or if the video can't play. Fills its positioned parent.

export function VideoStage({
  src,
  poster,
  dim = false,
  children,
}: {
  src: string;
  poster: string;
  dim?: boolean; // extra darkening, for screens built around logos
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // React doesn't reliably set the `muted` attribute, which browsers require
  // for autoplay — so mute and start it explicitly, and again on tab return.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const play = () => {
      v.muted = true;
      v.play().catch(() => {});
    };
    play();
    const onVisible = () => document.visibilityState === "visible" && play();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#01040a] text-white">
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover object-center"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />
      {/* flat dim + dark pool behind centred content */}
      {dim && (
        <>
          <div className="absolute inset-0 bg-black/35" />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 55% 60% at 50% 45%, rgb(1 3 9 / 0.7), rgb(1 3 9 / 0.3) 70%, transparent 100%)" }}
          />
        </>
      )}
      {/* darken toward the text (bottom) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="relative h-full">{children}</div>
    </div>
  );
}
