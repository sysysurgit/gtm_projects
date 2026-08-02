"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, ArrowLeft, ArrowRight, Upload, X } from "lucide-react";
import { PLATFORMS, type PlatformId } from "@/lib/ad-platforms";
import type { BudgetRange, FunnelStage, GenerationResult, DefaultBrief } from "@/lib/types";
import { GenerationResultView } from "@/components/GenerationResultView";

interface UpsellInfo {
  cap: number;
}

const MAX_VISUAL_BYTES = 5 * 1024 * 1024;

const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: "lt_1k", label: "Moins de 1000€/mois" },
  { value: "1k_5k", label: "1000-5000€/mois" },
  { value: "5k_20k", label: "5000-20000€/mois" },
  { value: "gt_20k", label: "Plus de 20000€/mois" },
];

const FUNNEL_OPTIONS: { value: FunnelStage; label: string; hint: string }[] = [
  { value: "awareness", label: "Awareness", hint: "Faire connaître, top of funnel" },
  { value: "consideration", label: "Consideration", hint: "Comparaison, preuve, différenciation" },
  { value: "action", label: "Action", hint: "Conversion, offre, appel à l'action direct" },
];

type TextFieldId =
  | "industry"
  | "productOffer"
  | "keyFeatures"
  | "credibilityProof"
  | "persona"
  | "targetGoals"
  | "targetPainsObjections"
  | "competitorStrengths"
  | "competitorGaps";

