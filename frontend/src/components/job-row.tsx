"use client";

import { Clock, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { FitTape } from "@/components/fit-tape";
import { StatusChip } from "@/components/ui";
import { SOURCE_NAMES, timeAgo } from "@/lib/format";
import type { MatchRow } from "@/lib/types";

export function JobRow({ match }: { match: MatchRow }) {
  const job = match.jobs;
  const where = job.location_text || (job.remote ? "Remote" : null);

  return (
    <Link
      href={`/jobs/${match.id}`}
      className="group grid gap-x-6 gap-y-3 border-b border-line px-1 py-5 transition hover:bg-sheet md:grid-cols-[116px_1fr_auto] md:px-3"
    >
      <FitTape score={match.fit_score} />
      <div className="min-w-0">
        <h3 className="font-display text-[19px] font-semibold leading-snug group-hover:underline group-hover:decoration-tape group-hover:decoration-[3px] group-hover:underline-offset-4">
          {job.title}
        </h3>
        <p className="text-ink-2">{job.company}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mute">
          {where && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {where}
            </span>
          )}
          {job.salary_text && (
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" aria-hidden />
              {job.salary_text}
            </span>
          )}
          {job.posted_at && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              {timeAgo(job.posted_at)}
            </span>
          )}
          <span>via {SOURCE_NAMES[job.source] ?? job.source}</span>
        </div>
        {match.fit_analysis.summary && (
          <p className="mt-2 line-clamp-2 max-w-[68ch] text-[15px] text-ink-2">{match.fit_analysis.summary}</p>
        )}
      </div>
      <div className="md:text-right">
        <StatusChip status={match.status} />
      </div>
    </Link>
  );
}
