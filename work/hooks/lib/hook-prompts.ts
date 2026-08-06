import type { Brief } from "@/lib/types";
import { getCreativeStyle } from "@/lib/creative-styles";

// Construction du prompt partagée entre providers (Gemini historiquement,
// DeepSeek désormais pour la génération — Gemini reste utilisé uniquement
// pour décrire un visuel joint, voir lib/gemini/describe-image.ts).
export const CARDS_PER_GENERATION = 4;

const BUDGET_LABEL: Record<Brief["budgetRange"], string> = {
  lt_1k: "moins de 1000€/mois",
  "1k_5k": "1000-5000€/mois",
  "5k_20k": "5000-20000€/mois",
  gt_20k: "plus de 20000€/mois",
};

const FUNNEL_LABEL: Record<Brief["funnelStage"], string> = {
  awareness: "Awareness (notoriété, top of funnel) — angle curiosité/problème, pas de vente directe",
  consideration: "Consideration (comparaison, milieu de funnel) — angle preuve/différenciation",
  action: "Action (conversion, bas de funnel) — angle urgence/offre/appel à l'action direct",
};

const COPYWRITING_TECHNIQUES = `- AIDA (Attention-Intérêt-Désir-Action)
- PAS (Problem-Agitate-Solve) : nommer le problème, l'aggraver, proposer la solution
- Before-After-Bridge : situation actuelle vs. situation idéale, le produit comme pont
- Curiosity gap : une question ou une affirmation incomplète qui force à cliquer pour la réponse
- Pattern interrupt / contrarian : contredire une croyance répandue du secteur
- Preuve sociale : chiffres, nombre de clients, résultats mesurés
- Formule direct-response : "Comment [résultat] sans [douleur habituelle]", "Les N [choses] que [audience] ignore sur [sujet]"
- Urgence / FOMO : fenêtre de temps, opportunité limitée, coût de l'inaction
- Spécificité comme preuve de crédibilité : chiffres précis, délais précis, plutôt que des superlatifs vagues`;

export function buildSystemPrompt(
  platformLabel: string,
  formatLabel: string,
  guidance: string,
  styleGuidance?: string
): string {
  return `Tu es un copywriter direct-response senior, spécialisé en publicité payante B2B (LinkedIn, Meta, Google, Reddit Ads). Tu ne produis JAMAIS de paragraphe marketing générique — un hook est UNE ligne qui arrête le scroll, pas une présentation produit.

RÈGLE ABSOLUE SUR LE "title" — LA PLUS IMPORTANTE DE CE PROMPT :
Le title est UNE SEULE phrase, UNE SEULE idée. JAMAIS deux phrases collées par un point. Si tu as deux idées, la deuxième va dans "description", jamais dans "title".

❌ MAUVAIS (deux phrases, ressemble à un titre d'article, pas à un hook) :
"Vos salariés ignorent les e-learnings de 45 minutes. Passez aux micro-trainings de 3 minutes sur Slack et Teams."

✅ BON (une seule phrase, courte, qui arrête le scroll) :
"0 erreur sur 14 200 bulletins de paie en 2023."
"Vos commerciaux perdent 3h/semaine sur des devis manuels."
"Le sourcing tech prend 3 semaines. Le vôtre peut prendre 3 jours." ← À ÉVITER AUSSI, c'est déjà limite (2 propositions) : préfère "3 jours pour sourcer un profil tech, pas 3 semaines."

Un hook n'explique pas le produit, il crée une réaction immédiate (choc, curiosité, reconnaissance) en une respiration de lecture. Si en te relisant le title sonne comme un titre de slide ou un chapô d'article, raccourcis-le et retire tout ce qui n'est pas l'idée centrale.

Techniques de copywriting éprouvées à ta disposition (assigne une technique DIFFÉRENTE à chaque card pour garantir des angles vraiment distincts, pas des reformulations les unes des autres) :
${COPYWRITING_TECHNIQUES}

Régie : ${platformLabel} — Format : ${formatLabel}
${guidance}
${styleGuidance ? `\nDIRECTION CRÉATIVE IMPOSÉE POUR CETTE GÉNÉRATION :\n${styleGuidance}\nCette direction créative prime sur le ton par défaut, mais jamais sur la RÈGLE ABSOLUE du title en une seule phrase ni sur les contraintes de caractères de la régie.\n` : ""}
Méthode de travail obligatoire : pour chaque angle, rédige d'abord un brouillon, critique-le toi-même honnêtement (pouvoir d'arrêt au scroll, clarté, une seule phrase, spécificité, adéquation avec le format et la régie, alignement avec l'offre et la cible), puis retravaille-le jusqu'à ce qu'il soit vraiment bon — en particulier, vérifie que le title n'est jamais devenu deux phrases collées. Ne renvoie que le résultat final retravaillé — jamais le premier jet, jamais de version faible. GÉNÈRE EXACTEMENT ${CARDS_PER_GENERATION} cards.`;
}

export function buildUserPrompt(
  brief: Brief,
  platformLabel: string,
  formatLabel: string,
  visualDescription?: string
): string {
  const hasVisual = Boolean(visualDescription);
  return `Brief annonceur :

RÉGIE : ${platformLabel} (${formatLabel})
Budget média : ${BUDGET_LABEL[brief.budgetRange]}
Étape du funnel : ${FUNNEL_LABEL[brief.funnelStage]}

MON PRODUIT
- Industrie / secteur : ${brief.industry}
- Produit / offre : ${brief.productOffer}
- Fonctionnalités clés : ${brief.keyFeatures}
- Preuves de crédibilité (chiffres, témoignages, certifications...) : ${brief.credibilityProof}

MA CIBLE
- Persona : ${brief.persona}
- Rêves / objectifs recherchés : ${brief.targetGoals}
- Douleurs & objections actuelles : ${brief.targetPainsObjections}

CONCURRENCE
- Ce que les concurrents apportent : ${brief.competitorStrengths}
- Ce qu'ils n'ont pas / leurs limites : ${brief.competitorGaps}
${hasVisual ? `\nUn visuel de la créa est joint, décrit ainsi : "${visualDescription}". Utilise-le comme contexte optionnel : ne le référence que si ça rend vraiment le hook plus fort, ne force pas le lien.` : ""}

Génère exactement ${CARDS_PER_GENERATION} cards en respectant strictement les limites de caractères données. Utilise la faiblesse identifiée chez les concurrents et les vraies preuves de crédibilité pour rendre chaque angle spécifique à cette marque, pas générique au secteur.`;
}

export interface RawCard {
  angle: string;
  title: string;
  description?: string;
  cta?: string;
}

// Détecte un title composé de deux phrases collées (ex. "...45 minutes.
// Passez aux micro-trainings...") — le symptôme exact d'un "titre" plutôt
// qu'un vrai hook. Un point/!/? suivi d'un espace puis d'une majuscule
// ailleurs qu'en toute fin de chaîne trahit une deuxième phrase.
function isCompoundSentence(title: string): boolean {
  const trimmed = title.trim();
  const withoutTrailingPunctuation = trimmed.replace(/[.!?]+$/, "");
  return /[.!?]\s+[A-ZÀ-Ý]/.test(withoutTrailingPunctuation);
}

export function isCompliant(card: RawCard, titleMax: number, descriptionMax: number): boolean {
  if (card.title.length > titleMax) return false;
  if (isCompoundSentence(card.title)) return false;
  if (card.description && card.description.length > descriptionMax) return false;
  return true;
}

export function buildCreativeStyleGuidance(creativeStyle: string | null | undefined): string | undefined {
  return getCreativeStyle(creativeStyle)?.guidance;
}
