import type { PlatformId } from "@/lib/ad-platforms";

export type BudgetRange = "lt_1k" | "1k_5k" | "5k_20k" | "gt_20k";
export type FunnelStage = "awareness" | "consideration" | "action";

export interface Brief {
  platform: PlatformId;
  adFormat: string;
  budgetRange: BudgetRange;
  funnelStage: FunnelStage;
  // Direction créative optionnelle : id d'un CreativeStyle (lib/creative-styles.ts)
  // — "comment [publicitaire/agence] l'aurait fait". null/undefined = pas de
  // style imposé, comportement identique à avant cette feature.
  creativeStyle?: string | null;
  // Catégorie 1 : mon produit
  industry: string;
  productOffer: string;
  keyFeatures: string;
  credibilityProof: string;
  // Catégorie 2 : ma cible
  persona: string;
  targetGoals: string;
  targetPainsObjections: string;
  // Catégorie 3 : concurrence
  competitorStrengths: string;
  competitorGaps: string;
  // Contexte entreprise stable (profil, pas le brief) — optionnel, s'applique
  // à toutes les générations sans être retapé à chaque brief.
  companyDescription?: string;
  brandTone?: string;
  complianceNotes?: string;
  // Visuel : éphémère, jamais persisté au-delà de l'appel de génération
  visualBase64?: string;
  visualMediaType?: string;
}

// Sous-ensemble de Brief réutilisable d'une génération à l'autre — tout sauf
// le visuel, qui reste ponctuel par design (voir DESIGN.md).
export type DefaultBrief = Omit<Brief, "visualBase64" | "visualMediaType">;

export interface Profile {
  firstName: string | null;
  brandName: string | null;
  defaultBrief: DefaultBrief | null;
  companyDescription: string | null;
  brandTone: string | null;
  complianceNotes: string | null;
  // Style créatif par défaut de l'entreprise ("Des hooks comme...") — si
  // défini, s'applique à toutes les générations sans être redemandé.
  defaultCreativeStyle: string | null;
}

export interface HookCard {
  title: string;
  description?: string;
  cta?: string;
}

// Pack RSA (Responsive Search Ads Google) : un POOL de headlines et un POOL
// de descriptions que Google recombine automatiquement (3 titres + 2
// descriptions affichés). Chaque headline doit être autonome (compréhensible
// isolément, Google les combine dans n'importe quel ordre) et chaque
// description aussi. À coller tel quel dans Google Ads.
export interface RsaPack {
  headlines: string[];
  descriptions: string[];
}

// Génération classique = 4 cards (angle/title/description/cta).
// Génération RSA = pool headlines + descriptions (voir RsaPack).
export type GenerationResult = { cards: HookCard[] } | RsaPack;
