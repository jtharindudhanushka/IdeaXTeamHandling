"use client";

import { useEffect, useRef, useState } from "react";

// Looping background video (muted, inline) with a darkening scrim on the
// left and bottom so overlaid text stays readable. Shows the poster frame
// while loading or if the video can't play. Fills its positioned parent.

export function VideoStage({
  src,
  poster,
  dim = false,
  glitch = false,
  children,
}: {
  src: string;
  poster: string;
  dim?: boolean; // extra darkening, for screens built around logos
  glitch?: boolean; // brief subtle glitch on the video every 2-3 s
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

  // Randomly re-trigger the glitch class every 2-3 s
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    if (!glitch) return;
    let wait: ReturnType<typeof setTimeout>;
    let stop: ReturnType<typeof setTimeout>;
    const schedule = () => {
      wait = setTimeout(() => {
        setGlitching(true);
        stop = setTimeout(() => {
          setGlitching(false);
          schedule();
        }, 280);
      }, 2000 + Math.random() * 1000);
    };
    schedule();
    return () => {
      clearTimeout(wait);
      clearTimeout(stop);
    };
  }, [glitch]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#01040a] text-white">
      <video
        ref={ref}
        className={`absolute inset-0 h-full w-full object-cover object-center ${glitching ? "video-glitch" : ""}`}
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
          <div className="absolute inset-0 bg-black/15" />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 55% 60% at 50% 45%, rgb(1 3 9 / 0.5), rgb(1 3 9 / 0.15) 70%, transparent 100%)" }}
          />
        </>
      )}
      {/* darken toward the text (bottom) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="relative h-full">{children}</div>
    </div>
  );
}
