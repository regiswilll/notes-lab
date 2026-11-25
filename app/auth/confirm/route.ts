import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Only same-site paths, so the link can't send users to another website.
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/workspace";
}

// Email links (sign-up confirmation, password reset) land here. Supabase sends
// either a `code` (its default email template, PKCE flow) or a `token_hash`
// (a custom template that links here directly). Both start a session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (code || (token_hash && type)) {
    const supabase = await createClient();

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type!, token_hash: token_hash! });

    if (!error) {
      redirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
