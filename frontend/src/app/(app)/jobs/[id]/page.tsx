"use client";

import clsx from "clsx";
import { ArrowLeft, Check, ExternalLink, Minus, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CvSheet } from "@/components/cv-sheet";
import { FitTape } from "@/components/fit-tape";
import { useToast } from "@/components/providers";
import { Button, ErrorNote, Spinner, StatusChip } from "@/components/ui";
import { SOURCE_NAMES, formatDate } from "@/lib/format";
import { useHome, useJob, useMasterCv, useTailor, useUpdateJob } from "@/lib/hooks";
import type { MatchStatus } from "@/lib/types";

type Tab = "description" | "cv" | "interview";

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "Job description" },
  { id: "cv", label: "Tailored CV" },
  { id: "interview", label: "Interview" },
];

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const job = useJob(id);
  const update = useUpdateJob(id);
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("description");
  const markedReviewed = useRef(false);

  const match = job.data?.match;

  useEffect(() => {
    if (match?.status === "new" && !markedReviewed.current) {
      markedReviewed.current = true;
      update.mutate({ status: "reviewed" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status]);

  if (job.isLoading) return <div className="py-16"><Spinner label="Loading job" /></div>;
  if (job.isError || !match) {
    return (
      <div>
        <BackLink />
        <ErrorNote message={job.error?.message ?? "This job could not be found."} onRetry={() => job.refetch()} />
      </div>
    );
  }

  const posting = match.jobs;
  const source = SOURCE_NAMES[posting.source] ?? posting.source;
  const applied = match.status === "applied" || match.status === "interviewing";
  const dismissed = match.status === "dismissed";

  function setStatus(status: MatchStatus, message: string) {
    update.mutate({ status }, { onSuccess: () => toast(message), onError: (error) => toast(error.message, "error") });
  }

  return (
    <>
      <BackLink />
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <StatusChip status={match.status} />
          {posting.posted_at && <span className="text-sm text-mute">Posted {formatDate(posting.posted_at)}</span>}
        </div>
        <h1 className="max-w-[24ch] text-[34px] font-bold md:text-[44px]">{posting.title}</h1>
        <p className="mt-2 text-lg text-ink-2">
          {posting.company}
          {(posting.location_text || posting.remote) && (
            <span className="text-mute"> in {posting.location_text || "Remote"}</span>
          )}
        </p>
        {posting.salary_text && <p className="mt-1 text-ink-2">{posting.salary_text}</p>}
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Job sections" className="no-print mb-6 flex gap-0 overflow-x-auto border-b border-line sm:gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={clsx(
                  "-mb-px whitespace-nowrap border-b-[3px] px-3 py-2.5 text-[14.5px] font-medium transition sm:px-4 sm:text-[15px]",
                  tab === item.id ? "border-tape text-ink" : "border-transparent text-mute hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "description" && (
            <section>
              <div className="max-w-[70ch] whitespace-pre-wrap text-[15.5px] leading-[1.7]">{posting.description}</div>
              <p className="mt-8 border-t border-line pt-4 text-sm text-mute">
                Listing from {source}.{" "}
                <a href={posting.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-2">
                  View the original listing
                </a>
              </p>
            </section>
          )}

          {tab === "cv" && <TailoredCvPanel matchId={id} tailored={job.data?.tailored ?? null} />}

          {tab === "interview" && (
            <section className="max-w-[60ch]">
              <h2 className="text-2xl font-bold">Practice for this interview</h2>
              <p className="mt-3 text-ink-2">
                Voice interviews are not ready yet. Soon you will start a mock interview here based on this exact job,
                and get feedback on your answers afterwards.
              </p>
              <Button className="mt-5" disabled>
                Start interview
              </Button>
            </section>
          )}
        </div>

        <aside className="no-print order-first lg:sticky lg:top-8 lg:order-none lg:self-start">
          <FitTape score={match.fit_score} size="lg" animate />
          {match.fit_analysis.summary && <p className="mt-6 text-[15px]">{match.fit_analysis.summary}</p>}

          {(match.fit_analysis.strengths?.length ?? 0) > 0 && (
            <ul className="mt-5 space-y-2 text-[14.5px]">
              {match.fit_analysis.strengths!.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-stitch" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {(match.fit_analysis.gaps?.length ?? 0) > 0 && (
            <ul className="mt-3 space-y-2 text-[14.5px]">
              {match.fit_analysis.gaps!.map((item) => (
                <li key={item} className="flex gap-2.5 text-ink-2">
                  <Minus className="mt-0.5 size-4 shrink-0 text-chalk" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 space-y-3">
            <a
              href={posting.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-tape px-4 py-2 text-[15px] font-semibold text-ink shadow-[0_2px_0_0_var(--color-ink)] transition hover:bg-[#ffd244] active:translate-y-px active:shadow-none"
            >
              Apply on {source}
              <ExternalLink className="size-4" aria-hidden />
            </a>
            {applied ? (
              <div className="rounded-[9px] border border-stitch/40 bg-stitch/10 px-4 py-3 text-sm">
                <p className="font-semibold text-stitch">Applied {match.applied_at ? `on ${formatDate(match.applied_at)}` : ""}</p>
                <button
                  onClick={() => setStatus("reviewed", "Marked as not applied")}
                  className="mt-1 font-medium text-ink-2 underline underline-offset-2"
                >
                  Undo
                </button>
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setStatus("applied", "Marked as applied")} loading={update.isPending}>
                Mark as applied
              </Button>
            )}
            {match.status === "applied" && (
              <Button variant="quiet" className="w-full" onClick={() => setStatus("interviewing", "Moved to interviewing")}>
                I got an interview
              </Button>
            )}
            {dismissed ? (
              <Button variant="quiet" className="w-full" onClick={() => setStatus("reviewed", "Job restored")}>
                Restore this job
              </Button>
            ) : (
              !applied && (
                <Button variant="quiet" className="w-full" onClick={() => setStatus("dismissed", "Job dismissed")}>
                  Not interested
                </Button>
              )
            )}
          </div>

          <NotesBox matchId={id} initial={match.notes ?? ""} />
        </aside>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/jobs" className="no-print mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> All jobs
    </Link>
  );
}

function NotesBox({ matchId, initial }: { matchId: string; initial: string }) {
  const update = useUpdateJob(matchId);
  const { toast } = useToast();
  const [value, setValue] = useState(initial);
  const saved = useRef(initial);

  return (
    <div className="mt-8">
      <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
        Your notes
      </label>
      <textarea
        id="notes"
        rows={4}
        value={value}
        maxLength={5000}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value === saved.current) return;
          update.mutate(
            { notes: value },
            {
              onSuccess: () => {
                saved.current = value;
                toast("Notes saved");
              },
              onError: (error) => toast(error.message, "error"),
            },
          );
        }}
        placeholder="Contacts, deadlines, questions to ask"
        className="w-full rounded-[8px] border border-line bg-sheet px-3 py-2.5 text-[15px] placeholder:text-mute/70 focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-adire/40"
      />
    </div>
  );
}

function TailoredCvPanel({
  matchId,
  tailored,
}: {
  matchId: string;
  tailored: import("@/lib/types").TailoredCv | null;
}) {
  const tailor = useTailor(matchId);
  const home = useHome();
  const master = useMasterCv();
  const { toast } = useToast();
  const [highlight, setHighlight] = useState(true);
  const [compare, setCompare] = useState(false);

  const originals = useMemo(() => {
    const map = new Map<string, string>();
    const cv = master.data;
    if (!cv) return map;
    for (const job of cv.experience) for (const b of job.bullets) map.set(b.id, b.text);
    for (const project of cv.projects) for (const b of project.bullets) map.set(b.id, b.text);
    return map;
  }, [master.data]);

  function run(regenerate: boolean) {
    tailor.mutate(regenerate, {
      onSuccess: () => toast("Tailored CV ready"),
      onError: (error) => toast(error.message, "error"),
    });
  }

  if (tailor.isPending) {
    return (
      <section className="max-w-[56ch]">
        <h2 className="text-2xl font-bold">Tailoring your CV</h2>
        <div className="stitching my-5" aria-hidden />
        <p className="text-ink-2">Reading the job and matching it to your experience. This takes about 20 seconds.</p>
      </section>
    );
  }

  if (!tailored) {
    const left = home.data?.tailorings_left;
    return (
      <section className="max-w-[60ch]">
        <h2 className="text-2xl font-bold">Make a CV for this job</h2>
        <p className="mt-3 text-ink-2">
          We rewrite your master CV to match what this job asks for. Every line comes from your own CV. Nothing is added
          that you have not done, and you can compare each change with your original wording.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={() => run(false)} disabled={left === 0}>
            Tailor my CV
          </Button>
          {left !== undefined && (
            <span className="text-sm text-mute">
              {left === 0 ? "You have used all of today's tailored CVs." : `${left} left today`}
            </span>
          )}
        </div>
        {tailor.isError && <div className="mt-4"><ErrorNote message={tailor.error.message} /></div>}
      </section>
    );
  }

  const report = tailored.validation_report;
  return (
    <section>
      <div className="no-print mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={highlight} onChange={(event) => setHighlight(event.target.checked)} className="size-4 accent-ink" />
          Mark rewritten lines
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} className="size-4 accent-ink" />
          Show my original wording
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Print or save as PDF
          </Button>
          <Button variant="quiet" onClick={() => run(true)} disabled={(home.data?.tailorings_left ?? 1) === 0}>
            Tailor again
          </Button>
        </div>
      </div>

      <p className="no-print mb-6 max-w-[70ch] text-sm text-ink-2">
        {report.rewritten_bullets} {report.rewritten_bullets === 1 ? "line was" : "lines were"} reworded for this job.
        {report.fallbacks.length > 0 &&
          ` ${report.fallbacks.length} ${report.fallbacks.length === 1 ? "line was" : "lines were"} kept in your own words because the rewrite added something your CV does not say.`}{" "}
        Read it through before you apply.
      </p>

      <CvSheet content={tailored.content} highlight={highlight} compare={compare} originals={originals} />

      {tailored.content.gaps.length > 0 && (
        <div className="no-print mt-8 max-w-[70ch]">
          <h3 className="font-display text-lg font-semibold">What this job asks for that your CV does not show</h3>
          <ul className="mt-2 space-y-1.5 text-[15px] text-ink-2">
            {tailored.content.gaps.map((gap) => (
              <li key={gap} className="flex gap-2.5">
                <Minus className="mt-1 size-4 shrink-0 text-chalk" aria-hidden />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
