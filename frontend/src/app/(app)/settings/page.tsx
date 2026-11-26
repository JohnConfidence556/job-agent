"use client";

import clsx from "clsx";
import { useState } from "react";
import { useToast } from "@/components/providers";
import { TagInput } from "@/components/tag-input";
import { Button, ErrorNote, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { timezoneOptions } from "@/app/onboarding/page";
import { useProfile, useUpdateProfile } from "@/lib/hooks";
import type { JobType, Profile } from "@/lib/types";

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "international", label: "International" },
  { value: "local", label: "Local" },
];
const LEVELS = ["Entry level", "Mid level", "Senior", "Lead or manager"];
const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

export default function SettingsPage() {
  const profile = useProfile();

  if (profile.isLoading) return <Spinner label="Loading your settings" />;
  if (profile.isError || !profile.data) {
    return <ErrorNote message={profile.error?.message ?? "Could not load your settings."} onRetry={() => profile.refetch()} />;
  }
  return <SettingsForm profile={profile.data} />;
}

function SettingsForm({ profile }: { profile: Profile }) {
  const save = useUpdateProfile();
  const { toast } = useToast();

  const [roles, setRoles] = useState<string[]>(profile.target_roles);
  const [types, setTypes] = useState<JobType[]>(profile.job_types);
  const [places, setPlaces] = useState<string[]>(profile.locations);
  const [level, setLevel] = useState(profile.experience_level ?? "");
  const [salary, setSalary] = useState(profile.salary_min ? String(profile.salary_min) : "");
  const [currency, setCurrency] = useState(profile.salary_currency);
  const [runTime, setRunTime] = useState(profile.run_time.slice(0, 5));
  const [timezone, setTimezone] = useState(profile.timezone);
  const [paused, setPaused] = useState(profile.search_paused);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate(
      {
        target_roles: roles,
        job_types: types,
        locations: places,
        experience_level: level || null,
        salary_min: salary ? Number(salary) : null,
        salary_currency: currency,
        run_time: runTime,
        timezone,
        search_paused: paused,
      },
      {
        onSuccess: () => toast("Settings saved"),
        onError: (error) => toast(error.message, "error"),
      },
    );
  }

  const zones = timezoneOptions();
  if (!zones.includes(timezone)) zones.unshift(timezone);

  return (
    <>
      <PageHeader title="Search settings">Tell the agent what to look for and when to search.</PageHeader>

      <form onSubmit={submit} className="max-w-2xl space-y-10">
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">What to look for</h2>
          <Field label="Roles you want" hint="Press Enter after each role. Add up to 10.">
            <TagInput label="Roles you want" value={roles} onChange={setRoles} placeholder="For example: Machine Learning Engineer" />
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Where</legend>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((option) => {
                const on = types.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTypes(on ? types.filter((t) => t !== option.value) : [...types, option.value])}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      on ? "border-ink bg-ink text-white" : "border-line bg-sheet hover:border-ink-2/50",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-mute">
              The job boards we search today list remote and international roles. Local Nigerian roles will not appear
              until we add Nigerian job boards.
            </p>
          </fieldset>

          {types.includes("local") && (
            <Field label="Cities for local jobs">
              <TagInput label="Cities for local jobs" value={places} onChange={setPlaces} placeholder="For example: Lagos" />
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Experience level">
              <Select value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">Not set</option>
                {LEVELS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Field label="Minimum yearly salary">
              <div className="flex gap-2">
                <Select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="!w-24">
                  {CURRENCIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
                <Input type="number" min={0} inputMode="numeric" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="Optional" />
              </div>
            </Field>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">When to search</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Daily search time">
              <input
                type="time"
                value={runTime}
                onChange={(event) => setRunTime(event.target.value)}
                className="w-full rounded-[8px] border border-line bg-sheet px-3 py-2.5 text-[15px] focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-adire/40"
              />
            </Field>
            <Field label="Time zone">
              <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {zones.map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={paused} onChange={(event) => setPaused(event.target.checked)} className="mt-1 size-4 accent-ink" />
            <span>
              <span className="block font-medium">Pause the daily search</span>
              <span className="block text-sm text-mute">You can still search by hand from the home page.</span>
            </span>
          </label>
        </section>

        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </form>
    </>
  );
}
