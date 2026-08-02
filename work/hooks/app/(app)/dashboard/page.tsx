import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: usage }, { data: generations }] = await Promise.all([
    supabase.from("usage_counters").select("count, cap, scope").eq("user_id", user.id).single(),
    supabase
      .from("generations")
      .select("id, created_at, status, brief_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Historique</h1>

      {usage && (
        <div className="rounded-lg border border-border-soft bg-surface p-5 mb-8">
          <p className="text-xs font-mono text-ink-muted uppercase mb-1">Usage</p>
          <p className="text-lg font-semibold">
            {usage.count} / {usage.cap} générations{" "}
            <span className="text-sm font-normal text-ink-muted">
              ({usage.scope === "lifetime" ? "à vie" : "cette période"})
            </span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        {generations?.length ? (
          generations.map((g) => (
            <Link
              key={g.id}
              href={`/generations/${g.id}`}
              className="flex items-center justify-between rounded-lg border border-border-soft px-4 py-3 text-sm hover:border-accent transition-colors"
            >
              <span>{new Date(g.created_at).toLocaleString("fr-FR")}</span>
              <span
                className={g.status === "completed" ? "text-good" : "text-critical"}
              >
                {g.status === "completed" ? "Terminée" : "Échouée"}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-ink-muted">Aucune génération pour le moment.</p>
        )}
      </div>
    </div>
  );
}
