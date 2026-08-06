import type { BudgetRange, FunnelStage } from "@/lib/types";
import { CREATIVE_STYLES } from "@/lib/creative-styles";

// Options et métadonnées de brief partagées entre le wizard pré-inscription
// de la landing (PreSignupWizard) et le wizard post-compte (OnboardingWizard)
// — une seule source de vérité pour les libellés affichés à l'utilisateur.

export const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: "lt_1k", label: "Moins de 1000€/mois" },
  { value: "1k_5k", label: "1000-5000€/mois" },
  { value: "5k_20k", label: "5000-20000€/mois" },
  { value: "gt_20k", label: "Plus de 20000€/mois" },
];

export const FUNNEL_OPTIONS: { value: FunnelStage; label: string; hint: string }[] = [
  { value: "awareness", label: "Awareness", hint: "Faire connaître, top of funnel" },
  { value: "consideration", label: "Consideration", hint: "Comparaison, preuve, différenciation" },
  { value: "action", label: "Action", hint: "Conversion, offre, appel à l'action direct" },
];

// Option "pas de style imposé" toujours en tête + les 12 publicitaires/agences.
export const CREATIVE_STYLE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "none", label: "Aucun style particulier", hint: "Le hook le plus efficace, sans direction imposée" },
  ...CREATIVE_STYLES.map((s) => ({ value: s.id, label: s.name, hint: `${s.org} — ${s.hint}` })),
];

export type TextFieldId =
  | "industry"
  | "productOffer"
  | "keyFeatures"
  | "credibilityProof"
  | "persona"
  | "targetGoals"
  | "targetPainsObjections"
  | "competitorStrengths"
  | "competitorGaps";

export const TEXT_FIELDS: {
  id: TextFieldId;
  category: string;
  question: string;
  placeholder: string;
}[] = [
  {
    id: "industry",
    category: "Mon produit",
    question: "Quelle industrie / secteur ?",
    placeholder: "SaaS RH, cabinet de recrutement tech...",
  },
  {
    id: "productOffer",
    category: "Mon produit",
    question: "Quel produit / offre ?",
    placeholder: "Outil de paie automatisée pour PME",
  },
  {
    id: "keyFeatures",
    category: "Mon produit",
    question: "Quelles fonctionnalités clés ?",
    placeholder: "Calcul automatique, déclarations DSN, virements en 1 clic...",
  },
  {
    id: "credibilityProof",
    category: "Mon produit",
    question: "Quelles preuves de crédibilité ?",
    placeholder: "0 erreur sur 14 200 bulletins en 2023, certifié ISO 27001...",
  },
  {
    id: "persona",
    category: "Ma cible",
    question: "Quel persona cible ?",
    placeholder: "VP Sales dans une scale-up B2B de 50-200 salariés",
  },
  {
    id: "targetGoals",
    category: "Ma cible",
    question: "Ses rêves, ses objectifs ?",
    placeholder: "Scaler l'équipe sans complexifier les opérations RH",
  },
  {
    id: "targetPainsObjections",
    category: "Ma cible",
    question: "Ses douleurs et objections actuelles ?",
    placeholder: "Trop cher, peur de migrer les données, pas le temps de tester...",
  },
  {
    id: "competitorStrengths",
    category: "Concurrence",
    question: "Ce que les concurrents apportent ?",
    placeholder: "Intégration Slack, prix d'appel bas...",
  },
  {
    id: "competitorGaps",
    category: "Concurrence",
    question: "Ce qu'ils n'ont pas / leurs limites ?",
    placeholder: "Pas de DSN automatique, support client lent...",
  },
];

export function transitionVariants(direction: number) {
  return {
    enter: { opacity: 0, x: direction > 0 ? 40 : -40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction > 0 ? -40 : 40 },
  };
}
