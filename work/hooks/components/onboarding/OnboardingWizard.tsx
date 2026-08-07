"use client";

import { useMemo, useRef, useState, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, ArrowLeft, ArrowRight, Upload, X } from "lucide-react";
import { PLATFORMS, type PlatformId } from "@/lib/ad-platforms";
import type { BudgetRange, FunnelStage, GenerationResult, DefaultBrief } from "@/lib/types";
import { GenerationResultView } from "@/components/GenerationResultView";
import { BUDGET_OPTIONS, FUNNEL_OPTIONS, CREATIVE_STYLE_OPTIONS, TEXT_FIELDS, transitionVariants, type TextFieldId } from "@/lib/brief-options";
import { readPendingPresignupBrief } from "@/lib/pending-brief";
import { ChoiceCard } from "@/components/ChoiceCard";

interface UpsellInfo {
  cap: number;
}

const MAX_VISUAL_BYTES = 5 * 1024 * 1024;

// Étapes pouvant avoir déjà été répondues dans le PreSignupWizard de la
// landing (régie, budget, funnel, persona, painpoint). "format" reste
// toujours demandé ici : il dépend de la régie mais n'est jamais posé avant
// inscription. Les champs produit/preuves/concurrence restants sont ceux
// dans TEXT_FIELDS moins persona/targetPainsObjections. Le style créatif
// ("Des hooks comme...") est TOUJOURS la dernière étape du formulaire, sauf
// s'il est déjà défini dans le profil entreprise (skipStyle) — dans ce cas
// il ne doit pas être redemandé et la valeur du profil s'applique.
const PRESIGNUP_COVERABLE_STEPS = ["platform", "budget", "funnel"] as const;
const REMAINING_TEXT_FIELDS = TEXT_FIELDS.filter(
  (f) => f.id !== "persona" && f.id !== "targetPainsObjections"
);

function buildStepIds(skipPlatform: boolean, skipBudget: boolean, skipFunnel: boolean, skipPersona: boolean, skipPain: boolean, skipStyle: boolean) {
  const ids: string[] = ["profile"];
  if (!skipPlatform) ids.push("platform");
  ids.push("format");
  if (!skipBudget) ids.push("budget");
  if (!skipFunnel) ids.push("funnel");
  for (const f of TEXT_FIELDS) {
    if (f.id === "persona" && skipPersona) continue;
    if (f.id === "targetPainsObjections" && skipPain) continue;
    ids.push(f.id);
  }
  // Style en dernier élément du formulaire (juste avant le visuel optionnel)
  if (!skipStyle) ids.push("style");
  ids.push("visual");
  return ids as StepId[];
}

type StepId =
  | "profile"
  | "platform"
  | "format"
  | "budget"
  | "funnel"
  | "style"
  | TextFieldId
  | "visual";

