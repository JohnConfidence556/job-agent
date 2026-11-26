"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/providers";
import { Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
