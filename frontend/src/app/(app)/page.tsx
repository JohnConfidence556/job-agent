"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { JobRow } from "@/components/job-row";
import { SearchStatus } from "@/components/search-status";
import { EmptyState, ErrorNote, LinkButton, Spinner } from "@/components/ui";
import { useHome, useJobs, useProfile } from "@/lib/hooks";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const PIPELINE = [
  { key: "new", label: "New" },
  { key: "reviewed", label: "Reviewed" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
] as const;

export default function HomePage() {
  const home = useHome();
  const profile = useProfile();
  const best = useJobs({ status: "new", minScore: 60, limit: 5 });

  const firstName = profile.data?.full_name?.split(" ")[0];
  const needsRoles = profile.data ? profile.data.target_roles.length === 0 : false;
  const needsCv = home.data ? !home.data.has_cv : false;

  return (
    <>
      <header className="mb-9">
        <h1 className="text-[36px] font-bold md:text-[44px]">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 text-ink-2">
          {home.data
            ? home.data.new_strong_matches > 0
              ? `${home.data.new_strong_matches} new ${home.data.new_strong_matches === 1 ? "job fits" : "jobs fit"} you well. Start with the best ones below.`
              : "No new strong matches right now. The next search will add more."
            : " "}
        </p>
      </header>

      {(needsCv || needsRoles) && (
        <section className="mb-9 rounded-[var(--radius-panel)] border border-ink/20 bg-sheet p-6">
          <h2 className="font-display text-xl font-semibold">Finish setting up</h2>
          <p className="mt-1 text-ink-2">The agent needs these to find jobs that fit you.</p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/cv" className="flex items-center gap-3 font-medium underline-offset-2 hover:underline">
                {needsCv ? <Circle className="size-5 text-mute" aria-hidden /> : <Check className="size-5 text-stitch" aria-hidden />}
                Upload your CV
              </Link>
            </li>
            <li>
              <Link href="/settings" className="flex items-center gap-3 font-medium underline-offset-2 hover:underline">
                {needsRoles ? <Circle className="size-5 text-mute" aria-hidden /> : <Check className="size-5 text-stitch" aria-hidden />}
                Choose the roles you want
              </Link>
            </li>
          </ul>
        </section>
      )}

      <div className="grid gap-9 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-9">
          {home.data && (
            <section aria-label="Your applications">
              <Link
                href="/tracker"
                className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-sheet transition hover:border-ink-2/50 sm:grid-cols-4"
              >
                {PIPELINE.map(({ key, label }, index) => (
                  <span
                    key={key}
                    className={
                      "border-line px-4 py-4 " +
                      (index % 2 === 1 ? "border-l " : "") +
                      (index >= 2 ? "border-t sm:border-t-0 " : "") +
                      (index > 0 ? "sm:border-l" : "")
                    }
                  >
                    <span className="block font-display text-[32px] font-bold leading-none tabular-nums">
                      {home.data.counts[key] ?? 0}
                    </span>
                    <span className="mt-1.5 block text-sm text-mute">{label}</span>
                  </span>
                ))}
              </Link>
            </section>
          )}

          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">Best new matches</h2>
              <Link href="/jobs" className="text-sm font-semibold underline underline-offset-2">
                See all jobs
              </Link>
            </div>
            {best.isLoading && <div className="py-8"><Spinner label="Loading your matches" /></div>}
            {best.isError && <ErrorNote message={best.error.message} onRetry={() => best.refetch()} />}
            {best.data && best.data.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  title="No strong matches yet"
                  action={
                    needsCv ? (
                      <LinkButton href="/cv" variant="primary">Upload your CV</LinkButton>
                    ) : (
                      <LinkButton href="/jobs" variant="secondary">Browse all jobs</LinkButton>
                    )
                  }
                >
                  {needsCv
                    ? "Upload your CV and the agent will start scoring jobs against it."
                    : "Run a search now, or wait for the daily search. Jobs that score 60 or higher show up here."}
                </EmptyState>
              </div>
            )}
            {best.data && best.data.length > 0 && (
              <div className="border-t border-line">
                {best.data.map((match) => (
                  <JobRow key={match.id} match={match} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          <SearchStatus />
          {home.data && (
            <p className="mt-4 px-1 text-sm text-mute">
              {home.data.tailorings_left} tailored {home.data.tailorings_left === 1 ? "CV" : "CVs"} left today.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
