import * as cheerio from "cheerio";

export const MAX_PAGES = 20;
const MAX_SITEMAPS_TO_FOLLOW = 3;
const FETCH_TIMEOUT_MS = 8000;
// Plafond de collecte (avant de tronquer à MAX_PAGES) — sert uniquement à
// calculer un `totalFound` honnête et à borner le temps de traitement des
// gros sitemaps, pas à limiter le nombre de pages réellement analysées.
// Si `totalFound` atteint exactement ce plafond, le vrai total est probablement
// plus élevé (voir `totalFoundIsApproximate` dans le résultat).
export const DISCOVERY_SAFETY_CAP = 500;

export interface DiscoveryResult {
  rootUrl: string;
  hostname: string;
  urls: string[];
  source: "sitemap" | "homepage-links";
  totalFound: number;
  totalFoundIsApproximate: boolean;
  capped: boolean;
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VerificateurScoreGEO/1.0)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RobotsRules {
  disallow: string[];
  sitemaps: string[];
}

/** Parse minimal : règles Disallow du bloc "User-agent: *" + lignes Sitemap. */
function parseRobotsTxt(text: string): RobotsRules {
  const disallow: string[] = [];
  const sitemaps: string[] = [];
  let inWildcardBlock = false;
  let sawWildcardBlock = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sepIndex = line.indexOf(":");
    if (sepIndex === -1) continue;
    const key = line.slice(0, sepIndex).trim().toLowerCase();
    const value = line.slice(sepIndex + 1).trim();

    if (key === "sitemap" && value) {
      sitemaps.push(value);
      continue;
    }
    if (key === "user-agent") {
      inWildcardBlock = value === "*";
      if (value === "*") sawWildcardBlock = true;
      continue;
    }
    if (key === "disallow" && inWildcardBlock && value) {
      disallow.push(value);
    }
  }

  return { disallow: sawWildcardBlock ? disallow : [], sitemaps };
}

function isDisallowed(pathname: string, disallow: string[]): boolean {
  return disallow.some((rule) => rule && pathname.startsWith(rule));
}

function extractLocsFromXml(xml: string): { locs: string[]; isIndex: boolean } {
  const $ = cheerio.load(xml, { xmlMode: true });
  const isIndex = $("sitemapindex").length > 0;
  const locs: string[] = [];
  $("loc").each((_, el) => {
    const text = $(el).text().trim();
    if (text) locs.push(text);
  });
  return { locs, isIndex };
}

async function discoverViaSitemap(
  sitemapUrls: string[],
  hostname: string,
  disallow: string[],
): Promise<string[]> {
  const seen = new Set<string>();
  const pages: string[] = [];
  const queue = sitemapUrls.slice(0, MAX_SITEMAPS_TO_FOLLOW);

  for (let i = 0; i < queue.length && pages.length < DISCOVERY_SAFETY_CAP; i++) {
    const xml = await fetchText(queue[i]);
    if (!xml) continue;
    const { locs, isIndex } = extractLocsFromXml(xml);

    if (isIndex) {
      for (const child of locs) {
        if (queue.length >= MAX_SITEMAPS_TO_FOLLOW) break;
        if (!queue.includes(child)) queue.push(child);
      }
      continue;
    }

    for (const loc of locs) {
      if (pages.length >= DISCOVERY_SAFETY_CAP) break;
      try {
        const u = new URL(loc);
        if (u.hostname !== hostname) continue;
        if (isDisallowed(u.pathname, disallow)) continue;
        const normalized = u.toString();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        pages.push(normalized);
      } catch {
        // loc invalide — ignoré
      }
    }
  }

  return pages;
}

async function discoverViaHomepageLinks(
  homepageUrl: URL,
  hostname: string,
  disallow: string[],
): Promise<string[]> {
  const html = await fetchText(homepageUrl.toString());
  const seen = new Set<string>([homepageUrl.toString()]);
  const pages = [homepageUrl.toString()];
  if (!html) return pages;

  const $ = cheerio.load(html);
  $("a[href]").each((_, el) => {
    if (pages.length >= DISCOVERY_SAFETY_CAP) return;
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const u = new URL(href, homepageUrl);
      if (u.hostname !== hostname) return;
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      if (isDisallowed(u.pathname, disallow)) return;
      u.hash = "";
      const normalized = u.toString();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      pages.push(normalized);
    } catch {
      // href invalide — ignoré
    }
  });

  return pages;
}

/**
 * Découvre les pages d'un site à auditer : d'abord via robots.txt + sitemap.xml
 * (source la plus fiable et la plus rapide à couvrir), avec repli sur les liens
 * internes de la page d'accueil si aucun sitemap n'est trouvé. Respecte les
 * règles Disallow du robots.txt et plafonne à MAX_PAGES pour borner le coût et
 * le temps d'un audit (chaque page déclenche ensuite un appel à /api/analyze).
 */
export async function discoverSitePages(url: URL): Promise<DiscoveryResult> {
  const hostname = url.hostname;
  const origin = url.origin;

  const robotsText = await fetchText(`${origin}/robots.txt`);
  const robots = robotsText ? parseRobotsTxt(robotsText) : { disallow: [], sitemaps: [] };

  const sitemapCandidates = robots.sitemaps.length > 0 ? robots.sitemaps : [`${origin}/sitemap.xml`];
  let urls = await discoverViaSitemap(sitemapCandidates, hostname, robots.disallow);
  let source: "sitemap" | "homepage-links" = "sitemap";

  if (urls.length === 0) {
    source = "homepage-links";
    urls = await discoverViaHomepageLinks(new URL(origin), hostname, robots.disallow);
  }

  const totalFound = urls.length;
  const capped = totalFound > MAX_PAGES;
  const totalFoundIsApproximate = totalFound >= DISCOVERY_SAFETY_CAP;

  const homepageStr = new URL(origin).toString();
  const ordered = urls.includes(homepageStr)
    ? [homepageStr, ...urls.filter((u) => u !== homepageStr)]
    : urls;

  return {
    rootUrl: origin,
    hostname,
    urls: ordered.slice(0, MAX_PAGES),
    source,
    totalFound,
    totalFoundIsApproximate,
    capped,
  };
}
