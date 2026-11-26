"use client";

import clsx from "clsx";
import { useState } from "react";
import { JobRow } from "@/components/job-row";
import { EmptyState, ErrorNote, LinkButton, PageHeader, Select, Spinner } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/format";
import { useJobs } from "@/lib/hooks";
import type { MatchStatus } from "@/lib/types";

const FIT_OPTIONS = [
  { label: "All fits", value: 0 },
  { label: "50 and up", value: 50 },
  { label: "70 and up", value: 70 },
];

export default function JobsPage() {
  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState<MatchStatus | "">("");
  const jobs = useJobs({ minScore, status: status || undefined });

  return (
    <>
      <PageHeader title="Jobs">Everything the agent found for you, best fit first.</PageHeader>

      <div className="mb-2 flex flex-wrap items-center gap-4">
        <div role="radiogroup" aria-label="Minimum fit" className="inline-flex overflow-hidden rounded-[9px] border border-ink/80">
          {FIT_OPTIONS.map((option) => (
            <button
              key={option.value}
              role="radio"
              aria-checked={minScore === option.value}
              onClick={() => setMinScore(option.value)}
              className={clsx(
                "px-4 py-2 text-sm font-medium transition",
                minScore === option.value ? "bg-ink text-white" : "bg-sheet hover:bg-paper",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as MatchStatus | "")}
          className="!w-auto"
        >
          <option value="">All except dismissed</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {jobs.data && <span className="text-sm text-mute">{jobs.data.length} {jobs.data.length === 1 ? "job" : "jobs"}</span>}
      </div>

      {jobs.isLoading && <div className="py-10"><Spinner label="Loading jobs" /></div>}
      {jobs.isError && <ErrorNote message={jobs.error.message} onRetry={() => jobs.refetch()} />}
      {jobs.data && jobs.data.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No jobs match this filter"
            action={<LinkButton href="/home">Back to home</LinkButton>}
          >
            Try a lower fit, or run a search from the home page.
          </EmptyState>
        </div>
      )}
      {jobs.data && jobs.data.length > 0 && (
        <div className="border-t border-line">
          {jobs.data.map((match) => (
            <JobRow key={match.id} match={match} />
          ))}
        </div>
      )}
    </>
  );
}
