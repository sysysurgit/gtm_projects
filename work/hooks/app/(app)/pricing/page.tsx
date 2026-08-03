import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "0€",
    period: "",
    credits: "10 crédits/mois",
    features: [
      "4 hooks par génération",
      "Export CSV & JSON",
      "Favoris et tags",
      "Templates industrie",
    ],
    cta: "Offre actuelle",
    disabled: true,
  },
  {
    name: "Pro",
    price: "19€",
    period: "/mois",
    credits: "200 crédits/mois",
    features: [
      "Tout de Free, plus :",
      "Accès à un meilleur modèle de génération",
      "Historique illimité",
      "Support prioritaire",
    ],
    cta: "Passer à Pro",
    disabled: false,
    highlighted: true,
  },
  {
    name: "Agence",
    price: "89€",
    period: "/mois",
    credits: "1000 crédits/mois",
    features: [
      "Tout de Pro, plus :",
      "Multi-comptes (jusqu'à 5 utilisateurs)",
      "Facturation centralisée",
      "Onboarding dédié",
    ],
    cta: "Passer à Agence",
    disabled: false,
  },
];

export default function PricingPage() {
  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-normal">Tarifs</h1>
      <p className="mb-10 text-ink-secondary">
        Choisissez le plan qui correspond à vos besoins
      </p>

      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-6 ${
              plan.highlighted
                ? "border-accent bg-surface-raised"
                : "border-border-soft bg-surface"
            }`}
          >
            <h2 className="mb-2 font-display text-2xl font-normal">{plan.name}</h2>
            <div className="mb-4">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-ink-muted">{plan.period}</span>
            </div>
            <p className="mb-6 text-sm font-medium text-link">{plan.credits}</p>

            <ul className="mb-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-good" strokeWidth={2} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled={plan.disabled}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity ${
                plan.disabled
                  ? "cursor-not-allowed bg-surface-raised text-ink-muted opacity-50"
                  : plan.highlighted
                    ? "bg-accent text-accent-ink hover:opacity-90"
                    : "bg-btn-primary text-btn-primary-ink hover:brightness-95"
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border-soft bg-surface p-6">
        <h3 className="mb-3 font-display text-xl font-normal">FAQ Pricing</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1 font-semibold">Qu'est-ce qu'un crédit ?</p>
            <p className="text-ink-secondary">
              1 crédit = 1 génération de 4 hooks (LinkedIn, Meta, Google ou Reddit).
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold">Puis-je changer de plan ?</p>
            <p className="text-ink-secondary">
              Oui, à tout moment. Le passage à un plan supérieur est immédiat, la rétrogradation
              prend effet à la fin du cycle de facturation.
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold">Les crédits non utilisés sont-ils reportés ?</p>
            <p className="text-ink-secondary">
              Non, les crédits expirent à la fin de chaque mois.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
