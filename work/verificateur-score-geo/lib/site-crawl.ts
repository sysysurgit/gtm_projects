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

export type PageCategory = "home" | "pricing" | "product" | "resources" | "about" | "careers" | "contact" | "legal" | "other";

export const CATEGORY_LABELS: Record<PageCategory, string> = {
  home: "Accueil",
  pricing: "Pricing",
  product: "Produit",
  resources: "Ressources",
  about: "À propos",
  careers: "Carrières",
  contact: "Contact",
  legal: "Légal",
  other: "Autre",
};

export interface SelectedPage {
  url: string;
  category: PageCategory;
}

export interface DiscoveryResult {
  rootUrl: string;
  hostname: string;
  pages: SelectedPage[];
  source: "sitemap" | "homepage-links";
  totalFound: number;
  totalFoundIsApproximate: boolean;
  capped: boolean;
}

async function fetchTextWithFinalUrl(url: string): Promise<{ text: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VerificateurScoreGEO/1.0)" },
    });
    if (!res.ok) return null;
    return { text: await res.text(), finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchText(url: string): Promise<string | null> {
  const result = await fetchTextWithFinalUrl(url);
  return result ? result.text : null;
}

export interface RobotsRules {
  disallow: string[];
  sitemaps: string[];
}

/** Parse minimal : règles Disallow du bloc "User-agent: *" + lignes Sitemap. */
export function parseRobotsTxt(text: string): RobotsRules {
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
 * Classification par mot-clé d'URL (aucun appel réseau/IA — reste rapide et
 * gratuit même sur un site à plusieurs centaines de pages). Chaque mot-clé est
 * comparé à un token entier du chemin (segments séparés par "/", "-" ou "_"),
 * jamais en sous-chaîne libre : ça évite par exemple qu'un article de blog
 * "/news/electricity-price-increases" ou "/news/hiring-plans" se retrouve
 * classé "pricing" juste parce qu'il contient "price"/"plans" au milieu d'un
 * slug — d'où l'absence volontaire de ces deux mots trop génériques/ambigus
 * dans la liste ci-dessous (contrairement à "pricing"/"tarifs", univoques).
 * Ordre de test : catégories les plus spécifiques d'abord, "other" en repli.
 */
const CATEGORY_KEYWORDS: Partial<Record<PageCategory, string[]>> = {
  pricing: ["pricing", "tarif", "tarifs"],
  product: ["product", "products", "produit", "produits", "solution", "solutions"],
  resources: [
    "blog", "docs", "doc", "documentation", "guide", "guides", "resource", "resources",
    "ressource", "ressources", "learn", "article", "articles", "faq", "help", "academy",
    "case-studies", "case-study", "etudes-de-cas",
  ],
  careers: ["careers", "career", "jobs", "job", "recrutement", "carriere", "carrieres"],
  about: ["about", "company", "equipe", "team", "qui-sommes-nous", "a-propos", "notre-histoire"],
  contact: ["contact"],
  legal: ["legal", "privacy", "terms", "cgu", "cgv", "mentions-legales", "cookie", "cookies", "confidentialite"],
};

const CATEGORY_TEST_ORDER: PageCategory[] = ["pricing", "product", "resources", "careers", "about", "contact", "legal"];

/** Le mot-clé (simple ou composé de tirets) doit apparaître comme token entier dans le segment, pas en sous-chaîne. */
function segmentMatchesKeyword(segment: string, keyword: string): boolean {
  return segment === keyword || segment.startsWith(`${keyword}-`) || segment.endsWith(`-${keyword}`) || segment.includes(`-${keyword}-`);
}

function classifyUrl(u: URL): PageCategory {
  if (u.pathname === "/" || u.pathname === "") return "home";
  const segments = u.pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);

  for (const category of CATEGORY_TEST_ORDER) {
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    if (segments.some((segment) => keywords.some((kw) => segmentMatchesKeyword(segment, kw)))) {
      return category;
    }
  }
  return "other";
}

// Codes de langue reconnus en préfixe de chemin (ISO 639-1, + variantes
// régionales du type "fr-fr" / "pt-br"). Utilisé uniquement pour dédupliquer
// les variantes de langue d'une même page ("/pricing" et "/fr/pricing" sont
// la même page) — un segment qui n'est pas dans cette liste n'est jamais
// traité comme un préfixe de langue, pour éviter les faux positifs sur un
// slug qui ressemblerait à un code (ex: une page produit "/no-code").
const LANGUAGE_CODES = new Set([
  "fr", "en", "de", "es", "it", "pt", "nl", "pl", "sv", "da", "no", "fi", "ja",
  "zh", "ko", "ru", "ar", "he", "tr", "cs", "el", "hu", "ro", "uk", "vi", "th",
  "id", "sk", "bg", "hr", "lt", "lv", "et", "sl", "sr",
]);

