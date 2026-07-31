import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import type { Recommendation, ScoreCategory } from "./geo-score";
import { parseRobotsTxt } from "./site-crawl";

/**
 * Accessibilité aux agents IA — un score /100 distinct du score GEO de
 * contenu (structure, citations, etc.), car ce sont des propriétés
 * *du site*, pas d'une page précise : publier /llms.txt ou patcher
 * /robots.txt ne se refait pas par article de blog. Calculé une seule fois
 * par site (voir /api/discover), ou une fois pour l'origine de la page en
 * mode "Une page" — jamais recalculé par page lors d'un audit de site
 * entier (ce serait redondant : robots.txt/llms.txt sont identiques pour
 * toutes les pages d'un même site).
 *
 * Pondération : 6 vérifications de la checklist "agent-readiness" — llms.txt
 * et l'ouverture de robots.txt aux robots IA sont les deux leviers à plus
 * fort impact (un contenu excellent ne sert à rien si le robot qui doit le
 * lire est bloqué), d'où leur poids dominant.
 */
const WEIGHTS = {
  llmsTxt: 30,
  robotsAi: 18,
  contentSignal: 7,
  sitemap: 15,
  linkHeaders: 15,
  markdownAgents: 10,
  webmcp: 5,
} as const;

export interface AgentReadinessResult {
  hostname: string;
  score: number;
  checks: ScoreCategory[];
  llmsTxtDraft: string | null;
}

async function fetchSafe(url: string, init: RequestInit = {}, timeoutMs = 6000): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VerificateurScoreGEO/1.0)", ...init.headers },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkLlmsTxt(origin: string): Promise<{ found: boolean }> {
  const res = await fetchSafe(`${origin}/llms.txt`);
  if (!res || !res.ok) return { found: false };
  const text = await res.text();
  // Filtre les faux 200 (pages d'erreur/soft-404 génériques servies en HTML).
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html") && !/^#\s/m.test(text)) return { found: false };
  return { found: text.trim().length >= 30 };
}

const KNOWN_AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "anthropic-ai"];

function robotsBlocksEverything(text: string, userAgent: string): boolean {
  const re = new RegExp(`user-agent:\\s*${userAgent}\\s*\\n(?:[^\\n]*\\n)*?\\s*disallow:\\s*/\\s*(?:\\n|$)`, "i");
  return re.test(text);
}

async function checkRobots(
  origin: string,
): Promise<{ aiBotsAllowed: boolean; hasContentSignal: boolean; sitemapDeclarations: string[] }> {
  const res = await fetchSafe(`${origin}/robots.txt`);
  if (!res || !res.ok) {
    // Pas de robots.txt du tout = rien n'est explicitement bloqué, mais on ne
    // peut pas non plus le créditer d'une politique explicite favorable.
    return { aiBotsAllowed: true, hasContentSignal: false, sitemapDeclarations: [] };
  }
  const text = await res.text();
  const hasContentSignal = /content-signal\s*:/i.test(text);
  const globallyBlocked = robotsBlocksEverything(text, "\\*");
  const explicitlyBlockedBot = KNOWN_AI_BOTS.some((bot) => robotsBlocksEverything(text, bot));
  const { sitemaps } = parseRobotsTxt(text);
  return { aiBotsAllowed: !globallyBlocked && !explicitlyBlockedBot, hasContentSignal, sitemapDeclarations: sitemaps };
}

/**
 * Beaucoup de sites ne nomment pas leur sitemap "/sitemap.xml" (ex : Webflow
 * génère "/sitemap_index.xml") — la seule source fiable de son emplacement
 * réel est la ou les lignes "Sitemap:" de robots.txt. On ne retombe sur le
 * chemin par défaut "/sitemap.xml" que si robots.txt n'en déclare aucun.
 */
async function checkSitemap(origin: string, declaredSitemaps: string[]): Promise<{ found: boolean; url: string | null }> {
  const candidates = declaredSitemaps.length > 0 ? declaredSitemaps : [`${origin}/sitemap.xml`];
  for (const candidate of candidates) {
    const res = await fetchSafe(candidate);
    if (res && res.ok) return { found: true, url: candidate };
  }
  return { found: false, url: null };
}

