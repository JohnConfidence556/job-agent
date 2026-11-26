"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers";
import { Button, PageHeader } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const { session } = useAuth();
  const router = useRouter();
  const client = useQueryClient();

  async function signOut() {
    await supabase.auth.signOut();
    client.clear();
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="Account" />
      <div className="max-w-md space-y-6">
        <div>
          <p className="text-sm font-medium text-mute">Signed in as</p>
          <p className="mt-0.5 text-lg">{session?.user.email}</p>
        </div>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </>
  );
}