function isLanguageSegment(segment: string): boolean {
  const [lang, region] = segment.toLowerCase().split("-");
  if (!LANGUAGE_CODES.has(lang)) return false;
  if (region && !/^[a-z]{2}$/.test(region)) return false;
  return true;
}

function hasLanguagePrefix(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length > 0 && isLanguageSegment(segments[0]);
}

/**
 * Chemin "canonique" pour la déduplication : sans préfixe de langue éventuel,
 * et toujours reconstruit sans slash final — sinon "/pricing/" (slash final)
 * et "/fr/pricing/" (qui se réduit à "/pricing" une fois le préfixe retiré,
 * sans slash final) produiraient deux clés différentes et ne seraient jamais
 * reconnus comme la même page.
 */
function canonicalPathForDedup(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const relevant = hasLanguagePrefix(pathname) ? segments.slice(1) : segments;
  return relevant.length > 0 ? "/" + relevant.join("/") : "/";
}

/**
 * Regroupe les variantes de langue d'une même page ("/pricing" et
 * "/fr/pricing") sous une seule entrée, en préférant la version sans préfixe
 * de langue (considérée comme la version par défaut) quand les deux existent.
 */
function deduplicateByLanguage(urls: string[]): string[] {
  const chosen = new Map<string, string>(); // chemin canonique -> URL choisie
  const order: string[] = [];

  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const canonical = canonicalPathForDedup(u.pathname);
    const existing = chosen.get(canonical);
    if (!existing) {
      chosen.set(canonical, raw);
      order.push(canonical);
      continue;
    }
    const existingHasPrefix = hasLanguagePrefix(new URL(existing).pathname);
    const currentHasPrefix = hasLanguagePrefix(u.pathname);
    if (existingHasPrefix && !currentHasPrefix) {
      chosen.set(canonical, raw); // remplace par la version sans préfixe de langue
    }
  }

  return order.map((c) => chosen.get(c)!);
}

// Pages de compte, d'authentification ou purement légales/boilerplate : hors
// scope d'un audit GEO (ni contenu produit, ni contenu éditorial). Filtrées
// entièrement de la sélection plutôt que simplement déclassées, pour ne
// jamais gaspiller une des 20 places sur une page de mentions légales ou de
// double authentification.
const EXCLUDED_KEYWORDS = [
  // Légal / boilerplate
  "privacy", "privacy-policy", "privacy_policy", "terms", "terms-of-service",
  "tos", "cgu", "cgv", "mentions-legales", "cookie", "cookies", "cookie-policy",
  "confidentialite", "legal", "gdpr", "dpa",
  // Compte / authentification / sécurité applicative
  "login", "signin", "sign-in", "signup", "sign-up", "register", "logout",
  "log-out", "account", "my-account", "settings", "password",
  "forgot-password", "reset-password", "verify", "verify-email",
  "unsubscribe", "sso", "saml", "mfa", "2fa", "two-factor", "session",
];

function isExcludedPath(pathname: string): boolean {
  const segments = pathname.toLowerCase().split("/").filter(Boolean);
  return segments.some((segment) => EXCLUDED_KEYWORDS.some((kw) => segmentMatchesKeyword(segment, kw)));
}

// Quota par catégorie sur les MAX_PAGES sélectionnées, pour garantir un
// échantillon représentatif des grandes familles de pages d'un site plutôt
// qu'un tri arbitraire (ex : les 20 premiers articles de blog par ordre
// alphabétique). "legal" est volontairement à 0 : pages peu pertinentes pour
// le GEO (boilerplate rarement optimisé), on ne les pioche qu'en tout dernier
// recours s'il ne reste vraiment rien d'autre pour remplir le quota.
const CATEGORY_QUOTAS: Partial<Record<PageCategory, number>> = {
  home: 1,
  pricing: 2,
  product: 4,
  resources: 5,
  about: 1,
  careers: 1,
  contact: 1,
  legal: 0,
};

// Ordre de remplissage des places restantes une fois les quotas satisfaits :
// "other" en priorité (souvent les pages de contenu individuelles — articles,
// fiches produit détaillées — les plus rentables à auditer), puis les
// catégories nommées par ordre décroissant d'intérêt, "legal" en tout dernier.
const FILL_ORDER: PageCategory[] = ["other", "resources", "product", "pricing", "about", "careers", "contact", "home", "legal"];