async function generateLlmsTxtDraft(
  apiKey: string,
  hostname: string,
  pageTitle: string,
  metaDescription: string,
  bodyExcerpt: string,
): Promise<string | null> {
  if (!pageTitle && !metaDescription && !bodyExcerpt) return null;
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Rédige un brouillon de fichier llms.txt (format défini par https://llmstxt.org) pour le site "${hostname}", à partir des informations ci-dessous.

Respecte strictement ce format : un titre H1 avec le nom du produit/entreprise, un court blockquote (">") de résumé en une phrase, puis des sections en H2 avec des listes à puces (par exemple : ce qu'est le produit, fonctionnalités principales, tarification si mentionnée, à qui ça s'adresse, ressources officielles).

Règle impérative : n'invente aucun chiffre (pricing, financement, nombre de clients, certifications) que tu ne peux pas déduire du contenu fourni — si une information n'est pas disponible dans le contenu, omets simplement cette section plutôt que d'inventer une valeur. Réponds uniquement avec le contenu du fichier, sans commentaire ni bloc de code autour.

Titre de la page : ${pageTitle || "(absent)"}
Meta description : ${metaDescription || "(absente)"}
Extrait du contenu :
"""
${bodyExcerpt.slice(0, 6000)}
"""`,
      config: { maxOutputTokens: 2048 },
    });
    return response.text?.trim() || null;
  } catch (err) {
    console.error("generateLlmsTxtDraft failed:", err);
    return null;
  }
}

function buildCheck(
  key: string,
  label: string,
  score: number,
  max: number,
  details: string[],
  recommendations: Recommendation[],
): ScoreCategory {
  return { key, label, score, max, details, recommendations };
}

/**
 * Calcule l'accessibilité du site aux agents IA (llms.txt, robots.txt,
 * sitemap, Link headers, négociation Markdown, WebMCP), et — si /llms.txt
 * est absent et qu'une clé API est fournie — génère un brouillon à partir du
 * contenu de la page d'accueil.
 */
export async function checkAgentReadiness(origin: string, hostname: string, apiKey?: string): Promise<AgentReadinessResult> {
  // robots.txt est vérifié en premier car checkSitemap dépend de ses éventuelles
  // déclarations "Sitemap:" (voir checkSitemap).
  const robots = await checkRobots(origin);
  const [llms, sitemap, homepageRes, markdownRes] = await Promise.all([
    checkLlmsTxt(origin),
    checkSitemap(origin, robots.sitemapDeclarations),
    fetchSafe(origin),
    fetchSafe(origin, { headers: { Accept: "text/markdown" } }),
  ]);

  const homepageHtml = homepageRes && homepageRes.ok ? await homepageRes.text() : "";
  const linkHeader = homepageRes?.headers.get("link") ?? "";
  const hasLinkHeaders = /llms\.txt|sitemap/i.test(linkHeader);
  const hasWebMcp = /navigator\.modelContext|webmcp/i.test(homepageHtml);
  const markdownContentType = markdownRes?.headers.get("content-type") ?? "";
  const hasMarkdownNegotiation = markdownContentType.includes("text/markdown");

  const checks: ScoreCategory[] = [];

  checks.push(
    llms.found
      ? buildCheck("llms-txt", "llms.txt", WEIGHTS.llmsTxt, WEIGHTS.llmsTxt, [
          "Fichier /llms.txt détecté — les IA ont une fiche d'identité fiable à citer.",
        ], [])
      : buildCheck("llms-txt", "llms.txt", 0, WEIGHTS.llmsTxt, ["Aucun fichier /llms.txt détecté."], [
          {
            points: WEIGHTS.llmsTxt,
            action:
              "Publier un fichier /llms.txt qui décrit précisément le produit (positionnement, tarification, fonctionnalités, à qui ça s'adresse, ce qu'il ne faut pas confondre) — c'est la fiche que les IA citeront, ça stoppe les hallucinations.",
          },
        ]),
  );

  {
    const max = WEIGHTS.robotsAi + WEIGHTS.contentSignal;
    let score = 0;
    const details: string[] = [];
    const recommendations: Recommendation[] = [];
    if (robots.aiBotsAllowed) {
      score += WEIGHTS.robotsAi;
      details.push("robots.txt autorise les robots IA (GPTBot, ClaudeBot, PerplexityBot...).");
    } else {
      details.push("robots.txt bloque un ou plusieurs robots IA connus.");
      recommendations.push({
        points: WEIGHTS.robotsAi,
        action: "Autoriser explicitement les robots IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended...) dans robots.txt.",
      });
    }
    if (robots.hasContentSignal) {
      score += WEIGHTS.contentSignal;
      details.push("Directive Content-Signal détectée dans robots.txt.");
    } else {
      details.push("Aucune directive Content-Signal détectée.");
      recommendations.push({
        points: WEIGHTS.contentSignal,
        action: "Ajouter une directive Content-Signal dans robots.txt (ex : « search=yes, ai-input=yes, ai-train=no »).",
      });
    }
    checks.push(buildCheck("robots-ai", "Bots IA & Content-Signal", score, max, details, recommendations));
  }

  checks.push(
    sitemap.found
      ? buildCheck("sitemap", "Sitemap", WEIGHTS.sitemap, WEIGHTS.sitemap, [`Sitemap détecté (${sitemap.url}).`], [])
      : buildCheck("sitemap", "Sitemap", 0, WEIGHTS.sitemap, [
          "Aucun sitemap détecté (ni /sitemap.xml, ni de ligne « Sitemap: » exploitable dans robots.txt).",
        ], [
          {
            points: WEIGHTS.sitemap,
            action: "Publier un sitemap.xml à jour et déclarer son emplacement via une ligne « Sitemap: » dans robots.txt.",
          },
        ]),
  );

  checks.push(
    hasLinkHeaders
      ? buildCheck("link-headers", "Link headers", WEIGHTS.linkHeaders, WEIGHTS.linkHeaders, [
          "En-tête Link pointant vers llms.txt/sitemap détecté sur la page d'accueil.",
        ], [])
      : buildCheck("link-headers", "Link headers", 0, WEIGHTS.linkHeaders, [
          "Aucun en-tête Link (RFC 8288) pointant vers llms.txt/sitemap détecté.",
        ], [
          {
            points: WEIGHTS.linkHeaders,
            action:
              'Ajouter un en-tête Link sur les réponses HTTP, ex : `Link: </llms.txt>; rel="alternate"; type="text/plain", </sitemap.xml>; rel="sitemap"`.',
          },
        ]),
  );

  checks.push(
    hasMarkdownNegotiation
      ? buildCheck("markdown-agents", "Markdown for Agents", WEIGHTS.markdownAgents, WEIGHTS.markdownAgents, [
          "La page répond en text/markdown quand demandé via l'en-tête Accept.",
        ], [])
      : buildCheck("markdown-agents", "Markdown for Agents", 0, WEIGHTS.markdownAgents, [
          "La page ne sert pas de version Markdown aux requêtes avec Accept: text/markdown.",
        ], [
          {
            points: WEIGHTS.markdownAgents,
            action:
              "Activer la négociation de contenu Markdown (ex : Cloudflare → Rules → Transforms → « Markdown for Agents », ou un middleware qui convertit le HTML en Markdown quand Accept: text/markdown).",
          },
        ]),
  );

  checks.push(
    hasWebMcp
      ? buildCheck("webmcp", "WebMCP", WEIGHTS.webmcp, WEIGHTS.webmcp, [
          "Signal WebMCP (navigator.modelContext) détecté sur la page d'accueil.",
        ], [])
      : buildCheck("webmcp", "WebMCP", 0, WEIGHTS.webmcp, [
          "Aucun signal WebMCP détecté (détection heuristique sur le HTML statique — peut manquer un script chargé dynamiquement).",
        ], [
          {
            points: WEIGHTS.webmcp,
            action:
              "Exposer les actions clés du site (démo, essai, pricing) aux navigateurs agentiques via navigator.modelContext.provideContext() (spec WebMCP) — dégrade silencieusement si le navigateur ne le supporte pas.",
          },
        ]),
  );

  const rawTotal = checks.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = checks.reduce((sum, c) => sum + c.max, 0);
  const score = Math.round((rawTotal / maxTotal) * 100);

  let llmsTxtDraft: string | null = null;
  if (!llms.found && apiKey) {
    const $ = homepageHtml ? cheerio.load(homepageHtml) : null;
    const pageTitle = $ ? $("title").first().text().trim() : "";
    const metaDescription = $ ? ($('meta[name="description"]').attr("content")?.trim() ?? "") : "";
    const bodyExcerpt = $ ? $("body").text().replace(/\s+/g, " ").trim() : "";
    llmsTxtDraft = await generateLlmsTxtDraft(apiKey, hostname, pageTitle, metaDescription, bodyExcerpt);
  }

  return { hostname, score, checks, llmsTxtDraft };
}
