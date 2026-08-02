import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_SIGNUPS_PER_IP_PER_HOUR = 3;

function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.SIGNUP_RATE_LIMIT_SALT)
    .digest("hex");
}

// Returns true if the signup may proceed, recording the attempt as a side effect.
export async function checkSignupRateLimit(ip: string, email: string): Promise<boolean> {
  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("signup_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_SIGNUPS_PER_IP_PER_HOUR) return false;

  await supabaseAdmin.from("signup_attempts").insert({ ip_hash: ipHash, email });
  return true;
}
