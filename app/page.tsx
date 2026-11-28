import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

// Landing page: signed-in users go to their notes, everyone else to sign-in.
// The check runs on the server: getClaims() verifies the session token's
// signature, so a forged or expired cookie counts as signed out.
async function SendOnward(): Promise<never> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  redirect(!error && data?.claims ? "/workspace" : "/auth/login");
}

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-sm text-muted-foreground">
      {/* Cookies are request-time data, so they are read inside <Suspense>. */}
      <Suspense fallback={<p>Loading…</p>}>
        <SendOnward />
      </Suspense>
    </main>
  );
}
