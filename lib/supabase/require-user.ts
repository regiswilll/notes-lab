import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Checks on the server that the visitor is signed in, and sends them to the
 * sign-in page if not. Returns the verified token claims (id, email, ...).
 *
 * getClaims() verifies the access token's signature (locally against the
 * project's public keys, or via the Auth server for older projects), so a
 * forged or expired cookie is rejected. Never use getSession() for this on
 * the server: it trusts the cookie as-is.
 *
 * Call it at the top of every protected page, inside <Suspense> (it reads
 * cookies). proxy.ts also blocks signed-out visitors, but a page must not
 * rely on that alone.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}
