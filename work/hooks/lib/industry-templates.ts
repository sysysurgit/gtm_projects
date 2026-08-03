import type { DefaultBrief } from "./types";
import type { PlatformId } from "./ad-platforms";

export interface IndustryTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  brief: DefaultBrief & {
    platform: PlatformId;
    adFormat: string;
  };
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "saas-b2b",
    label: "SaaS B2B",
    icon: "💼",
    description: "Logiciels d'entreprise, outils de productivité, plateformes métier",
    brief: {
      platform: "linkedin_ads",
      adFormat: "single_image",
      budgetRange: "5k_20k",
      funnelStage: "consideration",
      industry: "SaaS B2B",
      productOffer: "Plateforme de gestion de facturation automatisée pour PME et ETI",
      keyFeatures: "Relances automatiques, paiement en ligne intégré, exports comptables conformes, tableau de bord temps réel",
      credibilityProof: "Plus de 1200 entreprises clientes, 0 erreur de conformité fiscale en 2024, certification ISO 27001",
      persona: "DAF ou responsable administratif en PME/ETI (50-500 salariés), jongle entre plusieurs outils non connectés, perd du temps sur les relances manuelles",
      targetGoals: "Réduire le DSO (délai de paiement), automatiser les tâches chronophages, avoir une vue consolidée de la trésorerie",
      targetPainsObjections: "Peur de la migration de données, besoin d'une prise en main rapide sans formation lourde, scepticisme sur le ROI réel des outils SaaS",
      competitorStrengths: "Pennylane et Sellsy proposent des fonctionnalités similaires, interfaces connues",
      competitorGaps: "Pas de relance intelligente basée sur l'historique client, exports comptables limités, service client lent",
    },
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    icon: "🛒",
    description: "Boutiques en ligne, marketplaces, retail digital",
    brief: {
      platform: "meta_ads",
      adFormat: "feed_image",
      budgetRange: "1k_5k",
      funnelStage: "action",
      industry: "E-commerce / Mode",
      productOffer: "Marque de sneakers éco-responsables fabriquées en Europe",
      keyFeatures: "Matériaux recyclés certifiés, production locale (Portugal), designs minimalistes intemporels, livraison gratuite sous 48h",
      credibilityProof: "4,8/5 sur Trustpilot (850+ avis), label B Corp, 15 000 paires vendues en 2024",
      persona: "Urbain 25-40 ans, sensible à l'impact environnemental, prêt à payer plus cher pour de la qualité durable, actif sur Instagram",
      targetGoals: "Porter des baskets stylées sans culpabilité écologique, marque qui reflète ses valeurs, produit qui dure",
      targetPainsObjections: "Prix plus élevé que les marques mainstream, doute sur la vraie traçabilité 'éco', peur que le style soit trop niche",
      competitorStrengths: "Veja et Allbirds sont installés, forte notoriété, distribution large",
      competitorGaps: "Prix très élevés (>140€), designs parfois polarisants, production hors Europe pour certains",
    },
  },
  {
    id: "formation",
    label: "Formation & Éducation",
    icon: "🎓",
    description: "E-learning, coaching, certifications professionnelles",
    brief: {
      platform: "linkedin_ads",
      adFormat: "video",
      budgetRange: "1k_5k",
      funnelStage: "awareness",
      industry: "Formation professionnelle / Marketing digital",
      productOffer: "Formation certifiante LinkedIn Ads en 6 semaines, 100% pratique avec campagnes réelles",
      keyFeatures: "Cas pratiques sur vos vraies campagnes, support illimité par messagerie, accès à vie au contenu, certification reconnue",
      credibilityProof: "Plus de 400 alumni formés, taux de satisfaction 9,2/10, +60% d'amélioration moyenne du ROAS mesuré à 3 mois",
      persona: "Responsable marketing ou growth en scale-up/PME B2B, déjà lancé des campagnes LinkedIn mais ROAS décevant, budget média croissant mais pas les compétences internes",
      targetGoals: "Maîtriser LinkedIn Ads sans agence externe, améliorer le ROAS rapidement, monter en compétence reconnue (certification)",
      targetPainsObjections: "Formations trop théoriques, peur de ne pas avoir le temps de suivre, doute sur le ROI réel de la formation vs. budget média investi",
      competitorStrengths: "LiveMentor et Salesdorado proposent du marketing digital, bonne réputation, accompagnement humain",
      competitorGaps: "Pas de focus exclusif LinkedIn Ads, peu de suivi post-formation, certification non reconnue par le marché",
    },
  },
  {
    id: "services-pros",
    label: "Services professionnels",
    icon: "⚖️",
    description: "Conseil, juridique, comptabilité, audit",
    brief: {
      platform: "google_ads",
      adFormat: "rsa",
      budgetRange: "lt_1k",
      funnelStage: "consideration",
      industry: "Services juridiques / Droit des affaires",
      productOffer: "Cabinet d'avocats spécialisé en levées de fonds et contrats startup (pacte d'actionnaires, BSPCE, term sheet)",
      keyFeatures: "Forfaits transparents dès le premier rendez-vous, expérience de 50+ levées accompagnées, délais de réponse <24h",
      credibilityProof: "Accompagnement de 12 startups financées en 2024 (dont 2 séries A >5M€), recommandé par 3 fonds parisiens (noms), note Google 4,9/5",
      persona: "CEO ou CFO de startup en phase seed/série A, première levée ou structuration capitalistique complexe, besoin de conseil stratégique autant que juridique",
      targetGoals: "Sécuriser la levée sans piège juridique, négocier des termes équilibrés avec les investisseurs, avancer vite sans blocage administratif",
      targetPainsObjections: "Honoraires opaques des cabinets classiques, peur d'un conseil trop 'corporate' inadapté aux startups, besoin de réactivité que les gros cabinets n'ont pas",
      competitorStrengths: "Gide et CMS ont la réputation et l'expérience, réseau investisseurs solide",
      competitorGaps: "Tarifs prohibitifs pour une seed, process lent, peu familiers de la culture startup (term sheet US-style, BSPCE...)",
    },
  },
];
