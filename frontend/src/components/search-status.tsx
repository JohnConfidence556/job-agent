"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useToast } from "@/components/providers";
import { useHome, useLatestRun, useProfile, useStartSearch } from "@/lib/hooks";
import { clockTime, timeAgo } from "@/lib/format";

export function SearchStatus() {
  const run = useLatestRun();
  const profile = useProfile();
  const home = useHome();
  const start = useStartSearch();
  const { toast } = useToast();

  const data = run.data;
  const running = data?.status === "running";
  const hasCv = home.data?.has_cv ?? true;

  let line = "No search has run yet.";
  if (running) line = "Searching job boards and scoring matches.";
  else if (data?.status === "succeeded")
    line = `Last search ${timeAgo(data.finished_at ?? data.started_at)}: ${data.stats?.scored ?? 0} new jobs scored.`;
  else if (data?.status === "partial")
    line = `Last search ${timeAgo(data.finished_at ?? data.started_at)} stopped early because the AI service was busy. ${data.stats?.scored ?? 0} jobs scored.`;
  else if (data?.status === "failed") line = "Last search failed. Try again.";

  return (
    <section aria-label="Daily search" className="rounded-[var(--radius-panel)] bg-ink p-6 text-white">
      <h2 className="font-display text-xl font-semibold">Daily search</h2>
      <p className="mt-2 text-[15px] text-white/80">{line}</p>
      {running && <div className="stitching mt-4 !bg-[repeating-linear-gradient(90deg,#f4c430_0_10px,transparent_10px_18px)]" aria-hidden />}
      <p className="mt-3 text-sm text-white/60">
        {profile.data?.search_paused
          ? "Automatic search is paused."
          : profile.data
            ? `Runs automatically every day at ${clockTime(profile.data.run_time)}.`
            : ""}{" "}
        <Link href="/settings" className="underline underline-offset-2 hover:text-white">
          Change
        </Link>
      </p>
      <Button
        className="mt-5 w-full"
        loading={start.isPending || running}
        disabled={!hasCv}
        onClick={() =>
          start.mutate(undefined, {
            onError: (error) => toast(error.message, "error"),
          })
        }
      >
        {running ? "Searching" : "Search now"}
      </Button>
      {!hasCv && <p className="mt-2 text-sm text-white/70">Upload your CV first so the search knows what to look for.</p>}
    </section>
  );
}