function pathLength(rawUrl: string): number {
  try {
    return new URL(rawUrl).pathname.length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Sélectionne un échantillon représentatif de `limit` pages parmi les URLs
 * découvertes : classification par motif d'URL, puis répartition par quota
 * par catégorie (accueil, pricing, produit, ressources...), les places
 * restantes étant comblées en priorisant les pages de contenu ("other") et en
 * préférant, au sein d'une catégorie, les chemins les plus courts (proxy pour
 * "page plus proche de la racine du site = plus probablement importante").
 */
export function selectImportantPages(urls: string[], limit: number): SelectedPage[] {
  const buckets = new Map<PageCategory, string[]>();
  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const category = classifyUrl(u);
    const list = buckets.get(category);
    if (list) list.push(raw);
    else buckets.set(category, [raw]);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => pathLength(a) - pathLength(b) || a.localeCompare(b));
  }

  const selected: SelectedPage[] = [];
  const used = new Set<string>();
  const takenPerCategory = new Map<PageCategory, number>();

  // Passe 1 : respecter les quotas par catégorie.
  for (const [category, quota] of Object.entries(CATEGORY_QUOTAS) as [PageCategory, number][]) {
    if (quota <= 0 || selected.length >= limit) continue;
    for (const u of buckets.get(category) ?? []) {
      if (selected.length >= limit) break;
      if ((takenPerCategory.get(category) ?? 0) >= quota) break;
      selected.push({ url: u, category });
      used.add(u);
      takenPerCategory.set(category, (takenPerCategory.get(category) ?? 0) + 1);
    }
  }

  // Passe 2 : combler les places restantes, "other" et contenu en priorité.
  for (const category of FILL_ORDER) {
    if (selected.length >= limit) break;
    for (const u of buckets.get(category) ?? []) {
      if (selected.length >= limit) break;
      if (used.has(u)) continue;
      selected.push({ url: u, category });
      used.add(u);
    }
  }

  return selected;
}

/**
 * Découvre les pages d'un site à auditer : d'abord via robots.txt + sitemap.xml
 * (source la plus fiable et la plus rapide à couvrir), avec repli sur les liens
 * internes de la page d'accueil si aucun sitemap n'est trouvé. Respecte les
 * règles Disallow du robots.txt, puis sélectionne un échantillon représentatif
 * de MAX_PAGES pages (voir `selectImportantPages`) pour borner le coût et le
 * temps d'un audit (chaque page déclenche ensuite un appel à /api/analyze).
 */
export async function discoverSitePages(url: URL): Promise<DiscoveryResult> {
  const hostname = url.hostname;
  const origin = url.origin;

  const robotsFetch = await fetchTextWithFinalUrl(`${origin}/robots.txt`);
  const robots = robotsFetch ? parseRobotsTxt(robotsFetch.text) : { disallow: [], sitemaps: [] };
  // Hostname canonique effectif après redirection éventuelle (ex : www.site.com
  // -> site.com). Les URLs déclarées dans le sitemap sont comparées à celui-ci,
  // pas au hostname brut saisi par l'utilisateur — sinon un simple redirect
  // www <-> apex ferait passer toutes les pages du sitemap pour "hors domaine"
  // et ferait basculer, à tort, sur le repli (beaucoup plus faible) par liens
  // de la page d'accueil.
  const effectiveHostname = robotsFetch ? new URL(robotsFetch.finalUrl).hostname : hostname;

  const sitemapCandidates = robots.sitemaps.length > 0 ? robots.sitemaps : [`${origin}/sitemap.xml`];
  let urls = await discoverViaSitemap(sitemapCandidates, effectiveHostname, robots.disallow);
  let source: "sitemap" | "homepage-links" = "sitemap";

  if (urls.length === 0) {
    source = "homepage-links";
    urls = await discoverViaHomepageLinks(new URL(origin), effectiveHostname, robots.disallow);
  }

  const totalFoundIsApproximate = urls.length >= DISCOVERY_SAFETY_CAP;

  const deduped = deduplicateByLanguage(urls);
  const candidates = deduped.filter((u) => {
    try {
      return !isExcludedPath(new URL(u).pathname);
    } catch {
      return false;
    }
  });

  const totalFound = candidates.length;
  const capped = totalFound > MAX_PAGES;

  return {
    rootUrl: origin,
    hostname,
    pages: selectImportantPages(candidates, MAX_PAGES),
    source,
    totalFound,
    totalFoundIsApproximate,
    capped,
  };
}
