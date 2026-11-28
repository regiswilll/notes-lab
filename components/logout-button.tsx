"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // A full page load, not router.push(): with Cache Components, Next.js
    // keeps up to 3 visited pages hidden in the tab with their state, so an
    // in-app navigation would bring back the sign-in form still filled in,
    // and keep the signed-in workspace (with notes) in memory. A full load
    // throws all of that away.
    window.location.assign("/auth/login");
  };

  return <Button onClick={logout}>Sign out</Button>;
}
