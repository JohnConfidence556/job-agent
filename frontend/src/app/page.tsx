import type { Metadata } from "next";
import { Wordmark } from "@/components/app-shell";
import { CheckLedger, FinalCta, HeroCta, HeroDemo, LandingHeader } from "@/components/landing";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name}: jobs that fit you, a CV that fits the job` },
  description:
    "Your job search on a daily schedule. New remote and international roles scored against your CV, and a tailored CV for each one you pick. You apply yourself.",
};

const STEPS = [
  {
    title: "Tell it what you want",
    body: "Add the roles, regions and job types you are after, and upload your CV once.",
  },
  {
    title: "It searches every day",
    body: "At the time you choose, in your timezone, it reads new listings and scores each one against your CV.",
  },
  {
    title: "Tailor when a job is worth it",
    body: "Open a match, click Tailor my CV, and review the result next to your original.",
  },
  {
    title: "Apply and keep track",
    body: "Apply through the job's own link, then mark it applied. Your tracker holds the rest.",
  },
];

const PRINCIPLES = [
  {
    title: "It runs on your clock",
    body: "Pick a daily time. Matches are waiting when you sit down, and you can pause the search whenever you like.",
  },
  {
    title: "Remote and international roles",
    body: "Today it reads Remotive, Himalayas and Remote OK, three remote-first job boards. Filter by region and job type.",
  },
  {
    title: "Tailoring happens when you ask",
    body: "You only get a rewritten CV for the jobs you care about, so skipped jobs cost you no time.",
  },
  {
    title: "You stay in charge",
    body: "It never applies for you. You apply on the employer's page, then mark the job applied, interviewing or dismissed.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-16">
          <div>
            <h1 className="text-[clamp(2.5rem,6.4vw,4.4rem)] font-extrabold">
              Jobs that fit you. A CV that fits the job.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-2">
              Every day, new remote and international roles are measured against your CV. Pick one, and your CV is
              rewritten for it, using only what is already true about you.
            </p>
            <HeroCta />
            <p className="mt-5 text-sm text-mute">You apply yourself. Nothing is sent to an employer without you.</p>
          </div>
          <HeroDemo />
        </section>

        <div className="tape" style={{ "--score": 100, "--tape-h": "14px" } as React.CSSProperties} aria-hidden />

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20 md:px-8 lg:py-28">
          <h2 className="max-w-[20ch] text-[clamp(2rem,4.5vw,3rem)] font-bold">How a day with it goes</h2>
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-tape font-display text-lg font-bold">
                    {i + 1}
                  </span>
                  <span className="stitching hidden flex-1 lg:block" aria-hidden />
                </div>
                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 max-w-[34ch] text-[16px] leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Trust */}
        <section className="on-ink bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:py-28">
            <div>
              <h2 className="text-[clamp(2rem,4.5vw,3rem)] font-bold">
                It can reword your CV. It cannot invent your experience.
              </h2>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-white/80">
                Every rewritten line is checked against your CV before you see it. If a rewrite brings in a number or a
                tool that your CV does not contain, the rewrite is thrown out and your original line stays.
              </p>
              <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-white/65">
                The check cannot judge tone, so read the result before you send it. It is your CV and your name on it.
              </p>
            </div>
            <CheckLedger />
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <h2 className="max-w-[16ch] text-[clamp(2rem,4.5vw,3rem)] font-bold">Built around how people actually search</h2>
            <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="border-t-2 border-ink pt-4">
                  <dt className="font-display text-xl font-bold">{p.title}</dt>
                  <dd className="mt-2 text-[16px] leading-relaxed text-ink-2">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final call */}
        <section className="on-ink bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-24">
            <h2 className="max-w-[18ch] text-[clamp(2rem,4.8vw,3.4rem)] font-bold">
              Set your search once. Matches arrive daily.
            </h2>
            <p className="mt-5 max-w-[48ch] text-lg text-white/80">
              Voice practice for each interview is in development. Searching and tailoring work today.
            </p>
            <div className="mt-9">
              <FinalCta />
            </div>
          </div>
          <div className="tape opacity-90" style={{ "--score": 100, "--tape-h": "10px" } as React.CSSProperties} aria-hidden />
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-mute md:flex-row md:items-center md:justify-between md:px-8">
        <Wordmark className="text-xl text-ink" />
        <p className="max-w-[60ch]">
          Job listings come from{" "}
          <a className="underline underline-offset-2" href="https://remotive.com" target="_blank" rel="noopener noreferrer">
            Remotive
          </a>
          ,{" "}
          <a className="underline underline-offset-2" href="https://himalayas.app" target="_blank" rel="noopener noreferrer">
            Himalayas
          </a>{" "}
          and{" "}
          <a className="underline underline-offset-2" href="https://remoteok.com" target="_blank" rel="noopener noreferrer">
            Remote OK
          </a>
          . Every job links back to its original listing.
        </p>
      </footer>
    </div>
  );
}