const TEXT_FIELDS: {
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

const STEP_IDS = [
  "profile",
  "platform",
  "format",
  "budget",
  "funnel",
  ...TEXT_FIELDS.map((f) => f.id),
  "visual",
] as const;
type StepId = (typeof STEP_IDS)[number];

function transitionVariants(direction: number) {
  return {
    enter: { opacity: 0, x: direction > 0 ? 40 : -40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction > 0 ? -40 : 40 },
  };
}

function ChoiceCard({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-5 py-4 text-left transition-all ${
        selected
          ? "border-accent bg-accent-tint"
          : "border-border-soft hover:border-accent/50 hover:-translate-y-0.5"
      }`}
    >
      <p className="font-semibold">{label}</p>
      {hint && <p className="text-sm text-ink-muted mt-0.5">{hint}</p>}
    </button>
  );
}

export function OnboardingWizard({
  initialFirstName,
  initialBrandName,
  defaultBrief,
}: {
  initialFirstName: string;
  initialBrandName: string;
  defaultBrief: DefaultBrief | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const [firstName, setFirstName] = useState(initialFirstName);
  const [brandName, setBrandName] = useState(initialBrandName);

  const [platform, setPlatform] = useState<PlatformId | null>(defaultBrief?.platform ?? null);
  const [adFormat, setAdFormat] = useState<string | null>(defaultBrief?.adFormat ?? null);
  const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(defaultBrief?.budgetRange ?? null);
  const [funnelStage, setFunnelStage] = useState<FunnelStage | null>(defaultBrief?.funnelStage ?? null);

  const [fields, setFields] = useState<Record<TextFieldId, string>>({
    industry: defaultBrief?.industry ?? "",
    productOffer: defaultBrief?.productOffer ?? "",
    keyFeatures: defaultBrief?.keyFeatures ?? "",
    credibilityProof: defaultBrief?.credibilityProof ?? "",
    persona: defaultBrief?.persona ?? "",
    targetGoals: defaultBrief?.targetGoals ?? "",
    targetPainsObjections: defaultBrief?.targetPainsObjections ?? "",
    competitorStrengths: defaultBrief?.competitorStrengths ?? "",
    competitorGaps: defaultBrief?.competitorGaps ?? "",
  });

  const [visualPreview, setVisualPreview] = useState<string | null>(null);
  const [visualBase64, setVisualBase64] = useState<string | null>(null);
  const [visualMediaType, setVisualMediaType] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upsell, setUpsell] = useState<UpsellInfo | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const formats = platform ? PLATFORMS[platform].formats : [];
  const stepId: StepId = STEP_IDS[stepIndex];

  function goNext() {
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEP_IDS.length - 1));
  }
  function goBack() {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function selectPlatform(next: PlatformId) {
    setPlatform(next);
    if (next !== platform) setAdFormat(null);
    setTimeout(goNext, 180);
  }
  function selectFormat(id: string) {
    setAdFormat(id);
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

  function handleVisualChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setVisualError(null);
    if (!file) return;
    if (file.size > MAX_VISUAL_BYTES) {
      setVisualError("Image trop lourde (5 Mo max).");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, base64] = dataUrl.split(",");
      const mediaType = meta.match(/data:(.*);base64/)?.[1] ?? file.type;
      setVisualPreview(dataUrl);
      setVisualBase64(base64);
      setVisualMediaType(mediaType);
    };
    reader.readAsDataURL(file);
  }

  function clearVisual() {
    setVisualPreview(null);
    setVisualBase64(null);
    setVisualMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleTextEnter(e: KeyboardEvent<HTMLInputElement>, value: string) {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      goNext();
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setUpsell(null);
    setResult(null);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        adFormat,
        budgetRange,
        funnelStage,
        ...fields,
        visualBase64,
        visualMediaType,
        firstName,
        brandName,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.error === "CAP_REACHED") {
        setUpsell({ cap: data.cap });
      } else if (data.error === "EMAIL_NOT_VERIFIED") {
        setError("Confirme ton email avant de générer — vérifie ta boîte mail.");
      } else if (data.error === "VISUAL_TOO_LARGE") {
        setError("L'image jointe est trop lourde (5 Mo max).");
      } else {
        setError("Une erreur est survenue, réessaie.");
      }
      return;
    }

    setResult(data as GenerationResult);
    setRemaining(data.remaining);
  }

  function resetForm() {
    setResult(null);
    setUpsell(null);
    setError(null);
    clearVisual();
    setDirection(-1);
    setStepIndex(1); // le profil reste rempli, repart direct sur "régie"
  }

  if (result) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-ink-muted">
            {remaining} crédit{remaining === 1 ? "" : "s"} restant{remaining === 1 ? "" : "s"}{" "}
            aujourd&apos;hui
          </p>
          <button onClick={resetForm} className="text-sm font-medium text-link hover:underline">
            Nouvelle génération →
          </button>
        </div>
        <GenerationResultView result={result} />
      </div>
    );
  }

  const progressPct = ((stepIndex + 1) / STEP_IDS.length) * 100;
  const v = transitionVariants(direction);
  const textField = TEXT_FIELDS.find((f) => f.id === stepId);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <div className="h-1 w-full rounded-full bg-border-soft overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {stepIndex > 0 ? (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-link"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
          ) : (
            <span />
          )}
          <span className="text-xs text-ink-muted">
            {stepIndex + 1} / {STEP_IDS.length}
          </span>
        </div>
      </div>

      <div className="relative min-h-[380px]">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={stepId}
            custom={direction}
            variants={v}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {stepId === "profile" && (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pour commencer</h1>
                <p className="text-ink-muted mb-8">
                  Réutilisé automatiquement à chaque génération — modifiable à tout moment.
                </p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-ink-muted mb-2">Ton prénom</label>
                    <input
                      autoFocus
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onKeyDown={(e) => handleTextEnter(e, "ok")}
                      placeholder="Syrian"
                      className="w-full border-b-2 border-border bg-transparent pb-3 text-xl font-medium outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-muted mb-2">Nom de la marque</label>
                    <input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      onKeyDown={(e) => handleTextEnter(e, "ok")}
                      placeholder="Hooks"
                      className="w-full border-b-2 border-border bg-transparent pb-3 text-xl font-medium outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <button
                  onClick={goNext}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent text-accent-ink font-medium px-5 py-2.5"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {stepId === "platform" && (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Quelle régie publicitaire ?</h1>
                <p className="text-ink-muted mb-8">Chaque régie a ses propres contraintes de format.</p>
                <div className="grid gap-3 sm:grid-cols-2">
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

            {stepId === "format" && platform && (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Quel format d&apos;annonce ?</h1>
                <p className="text-ink-muted mb-8">Sur {PLATFORMS[platform].label}.</p>
                <div className="grid gap-3">
                  {formats.map((f) => (
                    <ChoiceCard
                      key={f.id}
                      label={f.label}
                      selected={adFormat === f.id}
                      onClick={() => selectFormat(f.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepId === "budget" && (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Quel budget média ?</h1>
                <p className="text-ink-muted mb-8">Ça calibre le ton et l&apos;ambition des hooks.</p>
                <div className="grid gap-3">
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
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">À quelle étape du funnel ?</h1>
                <p className="text-ink-muted mb-8">L&apos;angle change selon la proximité de l&apos;achat.</p>
                <div className="grid gap-3">
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

            {textField && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-link mb-3">
                  {textField.category}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{textField.question}</h1>
                <p className="text-ink-muted mb-8">{textField.placeholder}</p>
                <input
                  autoFocus
                  value={fields[textField.id]}
                  onChange={(e) => setFields((f) => ({ ...f, [textField.id]: e.target.value }))}
                  onKeyDown={(e) => handleTextEnter(e, fields[textField.id])}
                  placeholder={textField.placeholder}
                  className="w-full border-b-2 border-border bg-transparent pb-3 text-2xl font-medium outline-none focus:border-accent"
                />
                <button
                  onClick={goNext}
                  disabled={!fields[textField.id].trim()}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent text-accent-ink font-medium px-5 py-2.5 disabled:opacity-40"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {stepId === "visual" && (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Un visuel de la créa ?</h1>
                <p className="text-ink-muted mb-8">
                  Optionnel — Hooks s&apos;en inspire si ça rend l&apos;accroche plus forte.
                </p>

                {!visualPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-accent"
                  >
                    <Upload className="h-6 w-6 text-ink-muted" strokeWidth={1.75} />
                    <span className="text-sm font-medium">Choisir une image</span>
                    <span className="text-xs text-ink-muted">PNG, JPG — 5 Mo max</span>
                  </button>
                ) : (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={visualPreview}
                      alt="Aperçu du visuel"
                      className="h-32 rounded-lg border border-border-soft object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearVisual}
                      aria-label="Retirer le visuel"
                      className="absolute -top-2 -right-2 rounded-full bg-ink p-1 text-paper"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleVisualChange}
                  className="hidden"
                />
                {visualError && <p className="text-sm text-critical mt-2">{visualError}</p>}

                {error && <p className="text-sm text-critical mt-4">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent text-accent-ink font-medium px-6 py-3 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Génération en cours...
                    </>
                  ) : (
                    "Générer les hooks"
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {upsell && (
        <div className="mt-8 rounded-lg border border-accent bg-accent-tint p-5">
          <p className="font-medium mb-1">Tu as atteint ta limite de {upsell.cap} crédits aujourd&apos;hui.</p>
          <p className="text-sm text-ink-secondary">
            Ça se réinitialise demain — reviens dès l&apos;ouverture pour continuer.
          </p>
        </div>
      )}
    </div>
  );
}
