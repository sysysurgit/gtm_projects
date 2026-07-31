import { NextResponse } from "next/server";
import { assertHostnameIsPublic, validateUrl } from "@/lib/geo-score";
import { discoverSitePages } from "@/lib/site-crawl";
import { checkAgentReadiness } from "@/lib/agent-readiness";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const rawUrl = (body as { url?: unknown } | null)?.url;
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return NextResponse.json({ error: "Merci de fournir une URL." }, { status: 400 });
  }

  try {
    const url = validateUrl(rawUrl.trim());
    await assertHostnameIsPublic(url.hostname);

    const [result, agentReadiness] = await Promise.all([
      discoverSitePages(url),
      checkAgentReadiness(url.origin, url.hostname, process.env.GEMINI_API_KEY),
    ]);

    return NextResponse.json({ ...result, agentReadiness });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur inattendue est survenue.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
