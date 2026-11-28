import { AuthButton } from "@/components/auth-button";
import { Brand } from "@/components/brand";
import { Suspense } from "react";

// The header (the user's e-mail and Sign out) is shared by every page under
// /workspace. A layout is not re-run on every navigation, so it is NOT where
// access is checked: each page calls requireUser() itself.
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Narrow screens: the page grows and scrolls as a whole. From md up: exactly
    // the screen height, so the notes columns can scroll on their own.
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        <Brand href="/workspace" className="shrink-0" />
        <Suspense fallback={<span className="text-sm text-muted-foreground">Loading…</span>}>
          <AuthButton />
        </Suspense>
      </header>
      {/* Not <main>: the notes page has its own <main> for the editor area. */}
      <div className="flex flex-1 flex-col md:min-h-0">{children}</div>
    </div>
  );
}
