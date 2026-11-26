"use client";

import clsx from "clsx";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { buttonClass } from "@/components/ui";

/* ---------- shared bits ---------- */

function useCtaTarget() {
  const { session } = useAuth();
  return session
    ? { href: "/home", label: "Open your dashboard" }
    : { href: "/login?mode=signup", label: "Get started" };
}

export function LandingHeader() {
  const { session } = useAuth();
  const cta = useCtaTarget();
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <Link href="/" aria-label="Home">
        <Wordmark className="text-ink" />
      </Link>
      <nav aria-label="Account" className="flex items-center gap-1 sm:gap-3">
        {!session && (
          <Link href="/login" className={buttonClass("quiet")}>
            Log in
          </Link>
        )}
        <Link href={cta.href} className={buttonClass("primary")}>
          {cta.label}
        </Link>
      </nav>
    </header>
  );
}

export function HeroCta() {
  const cta = useCtaTarget();
  return (
    <div className="mt-9 flex flex-wrap items-center gap-3">
      <Link href={cta.href} className={buttonClass("primary", "min-h-12 px-6 text-base")}>
        {cta.label}
      </Link>
      <a href="#how" className={buttonClass("secondary", "min-h-12 px-6 text-base")}>
        See how it works
      </a>
    </div>
  );
}

export function FinalCta() {
  const cta = useCtaTarget();
  return (
    <Link
      href={cta.href}
      className="inline-flex min-h-12 items-center justify-center rounded-[9px] bg-tape px-7 text-base font-semibold text-ink shadow-[0_2px_0_0_#fff] transition hover:bg-[#ffd244] active:translate-y-px active:shadow-none"
    >
      {cta.label}
    </Link>
  );
}

/* ---------- hero demo ---------- */

const BEFORE = "Built a model to predict customer churn for a telecom client.";

export function HeroDemo() {
  const [tailored, setTailored] = useState(false);
  const touched = useRef(false);

  // One orchestrated moment: the tape grows, then the line is rewritten once.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!touched.current) setTailored(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  function choose(next: boolean) {
    touched.current = true;
    setTailored(next);
  }

  return (
    <figure className="relative" aria-label="Example of a scored job and a tailored CV line">
      <div className="rounded-[14px] border border-line bg-sheet p-6 shadow-[0_18px_40px_-24px_rgb(23_34_77/0.45)] sm:p-7">
        <p className="text-sm text-mute">Sample match</p>
        <h3 className="mt-1 text-[22px] font-bold">Machine Learning Engineer</h3>
        <p className="text-[15px] text-ink-2">Example Co, remote in Africa</p>

        <div className="mt-6 flex items-end gap-5">
          <div className="font-display text-[64px] font-bold leading-none tabular-nums">86</div>
          <div className="mb-1 flex-1">
            <p className="mb-2 font-display text-base font-semibold">Strong fit</p>
            <FitBar />
          </div>
        </div>

        <ul className="mt-6 space-y-1.5 text-[15px]">
          <li className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-stitch" aria-hidden />
            <span>Your CV shows Python, scikit-learn and 3 years of production ML</span>
          </li>
          <li className="flex gap-2">
            <X className="mt-0.5 size-4 shrink-0 text-chalk" aria-hidden />
            <span>Kubernetes is asked for and isn&apos;t in your CV</span>
          </li>
        </ul>

        <div className="mt-7 border-t border-line pt-5">
          <div role="group" aria-label="CV line version" className="inline-flex rounded-[9px] bg-paper p-1 text-sm font-medium">
            {[
              { label: "From your CV", value: false },
              { label: "Tailored for this job", value: true },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                aria-pressed={tailored === opt.value}
                onClick={() => choose(opt.value)}
                className={clsx(
                  "rounded-[7px] px-3 py-1.5 transition",
                  tailored === opt.value ? "bg-sheet shadow-sm" : "text-mute hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="mt-4 min-h-[76px] text-[17px] leading-relaxed" aria-live="polite">
            {tailored ? (
              <>
                Built a{" "}
                <span className="chalk">churn prediction model for a telecom client, using the Python and scikit-learn stack this role asks for.</span>
              </>
            ) : (
              BEFORE
            )}
          </p>
          <p className="text-sm text-mute">
            {tailored ? "Python and scikit-learn were already in your CV. Nothing was added." : "Your original wording."}
          </p>
        </div>
      </div>
    </figure>
  );
}

function FitBar() {
  const [grown, setGrown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(86));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="tape" style={{ "--score": grown, "--tape-h": "16px" } as React.CSSProperties} aria-hidden>
      <span className="tape-marker" />
    </div>
  );
}

/* ---------- fact-check ledger ---------- */

const CHECKS = [
  {
    rewrite: "Cut report turnaround from 3 days to 1.",
    verdict: "3 and 1 are in your CV",
    outcome: "Rewrite kept",
    ok: true,
  },
  {
    rewrite: "Led a team of 12 engineers.",
    verdict: "12 is not in your CV",
    outcome: "Your original line used instead",
    ok: false,
  },
  {
    rewrite: "Deployed the service with Docker.",
    verdict: "Docker is in your CV",
    outcome: "Rewrite kept",
    ok: true,
  },
];

export function CheckLedger() {
  return (
    <div className="rounded-[14px] bg-sheet p-5 text-ink shadow-[0_18px_40px_-24px_rgb(0_0_0/0.6)] sm:p-6">
      <p className="text-sm font-medium text-mute">Example: three rewrites, checked</p>
      <ul className="mt-3 divide-y divide-line">
        {CHECKS.map((c) => (
          <li key={c.rewrite} className="flex gap-3 py-4">
            <span
              className={clsx(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                c.ok ? "bg-stitch/15 text-stitch" : "bg-chalk/15 text-chalk",
              )}
            >
              {c.ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
            </span>
            <div>
              <p className="text-[16px] font-medium leading-snug">&ldquo;{c.rewrite}&rdquo;</p>
              <p className="mt-1 text-sm text-ink-2">{c.verdict}</p>
              <p className={clsx("mt-0.5 text-sm font-semibold", c.ok ? "text-stitch" : "text-chalk")}>{c.outcome}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
