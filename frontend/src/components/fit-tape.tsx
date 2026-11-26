"use client";

import { useEffect, useState } from "react";

export function fitWord(score: number | null): string {
  if (score === null) return "Not scored";
  if (score >= 80) return "Strong fit";
  if (score >= 60) return "Good fit";
  if (score >= 40) return "Stretch";
  return "Weak fit";
}

export function FitTape({
  score,
  size = "sm",
  animate = false,
}: {
  score: number | null;
  size?: "sm" | "lg";
  animate?: boolean;
}) {
  const target = score ?? 0;
  const [grown, setGrown] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const frame = requestAnimationFrame(() => setGrown(target));
    return () => cancelAnimationFrame(frame);
  }, [animate, target]);

  const shown = animate ? grown : target;

  if (score === null) {
    return <span className="text-sm text-mute">Not scored</span>;
  }

  if (size === "sm") {
    return (
      <div className="w-[116px]" aria-label={`Fit ${score} out of 100`}>
        <div className="font-display text-[28px] font-bold leading-none tabular-nums">{score}</div>
        <div
          className="tape mt-2"
          style={{ "--score": shown, "--tape-h": "9px" } as React.CSSProperties}
          aria-hidden
        >
          <span className="tape-marker" />
        </div>
      </div>
    );
  }

  return (
    <div aria-label={`Fit ${score} out of 100, ${fitWord(score)}`}>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[72px] font-bold leading-none tabular-nums">{score}</span>
        <span className="font-display text-lg font-semibold">{fitWord(score)}</span>
      </div>
      <div
        className="tape mt-5"
        style={{ "--score": shown, "--tape-h": "20px" } as React.CSSProperties}
        aria-hidden
      >
        <span className="tape-marker" />
      </div>
      <div className="relative mt-1.5 h-4 text-xs tabular-nums text-mute" aria-hidden>
        {[0, 25, 50, 75, 100].map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${tick}%` }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}
