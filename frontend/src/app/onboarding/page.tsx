"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/app-shell";
import { CvUpload } from "@/components/cv-upload";
import { useAuth } from "@/components/providers";
import { TagInput } from "@/components/tag-input";
import { Button, Field, Select, Spinner } from "@/components/ui";
import { useUpdateProfile } from "@/lib/hooks";
import type { JobType } from "@/lib/types";

const JOB_TYPES: { value: JobType; label: string; note: string }[] = [
  { value: "remote", label: "Remote", note: "Work from anywhere you are allowed to." },
  { value: "international", label: "International", note: "Roles abroad, remote or relocating." },
  { value: "local", label: "Local", note: "On-site roles in the places you list." },
];

const LEVELS = ["Entry level", "Mid level", "Senior", "Lead or manager"];

export function timezoneOptions(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (supported) return supported("timeZone");
  } catch {}
  return ["Africa/Lagos", "Europe/London", "America/New_York", "Asia/Dubai"];
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
  } catch {
    return "Africa/Lagos";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const save = useUpdateProfile();
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<string[]>([]);
  const [types, setTypes] = useState<JobType[]>(["remote", "international"]);
  const [level, setLevel] = useState("");
  const [runTime, setRunTime] = useState("18:00");
  const [timezone, setTimezone] = useState(browserTimezone);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  function finish() {
    save.mutate(
      {
        target_roles: roles,
        job_types: types,
        experience_level: level || null,
        run_time: runTime,
        timezone,
      },
      { onSuccess: () => router.replace("/home") },
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[640px] px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark className="text-ink" />
        <Link href="/home" className="text-sm font-medium text-ink-2 underline underline-offset-2">
          Skip for now
        </Link>
      </div>

      <p className="mt-14 text-sm font-medium text-mute">Step {step} of 3</p>

      {step === 1 && (
        <section className="mt-2">
          <h1 className="text-[34px] font-bold">Start with your CV</h1>
          <p className="mt-3 max-w-prose text-ink-2">
            This becomes your master CV. We tailor copies of it for each job and never invent anything that is not in it.
          </p>
          <div className="mt-7">
            <CvUpload onDone={() => setStep(2)} />
          </div>
          <div className="mt-6">
            <Button variant="quiet" onClick={() => setStep(2)}>
              Add it later
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-2">
          <h1 className="text-[34px] font-bold">What are you looking for?</h1>
          <div className="mt-7 space-y-6">
            <Field label="Roles you want" hint="Type a role and press Enter. Add up to 10.">
              <TagInput label="Roles you want" value={roles} onChange={setRoles} placeholder="For example: Machine Learning Engineer" />
            </Field>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Where</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {JOB_TYPES.map((option) => {
                  const on = types.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTypes(on ? types.filter((t) => t !== option.value) : [...types, option.value])}
                      className={clsx(
                        "rounded-[10px] border p-3 text-left transition",
                        on ? "border-ink bg-ink text-white" : "border-line bg-sheet hover:border-ink-2/50",
                      )}
                    >
                      <span className="block font-semibold">{option.label}</span>
                      <span className={clsx("mt-0.5 block text-[13px]", on ? "text-white/75" : "text-mute")}>{option.note}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field label="Experience level">
              <Select value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">Not sure yet</option>
                {LEVELS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-8 flex gap-3">
            <Button onClick={() => setStep(3)}>Continue</Button>
            <Button variant="quiet" onClick={() => setStep(3)}>
              Skip this step
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-2">
          <h1 className="text-[34px] font-bold">When should the agent search?</h1>
          <p className="mt-3 max-w-prose text-ink-2">
            It searches once a day at this time, so your new matches are ready when you are. You can change it any time.
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="Time">
              <input
                type="time"
                value={runTime}
                onChange={(event) => setRunTime(event.target.value)}
                className="w-full rounded-[8px] border border-line bg-sheet px-3 py-2.5 text-[15px] focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-adire/40"
              />
            </Field>
            <Field label="Time zone">
              <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {timezoneOptions().map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-8 flex gap-3">
            <Button onClick={finish} loading={save.isPending}>
              Finish setup
            </Button>
            <Button variant="quiet" onClick={() => router.replace("/home")}>
              Skip for now
            </Button>
          </div>
          {save.isError && <p className="mt-3 text-sm text-chalk">{save.error.message}</p>}
        </section>
      )}
    </div>
  );
}
