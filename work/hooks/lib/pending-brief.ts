import type { PlatformId } from "@/lib/ad-platforms";
import type { BudgetRange, FunnelStage } from "@/lib/types";

// Le brief partiel collecté par le wizard pré-inscription de la landing
// (marque, régie, budget, funnel, persona, painpoint) + l'identité (prénom).
// Ne peut pas traverser signup -> confirmation email -> login comme query
// param sans risque de perte, donc stocké ici et consommé une seule fois par
// OnboardingWizard au montage (voir là-bas).
export const PENDING_PRESIGNUP_KEY = "hooks_pending_presignup_brief";

export interface PendingPresignupBrief {
  firstName: string;
  brandName: string;
  platform: PlatformId;
  budgetRange: BudgetRange;
  funnelStage: FunnelStage;
  persona: string;
  targetPainsObjections: string;
}

export function readPendingPresignupBrief(): PendingPresignupBrief | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_PRESIGNUP_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(PENDING_PRESIGNUP_KEY);
  try {
    return JSON.parse(raw) as PendingPresignupBrief;
  } catch {
    return null;
  }
}
