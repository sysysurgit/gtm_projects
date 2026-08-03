import type { PlatformId } from "@/lib/ad-platforms";

export type BudgetRange = "lt_1k" | "1k_5k" | "5k_20k" | "gt_20k";
export type FunnelStage = "awareness" | "consideration" | "action";

export interface Brief {
  platform: PlatformId;
  adFormat: string;
  budgetRange: BudgetRange;
  funnelStage: FunnelStage;
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
}

export interface HookCard {
  title: string;
  description?: string;
  cta?: string;
}

export interface GenerationResult {
  cards: HookCard[];
}
