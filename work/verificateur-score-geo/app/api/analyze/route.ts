import { NextResponse } from "next/server";
import { analyzeGeoScore, assertHostnameIsPublic, validateUrl } from "@/lib/geo-score";
import { checkAgentReadiness } from "@/lib/agent-readiness";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { url: rawUrl, skipAgentReadiness } = (body as { url?: unknown; skipAgentReadiness?: unknown } | null) ?? {};
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return NextResponse.json({ error: "Merci de fournir une URL." }, { status: 400 });
  }

  try {
    const url = validateUrl(rawUrl.trim());
    await assertHostnameIsPublic(url.hostname);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const [result, agentReadiness] = await Promise.all([
      analyzeGeoScore(url, apiKey),
      // Propriété du site, pas de la page : sautée lors d'un audit de site
      // entier (déjà calculée une fois par /api/discover) pour ne pas
      // refaire les mêmes requêtes robots.txt/llms.txt/sitemap 20 fois.
      skipAgentReadiness === true ? Promise.resolve(null) : checkAgentReadiness(url.origin, url.hostname, apiKey),
    ]);

    return NextResponse.json({ ...result, agentReadiness });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur inattendue est survenue.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
