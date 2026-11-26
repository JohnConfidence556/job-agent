"use client";

import Link from "next/link";
import { useState } from "react";
import { FitTape } from "@/components/fit-tape";
import { EmptyState, ErrorNote, LinkButton, PageHeader, Select, Spinner } from "@/components/ui";
import { useToast } from "@/components/providers";
import { STATUS_LABELS, formatDate } from "@/lib/format";
import { useJobs, useMoveJob } from "@/lib/hooks";
import type { MatchRow, MatchStatus } from "@/lib/types";

const COLUMNS: MatchStatus[] = ["new", "reviewed", "applied", "interviewing", "closed"];

function TrackerCard({ match }: { match: MatchRow }) {
  const move = useMoveJob();
  const { toast } = useToast();
  return (
    <li className="rounded-[10px] border border-line bg-sheet p-3.5">
      <Link href={`/jobs/${match.id}`} className="block">
        <p className="font-display text-[16px] font-semibold leading-snug hover:underline hover:decoration-tape hover:decoration-[3px] hover:underline-offset-4">
          {match.jobs.title}
        </p>
        <p className="mt-0.5 text-sm text-ink-2">{match.jobs.company}</p>
      </Link>
      <div className="mt-3">
        <FitTape score={match.fit_score} />
      </div>
      {match.applied_at && <p className="mt-2 text-[13px] text-mute">Applied {formatDate(match.applied_at)}</p>}
      <Select
        aria-label={`Move ${match.jobs.title} to`}
        value={match.status}
        onChange={(event) =>
          move.mutate(
            { id: match.id, status: event.target.value as MatchStatus },
            { onSuccess: () => toast(`Moved to ${STATUS_LABELS[event.target.value]}`), onError: (e) => toast(e.message, "error") },
          )
        }
        className="mt-3 !py-1.5 text-sm"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </li>
  );
}

export default function TrackerPage() {
  const jobs = useJobs({ limit: 100 });
  const [showDismissed, setShowDismissed] = useState(false);
  const dismissed = useJobs({ status: "dismissed", limit: 100 });

  const byStatus = (status: MatchStatus) => (jobs.data ?? []).filter((match) => match.status === status);

  return (
    <>
      <PageHeader title="Tracker">Every job you are working on, by stage. You move a job when you apply, not the agent.</PageHeader>

      {jobs.isLoading && <Spinner label="Loading your tracker" />}
      {jobs.isError && <ErrorNote message={jobs.error.message} onRetry={() => jobs.refetch()} />}
      {jobs.data && jobs.data.length === 0 && (
        <EmptyState title="Nothing to track yet" action={<LinkButton href="/jobs">Browse jobs</LinkButton>}>
          Jobs the agent finds appear here. When you apply, mark the job as applied and it moves along.
        </EmptyState>
      )}

      {jobs.data && jobs.data.length > 0 && (
        <div className="-mx-5 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0">
          <div className="grid min-w-[1080px] grid-cols-5 gap-4">
            {COLUMNS.map((status) => {
              const items = byStatus(status);
              return (
                <section key={status} aria-label={STATUS_LABELS[status]}>
                  <h2 className="mb-3 flex items-baseline justify-between border-b-[3px] border-ink pb-2 text-[17px] font-bold">
                    {STATUS_LABELS[status]}
                    <span className="text-sm font-medium tabular-nums text-mute">{items.length}</span>
                  </h2>
                  <ul className="space-y-3">
                    {items.map((match) => (
                      <TrackerCard key={match.id} match={match} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10">
        <button onClick={() => setShowDismissed(!showDismissed)} className="text-sm font-semibold underline underline-offset-2">
          {showDismissed ? "Hide dismissed jobs" : "Show dismissed jobs"}
        </button>
        {showDismissed && (
          <ul className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
            {(dismissed.data ?? []).length === 0 && <li className="text-sm text-mute">No dismissed jobs.</li>}
            {(dismissed.data ?? []).map((match) => (
              <TrackerCard key={match.id} match={match} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
