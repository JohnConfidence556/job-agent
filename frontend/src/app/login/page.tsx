"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { BRAND } from "@/config/brand";
import { supabase, supabaseConfigured } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/home");
  }, [loading, session, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    setNotice(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setProblem(error.message);
      else router.replace("/home");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setProblem(error.message);
      else if (data.session) router.replace("/onboarding");
      else setNotice("Check your email and confirm your address, then sign in.");
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1.05fr_1fr]">
      <div className="on-ink relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white md:flex">
        <Wordmark />
        <div>
          <h1 className="max-w-[14ch] text-[56px] font-bold leading-[1.02]">{BRAND.tagline.split(". ")[0]}.</h1>
          <p className="mt-5 max-w-[38ch] text-lg text-white/75">
            Every day at the time you choose, the agent searches job boards, scores each job against your CV, and
            saves the best ones for you. You decide what to apply for.
          </p>
        </div>
        <div className="tape" style={{ "--score": 82, "--tape-h": "22px" } as React.CSSProperties} aria-hidden>
          <span className="tape-marker !bg-white" />
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 md:hidden">
            <Wordmark className="text-ink" />
          </div>
          <h2 className="text-[30px] font-bold">{mode === "signin" ? "Sign in" : "Create your account"}</h2>
          <p className="mt-2 text-ink-2">
            {mode === "signin" ? "Welcome back." : "Free to start. You can skip setup and finish it later."}
          </p>

          {!supabaseConfigured && (
            <div className="mt-6">
              <ErrorNote message="Supabase keys are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." />
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
              <Input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {problem && <ErrorNote message={problem} />}
            {notice && (
              <p role="status" className="rounded-[10px] bg-tape/30 px-4 py-3 text-sm">
                {notice}
              </p>
            )}
            <Button type="submit" className="w-full" loading={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-2">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setProblem(null);
                setNotice(null);
              }}
              className="font-semibold text-ink underline underline-offset-2"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
