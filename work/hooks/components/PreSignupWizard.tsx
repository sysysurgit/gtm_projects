"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { PLATFORMS, type PlatformId } from "@/lib/ad-platforms";
import { BUDGET_OPTIONS, FUNNEL_OPTIONS, transitionVariants } from "@/lib/brief-options";
import type { BudgetRange, FunnelStage } from "@/lib/types";
import { PENDING_PRESIGNUP_KEY, type PendingPresignupBrief } from "@/lib/pending-brief";
import { ChoiceCard } from "@/components/ChoiceCard";

// Brief court capté AVANT la création de compte, directement dans le hero de
// la landing : marque -> régie -> budget -> funnel -> persona -> painpoint ->
// email/prénom/mot de passe. Le reste du brief (produit, preuves, concurrence)
// est demandé après coup par OnboardingWizard, une fois le compte créé — voir
// PENDING_PRESIGNUP_KEY pour comment ce brief partiel traverse le redirect
// signup -> confirmation email -> login.
const STEP_IDS = ["brand", "platform", "budget", "funnel", "persona", "painpoint", "account"] as const;
type StepId = (typeof STEP_IDS)[number];

export function PreSignupWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const [brandName, setBrandName] = useState("");
  const [platform, setPlatform] = useState<PlatformId | null>(null);
  const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(null);
  const [funnelStage, setFunnelStage] = useState<FunnelStage | null>(null);
  const [persona, setPersona] = useState("");
  const [painpoint, setPainpoint] = useState("");

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stepId: StepId = STEP_IDS[stepIndex];

  function goNext() {
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEP_IDS.length - 1));
  }
  function goBack() {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleBrandSubmit(e: FormEvent) {
    e.preventDefault();
    if (brandName.trim()) goNext();
  }

  function selectPlatform(next: PlatformId) {
    setPlatform(next);
    setTimeout(goNext, 180);
  }
  function selectBudget(v: BudgetRange) {
    setBudgetRange(v);
    setTimeout(goNext, 180);
  }
  function selectFunnel(v: FunnelStage) {
    setFunnelStage(v);
    setTimeout(goNext, 180);
  }

  function handleTextEnter(e: KeyboardEvent<HTMLInputElement>, value: string) {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      goNext();
    }
  }

  async function handleAccountSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "RATE_LIMITED"
          ? "Trop de tentatives, réessaie plus tard."
          : (data.error ?? "Une erreur est survenue.")
      );
      return;
    }

    const pending: PendingPresignupBrief = {
      firstName: firstName.trim(),
      brandName: brandName.trim(),
      platform: platform as PlatformId,
      budgetRange: budgetRange as BudgetRange,
      funnelStage: funnelStage as FunnelStage,
      persona: persona.trim(),
      targetPainsObjections: painpoint.trim(),
    };
    window.localStorage.setItem(PENDING_PRESIGNUP_KEY, JSON.stringify(pending));
    router.push("/verify-email");
  }

  const v = transitionVariants(direction);

  return (
    <div className="mx-auto max-w-md text-left">
      {stepIndex > 0 && (
        <button
          type="button"
          onClick={goBack}
          className="mb-3 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-link"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
      )}

      <div className="relative min-h-[132px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={stepId}
            custom={direction}
            variants={v}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {stepId === "brand" && (
              <form onSubmit={handleBrandSubmit}>
                <label htmlFor="brand-cta" className="mb-2 block text-sm font-medium text-ink-secondary">
                  Pour quelle marque allons-nous travailler ?
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 pl-4 transition-colors focus-within:border-accent">
                  <input
                    id="brand-cta"
                    autoFocus
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Nom de la marque à promouvoir"
                    className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
                  />
                  <button
                    type="submit"
                    disabled={!brandName.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:opacity-40"
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            {stepId === "platform" && (
              <div>
                <p className="mb-3 text-sm font-medium text-ink-secondary">Quelle régie publicitaire ?</p>
                <div className="grid gap-2.5">
                  {Object.entries(PLATFORMS).map(([id, spec]) => (
                    <ChoiceCard
                      key={id}
                      label={spec.label}
                      selected={platform === id}
                      onClick={() => selectPlatform(id as PlatformId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepId === "budget" && (
              <div>
                <p className="mb-3 text-sm font-medium text-ink-secondary">Quel budget média ?</p>
                <div className="grid gap-2.5">
                  {BUDGET_OPTIONS.map((o) => (
                    <ChoiceCard
                      key={o.value}
                      label={o.label}
                      selected={budgetRange === o.value}
                      onClick={() => selectBudget(o.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepId === "funnel" && (
              <div>
                <p className="mb-3 text-sm font-medium text-ink-secondary">À quelle étape du funnel ?</p>
                <div className="grid gap-2.5">
                  {FUNNEL_OPTIONS.map((o) => (
                    <ChoiceCard
                      key={o.value}
                      label={o.label}
                      hint={o.hint}
                      selected={funnelStage === o.value}
                      onClick={() => selectFunnel(o.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepId === "persona" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (persona.trim()) goNext();
                }}
              >
                <label htmlFor="persona-cta" className="mb-2 block text-sm font-medium text-ink-secondary">
                  Quel persona cible ?
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 pl-4 transition-colors focus-within:border-accent">
                  <input
                    id="persona-cta"
                    autoFocus
                    type="text"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    onKeyDown={(e) => handleTextEnter(e, persona)}
                    placeholder="VP Sales dans une scale-up B2B de 50-200 salariés"
                    className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
                  />
                  <button
                    type="submit"
                    disabled={!persona.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:opacity-40"
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            {stepId === "painpoint" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (painpoint.trim()) goNext();
                }}
              >
                <label htmlFor="painpoint-cta" className="mb-2 block text-sm font-medium text-ink-secondary">
                  Sa douleur principale ?
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5 pl-4 transition-colors focus-within:border-accent">
                  <input
                    id="painpoint-cta"
                    autoFocus
                    type="text"
                    value={painpoint}
                    onChange={(e) => setPainpoint(e.target.value)}
                    onKeyDown={(e) => handleTextEnter(e, painpoint)}
                    placeholder="Vos commerciaux perdent 3h/semaine sur des devis manuels"
                    className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted"
                  />
                  <button
                    type="submit"
                    disabled={!painpoint.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:opacity-40"
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            {stepId === "account" && (
              <form onSubmit={handleAccountSubmit} className="space-y-3">
                <p className="text-sm font-medium text-ink-secondary">
                  Dernière étape : crée ton compte pour lancer la génération.
                </p>
                <input
                  autoFocus
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ton prénom"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe (8 caractères min.)"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
                />
                {error && <p className="text-sm text-critical">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-btn-primary px-4 py-2.5 text-sm font-semibold text-btn-primary-ink transition-[filter] hover:brightness-95 disabled:opacity-60"
                >
                  {loading ? "Création..." : "Créer mon compte"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