export function OnboardingWizard({
  initialFirstName,
  initialBrandName,
  defaultBrief,
  profileCreativeStyle,
}: {
  initialFirstName: string;
  initialBrandName: string;
  defaultBrief: DefaultBrief | null;
  // Style créatif défini dans le profil entreprise ("Des hooks comme...") —
  // "none" ou null = pas de style imposé côté entreprise.
  profileCreativeStyle: string;
}) {
  // Lu une seule fois via l'initialiseur paresseux de useState (pas un
  // effect) pour éviter un second render juste pour appliquer les valeurs —
  // voir lib/pending-brief.ts pour pourquoi ce brief transite par
  // localStorage plutôt qu'un query param.
  const [pendingBrief] = useState(() => readPendingPresignupBrief());

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const [firstName, setFirstName] = useState(pendingBrief?.firstName || initialFirstName);
  const [brandName, setBrandName] = useState(pendingBrief?.brandName || initialBrandName);

  const [platform, setPlatform] = useState<PlatformId | null>(
    pendingBrief?.platform ?? defaultBrief?.platform ?? null
  );
  const [adFormat, setAdFormat] = useState<string | null>(defaultBrief?.adFormat ?? null);
  const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(
    pendingBrief?.budgetRange ?? defaultBrief?.budgetRange ?? null
  );
  const [funnelStage, setFunnelStage] = useState<FunnelStage | null>(
    pendingBrief?.funnelStage ?? defaultBrief?.funnelStage ?? null
  );
  // "none" = pas de direction créative imposée (comportement historique).
  // Distinct de null pour que ChoiceCard puisse afficher "Aucun style
  // particulier" comme une option sélectionnable au même titre que les autres.
  // Priorité : brief (defaultBrief/template) > profil entreprise > none.
  const [creativeStyle, setCreativeStyle] = useState<string>(
    defaultBrief?.creativeStyle || (profileCreativeStyle && profileCreativeStyle !== "none" ? profileCreativeStyle : "none")
  );

  const [fields, setFields] = useState<Record<TextFieldId, string>>({
    industry: defaultBrief?.industry ?? "",
    productOffer: defaultBrief?.productOffer ?? "",
    keyFeatures: defaultBrief?.keyFeatures ?? "",
    credibilityProof: defaultBrief?.credibilityProof ?? "",
    persona: pendingBrief?.persona || defaultBrief?.persona || "",
    targetGoals: defaultBrief?.targetGoals ?? "",
    targetPainsObjections:
      pendingBrief?.targetPainsObjections || defaultBrief?.targetPainsObjections || "",
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

  // Légendes d'attente affichées pendant la génération — tournent toutes les
  // ~2.2s pour donner l'impression que "ça travaille" sans jamais promettre
  // une durée. La barre de progression est purement décorative (l'appel IA
  // ne stream pas), elle fait 0 -> ~92% sur 20s en boucle douce.
  const LOADING_CAPTIONS = [
    "On concocte la meilleure soupe de mots…",
    "On appelle Madison Avenue…",
    "On réveille les grands noms de la pub…",
    "On remue les méninges créatives…",
    "On cherche l'angle qui va arrêter le scroll…",
    "On taille le hook au millimètre…",
  ];
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setCaptionIndex(0);
    const interval = setInterval(() => {
      setCaptionIndex((i) => (i + 1) % LOADING_CAPTIONS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const formats = platform ? PLATFORMS[platform].formats : [];

  // Le brief pré-signup couvre régie/budget/funnel/persona/painpoint : ces
  // étapes ne sont posées ici que si elles manquent encore (ex. compte créé
  // via /signup direct, sans passer par le wizard de la landing). Le style
  // est sauté si le profil entreprise en impose un (skipStyle).
  const skipStyle = Boolean(profileCreativeStyle && profileCreativeStyle !== "none");
  const STEP_IDS = useMemo(
    () =>
      buildStepIds(
        Boolean(pendingBrief?.platform),
        Boolean(pendingBrief?.budgetRange),
        Boolean(pendingBrief?.funnelStage),
        Boolean(pendingBrief?.persona),
        Boolean(pendingBrief?.targetPainsObjections),
        skipStyle
      ),
    [pendingBrief, skipStyle]
  );
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
  function selectStyle(v: string) {
    setCreativeStyle(v);
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
        creativeStyle: creativeStyle === "none" ? null : creativeStyle,
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
        // Garde-fou serveur ceinture-bretelles : normalement inatteignable
        // puisque /onboarding n'est accessible qu'après avoir cliqué le lien
        // de confirmation (voir app/auth/callback/route.ts), mais on ne
        // montre jamais de résultat de génération sans cette vérification.
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
    setStepIndex(0);
  }

  function regenerateWithSameBrief() {
    // Garde le même brief, recommence juste la génération
    setResult(null);
    setUpsell(null);
    setError(null);
    // On repart à la dernière étape (visual) pour regénérer direct
    setStepIndex(STEP_IDS.length - 1);
  }

  if (result) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <p className="text-sm text-ink-muted">
            {remaining} crédit{remaining === 1 ? "" : "s"} restant{remaining === 1 ? "" : "s"}{" "}
            aujourd&apos;hui
          </p>
          <div className="flex gap-3">
            <button
              onClick={regenerateWithSameBrief}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Autre angle avec ce brief
            </button>
            <button onClick={resetForm} className="text-sm font-medium text-ink-muted hover:text-ink">
              Nouveau brief
            </button>
          </div>
        </div>
        <GenerationResultView result={result} />
      </div>
    );
  }

  const progressPct = ((stepIndex + 1) / STEP_IDS.length) * 100;
  const v = transitionVariants(direction);
  const textField = REMAINING_TEXT_FIELDS.find((f) => f.id === stepId) ?? TEXT_FIELDS.find((f) => f.id === stepId);

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
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">Pour commencer</h1>
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
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-btn-primary text-btn-primary-ink font-medium px-5 py-2.5"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {stepId === "platform" && (
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">Quelle régie publicitaire ?</h1>
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
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">Quel format d&apos;annonce ?</h1>
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
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">Quel budget média ?</h1>
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
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">À quelle étape du funnel ?</h1>
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

            {stepId === "style" && (
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">Des hooks comme... ?</h1>
                <p className="text-ink-muted mb-8">
                  Optionnel — Hooks s&apos;inspire du style et de la philosophie créative d&apos;un publicitaire ou d&apos;une agence culte. Ludique, en plus d&apos;être utile.
                </p>
                <div className="grid gap-3 max-h-[420px] overflow-y-auto pr-1 sm:grid-cols-2">
                  {CREATIVE_STYLE_OPTIONS.map((o) => (
                    <ChoiceCard
                      key={o.value}
                      label={o.label}
                      hint={o.hint}
                      selected={creativeStyle === o.value}
                      onClick={() => selectStyle(o.value)}
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
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">{textField.question}</h1>
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
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-btn-primary text-btn-primary-ink font-medium px-5 py-2.5 disabled:opacity-40"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {stepId === "visual" && (
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-normal mb-2">Un visuel de la créa ?</h1>
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

                {loading ? (
                  <div className="mt-8 rounded-2xl border border-border-soft bg-surface p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin text-accent" />
                      <p className="font-medium text-ink-secondary">Génération en cours…</p>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-soft">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={{ width: "0%" }}
                        animate={{ width: "92%" }}
                        transition={{ duration: 20, ease: "easeInOut" }}
                      />
                    </div>
                    <p key={captionIndex} className="mt-3 text-sm text-ink-muted">
                      {LOADING_CAPTIONS[captionIndex]}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="mt-8 inline-flex items-center gap-2 rounded-lg bg-btn-primary text-btn-primary-ink font-medium px-6 py-3"
                  >
                    Générer les hooks
                  </button>
                )}
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
