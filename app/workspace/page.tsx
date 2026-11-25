import { requireUser } from "@/lib/supabase/require-user";
import { Suspense } from "react";

async function WorkspaceContent() {
  // Verified on the server before anything below is rendered.
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Your workspace</h1>
      <p className="text-muted-foreground">
        You&apos;re signed in as {user.email}.
      </p>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground">Loading your workspace…</p>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
